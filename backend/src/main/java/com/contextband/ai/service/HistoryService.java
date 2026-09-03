package com.contextband.ai.service;

import com.contextband.ai.dto.HistoryResponse;
import com.contextband.ai.dto.PolicyResponse;
import com.contextband.ai.entity.*;
import com.contextband.ai.repository.DecisionRepository;
import com.contextband.ai.repository.PolicyWeightRepository;
import com.contextband.ai.repository.RewardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Provides comprehensive history retrieval for the frontend.
 * Exposes intervention history, rewards, and policy evolution.
 */
@Service
@RequiredArgsConstructor
public class HistoryService {

    private final DecisionRepository decisionRepository;
    private final RewardRepository rewardRepository;
    private final PolicyWeightRepository policyWeightRepository;

    /**
     * Get full intervention history for a user.
     * Includes context, decision, intervention, response, and reward.
     */
    public HistoryResponse getHistory(User user) {
        List<Decision> decisions = decisionRepository.findByUserIdOrderByCreatedAtDesc(user.getId());

        List<HistoryResponse.HistoryEntry> entries = new ArrayList<>();

        for (Decision decision : decisions) {
            // Find the reward for this decision
            List<Reward> rewards = rewardRepository.findByDecisionId(decision.getId());
            Reward reward = rewards.isEmpty() ? null : rewards.get(0);

            ContextEvent ctx = decision.getContext();
            Intervention iv = decision.getSelectedIntervention();

            HistoryResponse.HistoryEntry entry = HistoryResponse.HistoryEntry.builder()
                    .decisionId(decision.getId())
                    .interventionType(iv.getType().name())
                    .interventionTone(iv.getTone().name())
                    .interventionMessage(iv.getMessage())
                    .contextTimeOfDay(ctx.getTimeOfDay())
                    .contextStressLevel(ctx.getStressLevel())
                    .contextActivityLevel(ctx.getActivityLevel())
                    .contextLocationCategory(ctx.getLocationCategory())
                    .contextReceptivityScore(ctx.getReceptivityScore())
                    .explanation(decision.getExplanation())
                    .confidence(decision.getConfidence())
                    .response(reward != null ? reward.getResponse().name() : null)
                    .rewardValue(reward != null ? reward.getRewardValue() : null)
                    .decidedAt(decision.getCreatedAt())
                    .respondedAt(reward != null ? reward.getRespondedAt() : null)
                    .build();

            entries.add(entry);
        }

        // Compute summary stats
        Double averageReward = rewardRepository.getAverageRewardByUserId(user.getId());
        Long completedCount = rewardRepository.countCompletedByUserId(user.getId());

        return HistoryResponse.builder()
                .userId(user.getId())
                .totalDecisions(decisions.size())
                .averageReward(averageReward != null ? averageReward : 0.0)
                .completedCount(completedCount != null ? completedCount : 0L)
                .entries(entries)
                .build();
    }

    /**
     * Get policy weights for a user, showing adaptation evidence.
     */
    public PolicyResponse getPolicyWeights(User user) {
        List<PolicyWeight> weights = policyWeightRepository.findByUserIdOrderByWeightDesc(user.getId());

        List<PolicyResponse.PolicyWeightInfo> weightInfos = weights.stream()
                .map(w -> PolicyResponse.PolicyWeightInfo.builder()
                        .interventionId(w.getIntervention().getId())
                        .interventionType(w.getIntervention().getType().name())
                        .interventionTone(w.getIntervention().getTone().name())
                        .contextSignature(w.getContextSignature())
                        .weight(w.getWeight())
                        .observationCount(w.getObservationCount())
                        .averageReward(w.getAverageReward())
                        .build())
                .collect(Collectors.toList());

        return PolicyResponse.builder()
                .userId(user.getId())
                .weights(weightInfos)
                .build();
    }
}
