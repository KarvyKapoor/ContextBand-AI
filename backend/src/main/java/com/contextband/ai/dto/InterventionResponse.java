package com.contextband.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterventionResponse {
    private Long id;
    private String type;
    private String tone;
    private String message;
    private String action;
    private String metadata;
    private boolean active;
    private String suitableTimeOfDay;
}
