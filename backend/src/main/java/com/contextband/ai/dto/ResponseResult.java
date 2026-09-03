package com.contextband.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResponseResult {
    private Long rewardId;
    private Long decisionId;
    private String response;
    private Double rewardValue;
    private String rewardDescription;
    private PolicyUpdateInfo policyUpdate;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PolicyUpdateInfo {
        private String interventionType;
        private String contextSignature;
        private Double previousWeight;
        private Double newWeight;
        private Integer observationCount;
    }
}
