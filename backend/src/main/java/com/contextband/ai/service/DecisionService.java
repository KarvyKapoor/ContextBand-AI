package com.contextband.ai.service;

import com.contextband.ai.config.enums.DecisionStatus;
import com.contextband.ai.dto.*;
import com.contextband.ai.entity.ContextEvent;
import com.contextband.ai.entity.Decision;
import com.contextband.ai.entity.Intervention;
import com.contextband.ai.entity.PolicyWeight;
import com.contextband.ai.entity.User;
import com.contextband.ai.repository.DecisionRepository;
import com.contextband.ai.repository.PolicyWeightRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Contextual bandit decision engine.
 *
 * The algorithm:
 * 1. Receive current context (time, stress, activity, location, receptivity)
 * 2. Retrieve candidate interventions suitable for this context
 * 3. For each candidate, compute a score based on:
 *    - Policy weight for this context signature (learned from history)
 *    - Context-specific signals (stress-appropriate, time-appropriate)
 *    - A small exploration factor for diversity
 * 4. Select the highest-scoring intervention
 * 5. Generate an explainable reason
 * 6. Persist and return the decision
 *
 * This implements a Thompson-sampling-inspired approach with:
 * - Exploitation: use learned policy weights
 * - Exploration: add controlled randomness for adaptation
 * - Context sensitivity: adjust scores based on current signals
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DecisionService {

    private final DecisionRepository decisionRepository;
    private final PolicyWeightRepository policyWeightRepository;
    private final ContextService contextService;
    private final InterventionService interventionService;

    private final Random random = new Random();

    /** Exploration rate: probability of trying a non-greedy choice */
    private static final double EXPLORATION_RATE = 0.15;

    /** Base weight for context-specific heuristics */
    private static final double HEURISTIC_WEIGHT = 0.3;

    /**
     * Generate a decision for the user based on current context.
     */
    public DecisionResponse makeDecision(User user, DecisionRequest request) {
        // 1. Get the context
        ContextEvent context;
        if (request != null && request.getContextId() != null) {
            context = contextService.getContextById(user, request.getContextId());
        } else {
            context = contextService.getLatestContext(user);
        }

        // 2. Get candidate interventions
        List<Intervention> candidates = interventionService.getSuitableInterventions(context.getTimeOfDay());
        if (candidates.isEmpty()) {
            candidates = interventionService.getActiveInterventions();
        }
        if (candidates.isEmpty()) {
            throw new RuntimeException("No active interventions available");
        }

        // 3. Score each candidate
        String contextSignature = contextService.generateContextSignature(context);
        Map<Long, Double> scores = new HashMap<>();
        Map<Long, String> reasons = new HashMap<>();

        for (Intervention candidate : candidates) {
            double score = scoreIntervention(user, candidate, context, contextSignature);
            scores.put(candidate.getId(), score);
            reasons.put(candidate.getId(), generateReason(candidate, context, score, contextSignature));
        }

        // 4. Select intervention (with exploration)
        Intervention selected;
        double confidence;

        if (random.nextDouble() < EXPLORATION_RATE && candidates.size() > 1) {
            // Exploration: pick a random candidate
            selected = candidates.get(random.nextInt(candidates.size()));
            confidence = 0.5; // Lower confidence for exploration
            log.info("Decision: EXPLORATION - randomly selected intervention {}", selected.getId());
        } else {
            // Exploitation: pick the highest-scoring candidate
            selected = candidates.stream()
                    .max(Comparator.comparingDouble(c -> scores.get(c.getId())))
                    .orElse(candidates.get(0));
            confidence = Math.min(0.95, 0.5 + (scores.get(selected.getId()) / 2.0));
            log.info("Decision: EXPLOITATION - selected intervention {} with score {}",
                    selected.getId(), scores.get(selected.getId()));
        }

        // 5. Generate explanation
        String explanation = reasons.get(selected.getId());

        // 6. Persist the decision
        Decision decision = Decision.builder()
                .user(user)
                .context(context)
                .selectedIntervention(selected)
                .candidateIds(candidates.stream()
                        .map(c -> String.valueOf(c.getId()))
                        .collect(Collectors.joining(",")))
                .explanation(explanation)
                .confidence(confidence)
                .status(DecisionStatus.SELECTED)
                .build();

        decision = decisionRepository.save(decision);

        // 7. Build response
        List<DecisionResponse.InterventionInfo> candidateInfos = candidates.stream()
                .map(c -> DecisionResponse.InterventionInfo.builder()
                        .id(c.getId())
                        .type(c.getType().name())
                        .tone(c.getTone().name())
                        .message(c.getMessage())
                        .action(c.getAction())
                        .build())
                .collect(Collectors.toList());

        return DecisionResponse.builder()
                .decisionId(decision.getId())
                .contextId(context.getId())
                .selectedIntervention(DecisionResponse.InterventionInfo.builder()
                        .id(selected.getId())
                        .type(selected.getType().name())
                        .tone(selected.getTone().name())
                        .message(selected.getMessage())
                        .action(selected.getAction())
                        .build())
                .candidateInterventions(candidateInfos)
                .explanation(explanation)
                .confidence(confidence)
                .status(decision.getStatus().name())
                .decidedAt(decision.getCreatedAt())
                .build();
    }

    /**
     * Score an intervention for the current context.
     *
     * Score components:
     * - Policy weight (learned from history): up to 1.0
     * - Stress-appropriate heuristic: up to 0.3
     * - Activity-appropriate heuristic: up to 0.3
     * - Receptivity bonus: up to 0.2
     * - Time-of-day appropriateness: up to 0.2
     */
    private double scoreIntervention(User user, Intervention intervention,
                                     ContextEvent context, String contextSignature) {
        double score = 0.0;

        // 1. Policy weight (learned behavior)
        Optional<PolicyWeight> policyOpt = policyWeightRepository
                .findByUserIdAndInterventionIdAndContextSignature(
                        user.getId(), intervention.getId(), contextSignature);

        if (policyOpt.isPresent()) {
            PolicyWeight policy = policyOpt.get();
            // Normalize weight to [-0.5, 1.0] range
            score += Math.max(-0.5, Math.min(1.0, policy.getWeight()));
        } else {
            // Default neutral score for unseen context-intervention pairs
            score += 0.3;
        }

        // 2. Stress-appropriate heuristic
        score += computeStressAppropriateness(intervention, context.getStressLevel());

        // 3. Activity-appropriate heuristic
        score += computeActivityAppropriateness(intervention, context.getActivityLevel());

        // 4. Receptivity bonus
        score += context.getReceptivityScore() * 0.2;

        // 5. Time-of-day appropriateness
        score += computeTimeAppropriateness(intervention, context.getTimeOfDay());

        return score;
    }

    /**
     * Higher stress → favor calming interventions (breathing, mindfulness, stress management)
     * Lower stress → allow more active/energetic interventions
     */
    private double computeStressAppropriateness(Intervention intervention, String stressLevel) {
        String type = intervention.getType().name();
        return switch (stressLevel) {
            case "HIGH" -> {
                if (type.contains("BREATHING") || type.contains("MINDFULNESS") || type.contains("STRESS")) {
                    yield 0.3;
                } else if (type.contains("MOVEMENT") || type.contains("HYDRATION")) {
                    yield 0.1;
                } else {
                    yield 0.0;
                }
            }
            case "LOW" -> {
                if (type.contains("MOVEMENT") || type.contains("SOCIAL") || type.contains("GAMIFIED")) {
                    yield 0.3;
                } else if (type.contains("BREATHING") || type.contains("MINDFULNESS")) {
                    yield 0.15;
                } else {
                    yield 0.2;
                }
            }
            default -> 0.2; // MODERATE gets baseline
        };
    }

    /**
     * Activity level influences what types of interventions are appropriate.
     */
    private double computeActivityAppropriateness(Intervention intervention, String activityLevel) {
        String type = intervention.getType().name();
        return switch (activityLevel) {
            case "HIGH", "VERY_HIGH" -> {
                if (type.contains("HYDRATION") || type.contains("MOVEMENT")) {
                    yield 0.25;
                } else if (type.contains("BREATHING")) {
                    yield 0.15;
                } else {
                    yield 0.1;
                }
            }
            case "LOW" -> {
                if (type.contains("MOVEMENT") || type.contains("SOCIAL")) {
                    yield 0.25;
                } else {
                    yield 0.15;
                }
            }
            default -> 0.15; // MODERATE
        };
    }

    /**
     * Time-of-day appropriateness.
     */
    private double computeTimeAppropriateness(Intervention intervention, String timeOfDay) {
        String type = intervention.getType().name();
        return switch (timeOfDay) {
            case "MORNING", "EARLY_MORNING" -> {
                if (type.contains("MEDICATION") || type.contains("HYDRATION") || type.contains("MOVEMENT")) {
                    yield 0.2;
                } else {
                    yield 0.1;
                }
            }
            case "AFTERNOON" -> {
                if (type.contains("STRESS") || type.contains("BREATHING") || type.contains("HYDRATION")) {
                    yield 0.2;
                } else {
                    yield 0.1;
                }
            }
            case "EVENING" -> {
                if (type.contains("SLEEP") || type.contains("MINDFULNESS") || type.contains("STRESS")) {
                    yield 0.2;
                } else {
                    yield 0.1;
                }
            }
            case "NIGHT" -> {
                if (type.contains("SLEEP") || type.contains("MINDFULNESS")) {
                    yield 0.2;
                } else {
                    yield 0.05;
                }
            }
            default -> 0.1;
        };
    }

    /**
     * Generate an explainable reason for the decision.
     */
    private String generateReason(Intervention intervention, ContextEvent context,
                                  double score, String contextSignature) {
        StringBuilder reason = new StringBuilder();
        reason.append("Selected ")
              .append(intervention.getType().name().toLowerCase().replace("_", " "))
              .append(" (tone: ")
              .append(intervention.getTone().name().toLowerCase())
              .append(") ");

        // Explain based on context
        List<String> factors = new ArrayList<>();

        if (context.getStressLevel().equals("HIGH")) {
            factors.add("user is in high-stress context");
        } else if (context.getStressLevel().equals("LOW")) {
            factors.add("user has low stress - good time for active intervention");
        }

        if (context.getReceptivityScore() >= 0.7) {
            factors.add("high receptivity score (" + context.getReceptivityScore() + ")");
        } else if (context.getReceptivityScore() <= 0.3) {
            factors.add("low receptivity - using minimal approach");
        }

        // Check if there's a learned preference
        if (score > 0.8) {
            factors.add("strong historical preference for this intervention in similar contexts");
        } else if (score > 0.5) {
            factors.add("moderate historical preference");
        } else {
            factors.add("exploring this intervention for adaptation");
        }

        if (factors.isEmpty()) {
            reason.append("based on contextual analysis");
        } else {
            reason.append("because ");
            reason.append(String.join(" and ", factors));
        }

        return reason.toString();
    }

    /**
     * Get a decision by ID, verifying user ownership.
     */
    public Decision getDecisionById(User user, Long decisionId) {
        Decision decision = decisionRepository.findById(decisionId)
                .orElseThrow(() -> new RuntimeException("Decision not found"));
        if (!decision.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        return decision;
    }

    /**
     * Get recent decisions for a user.
     */
    public List<Decision> getRecentDecisions(User user) {
        return decisionRepository.findTop10ByUserIdOrderByCreatedAtDesc(user.getId());
    }
}
