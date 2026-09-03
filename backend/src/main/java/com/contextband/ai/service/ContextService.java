package com.contextband.ai.service;

import com.contextband.ai.dto.ContextRequest;
import com.contextband.ai.dto.ContextResponse;
import com.contextband.ai.entity.ContextEvent;
import com.contextband.ai.entity.User;
import com.contextband.ai.repository.ContextRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Manages context event submission and retrieval.
 * Context signals feed into the decision engine.
 */
@Service
@RequiredArgsConstructor
public class ContextService {

    private final ContextRepository contextRepository;

    /**
     * Submit a new context event for the user.
     */
    public ContextResponse submitContext(User user, ContextRequest request) {
        ContextEvent event = ContextEvent.builder()
                .user(user)
                .timeOfDay(request.getTimeOfDay().toUpperCase())
                .activityLevel(request.getActivityLevel().toUpperCase())
                .stressLevel(request.getStressLevel().toUpperCase())
                .locationCategory(request.getLocationCategory().toUpperCase())
                .receptivityScore(request.getReceptivityScore())
                .preferences(request.getPreferences())
                .historicalResponseSummary(request.getHistoricalResponseSummary())
                .build();

        event = contextRepository.save(event);
        return toResponse(event);
    }

    /**
     * Get the most recent context for a user.
     */
    public ContextEvent getLatestContext(User user) {
        List<ContextEvent> events = contextRepository.findByUserIdOrderByRecordedAtDesc(user.getId());
        if (events.isEmpty()) {
            throw new RuntimeException("No context found for user. Submit context first.");
        }
        return events.get(0);
    }

    /**
     * Get context history for a user.
     */
    public List<ContextResponse> getContextHistory(User user) {
        return contextRepository.findByUserIdOrderByRecordedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific context by ID, verifying ownership.
     */
    public ContextEvent getContextById(User user, Long contextId) {
        ContextEvent event = contextRepository.findById(contextId)
                .orElseThrow(() -> new RuntimeException("Context not found"));
        if (!event.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        return event;
    }

    /**
     * Generate a context signature string for policy weight lookups.
     * Format: "TIME_OF_DAY:STRESS_LEVEL:ACTIVITY_LEVEL"
     */
    public String generateContextSignature(ContextEvent context) {
        return context.getTimeOfDay() + ":" + context.getStressLevel() + ":" + context.getActivityLevel();
    }

    private ContextResponse toResponse(ContextEvent event) {
        return ContextResponse.builder()
                .id(event.getId())
                .timeOfDay(event.getTimeOfDay())
                .activityLevel(event.getActivityLevel())
                .stressLevel(event.getStressLevel())
                .locationCategory(event.getLocationCategory())
                .receptivityScore(event.getReceptivityScore())
                .preferences(event.getPreferences())
                .historicalResponseSummary(event.getHistoricalResponseSummary())
                .recordedAt(event.getRecordedAt())
                .build();
    }
}
