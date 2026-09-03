package com.contextband.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PolicyResponse {
    private Long userId;
    private List<PolicyWeightInfo> weights;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PolicyWeightInfo {
        private Long interventionId;
        private String interventionType;
        private String interventionTone;
        private String contextSignature;
        private Double weight;
        private Integer observationCount;
        private Double averageReward;
    }
}
