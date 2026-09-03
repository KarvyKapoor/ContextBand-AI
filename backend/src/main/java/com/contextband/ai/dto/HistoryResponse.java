package com.contextband.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistoryResponse {
    private Long userId;
    private Integer totalDecisions;
    private Double averageReward;
    private Long completedCount;
    private List<HistoryEntry> entries;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class HistoryEntry {
        private Long decisionId;
        private String interventionType;
        private String interventionTone;
        private String interventionMessage;
        private String contextTimeOfDay;
        private String contextStressLevel;
        private String contextActivityLevel;
        private String contextLocationCategory;
        private Double contextReceptivityScore;
        private String explanation;
        private Double confidence;
        private String response;
        private Double rewardValue;
        private LocalDateTime decidedAt;
        private LocalDateTime respondedAt;
    }
}
