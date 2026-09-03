package com.contextband.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContextResponse {
    private Long id;
    private String timeOfDay;
    private String activityLevel;
    private String stressLevel;
    private String locationCategory;
    private Double receptivityScore;
    private String preferences;
    private String historicalResponseSummary;
    private LocalDateTime recordedAt;
}
