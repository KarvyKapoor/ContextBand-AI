package com.contextband.ai.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResponseRequest {

    @NotNull(message = "Decision ID is required")
    private Long decisionId;

    @NotNull(message = "Response status is required")
    private String response;

    /** Optional: time in seconds between delivery and response */
    private Long responseTimeSeconds;
}
