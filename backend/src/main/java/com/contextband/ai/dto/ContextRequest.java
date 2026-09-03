package com.contextband.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContextRequest {

    @NotBlank(message = "Time of day is required")
    private String timeOfDay;

    @NotBlank(message = "Activity level is required")
    private String activityLevel;

    @NotBlank(message = "Stress level is required")
    private String stressLevel;

    @NotBlank(message = "Location category is required")
    private String locationCategory;

    @NotNull(message = "Receptivity score is required")
    @Min(0) @Max(1)
    private Double receptivityScore;

    /** JSON string for user preferences */
    private String preferences;

    /** JSON string for historical response summary */
    private String historicalResponseSummary;
}
