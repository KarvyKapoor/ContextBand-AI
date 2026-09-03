package com.contextband.ai.service;

import com.contextband.ai.dto.InterventionResponse;
import com.contextband.ai.entity.Intervention;
import com.contextband.ai.repository.InterventionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Manages candidate interventions.
 * Provides the pool of interventions for the decision engine.
 */
@Service
@RequiredArgsConstructor
public class InterventionService {

    private final InterventionRepository interventionRepository;

    /**
     * Get all active interventions.
     */
    public List<Intervention> getActiveInterventions() {
        return interventionRepository.findByActiveTrue();
    }

    /**
     * Get interventions suitable for a given time of day.
     */
    public List<Intervention> getSuitableInterventions(String timeOfDay) {
        return interventionRepository.findSuitableForTimeOfDay(timeOfDay.toUpperCase());
    }

    /**
     * Get intervention by ID.
     */
    public Intervention getInterventionById(Long id) {
        return interventionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Intervention not found"));
    }

    /**
     * Get all active interventions as DTOs.
     */
    public List<InterventionResponse> getAllActiveInterventions() {
        return getActiveInterventions()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Convert entity to response DTO.
     */
    public InterventionResponse toResponse(Intervention intervention) {
        return InterventionResponse.builder()
                .id(intervention.getId())
                .type(intervention.getType().name())
                .tone(intervention.getTone().name())
                .message(intervention.getMessage())
                .action(intervention.getAction())
                .metadata(intervention.getMetadata())
                .active(intervention.isActive())
                .suitableTimeOfDay(intervention.getSuitableTimeOfDay())
                .build();
    }
}
