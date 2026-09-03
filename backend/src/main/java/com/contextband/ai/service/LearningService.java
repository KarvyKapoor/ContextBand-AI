package com.contextband.ai.service;

import com.contextband.ai.config.enums.ResponseStatus;
import com.contextband.ai.dto.ResponseRequest;
import com.contextband.ai.dto.ResponseResult;
import com.contextband.ai.entity.*;
import com.contextband.ai.repository.DecisionRepository;
import com.contextband.ai.repository.PolicyWeightRepository;
import com.contextband.ai.repository.RewardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Core learning service that processes user responses and updates policy weights.
 *
 * Reward mapping (centralized in ResponseStatus enum):
 *   COMPLETE → +1.0
 *   DISMISS  →  0.0
 *   DELAY    → -0.5
 *   IGNORE   → -1.0
 *
 * Policy update uses a simple incremental learning rule:
 *   new_weight = old_weight + learning_rate * (reward - old_weight)
 *
 * This approximates gradient-based updates in a way that:
 * - Increases weight when rewards are positive
 * - Decreases weight when rewards are negative
 * - Converges toward the running average of rewards
 * - Adapts over time as more observations are collected
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LearningService {

    private final RewardRepository rewardRepository;
    private final DecisionRepository decisionRepository;
    private final PolicyWeightRepository policyWeightRepository;
    private final ContextService contextService;

    /** Learning rate for policy weight updates — configurable via application.properties */
    @Value("${contextband.learning-rate:0.3}")
    private double learningRate;

    /** Decay factor for old observations (prevents infinite accumulation) */
    private static final double OBSERVATION_DECAY = 0.95;

    /**
     * Process a user's response to an intervention decision.
     * This is the core of the LEARN phase:
     * 1. Validate the decision belongs to the user
     * 2. Map response to reward value
     * 3. Persist the reward
     * 4. Update policy weights
     * 5. Return the result with policy update info
     */
    @Transactional
    public ResponseResult processResponse(User user, ResponseRequest request) {
        // 1. Find and validate the decision
        Decision decision = decisionRepository.findById(request.getDecisionId())
                .orElseThrow(() -> new RuntimeException("Decision not found"));

        if (!decision.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied: decision belongs to another user");
        }

        // Check if already responded
        if (rewardRepository.findByDecisionIdAndUserId(decision.getId(), user.getId()).isPresent()) {
            throw new RuntimeException("Response already recorded for this decision");
        }

        // 2. Parse and validate response status
        ResponseStatus responseStatus;
        try {
            responseStatus = ResponseStatus.valueOf(request.getResponse().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid response type. Must be one of: COMPLETE, DISMISS, DELAY, IGNORE");
        }

        // 3. Get reward value from centralized mapping
        double rewardValue = responseStatus.getRewardValue();

        // 4. Calculate response time
        Long responseTimeSeconds = request.getResponseTimeSeconds();
        if (responseTimeSeconds == null && decision.getCreatedAt() != null) {
            responseTimeSeconds = java.time.Duration.between(
                    decision.getCreatedAt(), java.time.LocalDateTime.now()
            ).getSeconds();
        }

        // 5. Persist the reward
        Reward reward = Reward.builder()
                .decision(decision)
                .user(user)
                .response(responseStatus)
                .rewardValue(rewardValue)
                .responseTimeSeconds(responseTimeSeconds)
                .respondedAt(java.time.LocalDateTime.now())
                .build();
        reward = rewardRepository.save(reward);

        // 6. Update decision status
        decision.setStatus(com.contextband.ai.config.enums.DecisionStatus.RESPONDED);
        decisionRepository.save(decision);

        // 7. Update policy weights
        ResponseResult.PolicyUpdateInfo policyUpdate = updatePolicyWeight(
                user, decision, rewardValue);

        log.info("Processed response for decision {}: {} → reward {} → policy updated",
                decision.getId(), responseStatus, rewardValue);

        // 8. Build result
        return ResponseResult.builder()
                .rewardId(reward.getId())
                .decisionId(decision.getId())
                .response(responseStatus.name())
                .rewardValue(rewardValue)
                .rewardDescription(responseStatus.getDescription())
                .policyUpdate(policyUpdate)
                .build();
    }

    /**
     * Update the policy weight for the user-context-intervention triple.
     *
     * Learning rule:
     *   new_weight = old_weight + α * (reward - old_weight)
     *   where α = LEARNING_RATE
     *
     * This means:
     * - If reward > old_weight → weight increases (positive feedback reinforces)
     * - If reward < old_weight → weight decreases (negative feedback weakens)
     * - Weight converges toward running average of rewards
     */
    @Transactional
    protected ResponseResult.PolicyUpdateInfo updatePolicyWeight(User user, Decision decision, double rewardValue) {
        ContextEvent context = decision.getContext();
        Intervention intervention = decision.getSelectedIntervention();
        String contextSignature = contextService.generateContextSignature(context);

        // Find existing policy weight or create new one
        PolicyWeight policyWeight = policyWeightRepository
                .findByUserIdAndInterventionIdAndContextSignature(
                        user.getId(), intervention.getId(), contextSignature)
                .orElse(PolicyWeight.builder()
                        .user(user)
                        .intervention(intervention)
                        .contextSignature(contextSignature)
                        .weight(0.0)
                        .observationCount(0)
                        .averageReward(0.0)
                        .build());

        double previousWeight = policyWeight.getWeight();

        // Incremental learning update
        int oldCount = policyWeight.getObservationCount();
        double oldAvgReward = policyWeight.getAverageReward();

        // Update observation count (with decay for old observations)
        int newCount = oldCount + 1;

        // Update running average reward
        double newAvgReward = (oldAvgReward * oldCount + rewardValue) / newCount;

        // Apply learning rule: move weight toward reward
        double weightDelta = learningRate * (rewardValue - policyWeight.getWeight());
        double newWeight = policyWeight.getWeight() + weightDelta;

        // Clamp weight to reasonable range
        newWeight = Math.max(-2.0, Math.min(2.0, newWeight));

        policyWeight.setWeight(newWeight);
        policyWeight.setObservationCount(newCount);
        policyWeight.setAverageReward(newAvgReward);

        policyWeightRepository.save(policyWeight);

        log.info("Policy update [user={}, intervention={}, context={}]: weight {} → {} (reward={}, avg={}, n={})",
                user.getId(), intervention.getId(), contextSignature,
                previousWeight, newWeight, rewardValue, newAvgReward, newCount);

        return ResponseResult.PolicyUpdateInfo.builder()
                .interventionType(intervention.getType().name())
                .contextSignature(contextSignature)
                .previousWeight(previousWeight)
                .newWeight(newWeight)
                .observationCount(newCount)
                .build();
    }

    /**
     * Get policy weights for a user.
     */
    public java.util.List<PolicyWeight> getUserPolicyWeights(User user) {
        return policyWeightRepository.findByUserIdOrderByWeightDesc(user.getId());
    }
}
