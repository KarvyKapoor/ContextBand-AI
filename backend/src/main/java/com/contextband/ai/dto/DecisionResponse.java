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
public class DecisionResponse {
    private Long decisionId;
    private Long contextId;
    private InterventionInfo selectedIntervention;
    private List<InterventionInfo> candidateInterventions;
    private String explanation;
    private Double confidence;
    private String status;
    private LocalDateTime decidedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class InterventionInfo {
        private Long id;
        private String type;
        private String tone;
        private String message;
        private String action;
    }
}
