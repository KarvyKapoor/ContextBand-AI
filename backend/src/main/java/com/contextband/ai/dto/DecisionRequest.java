package com.contextband.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Optional request body for the decision endpoint.
 * If contextId is provided, uses that specific context.
 * Otherwise, uses the most recent context for the user.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DecisionRequest {
    private Long contextId;
}
