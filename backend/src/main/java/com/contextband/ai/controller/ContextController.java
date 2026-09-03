package com.contextband.ai.controller;

import com.contextband.ai.dto.ApiResponse;
import com.contextband.ai.dto.ContextRequest;
import com.contextband.ai.dto.ContextResponse;
import com.contextband.ai.entity.User;
import com.contextband.ai.service.AuthService;
import com.contextband.ai.service.ContextService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Context management endpoints.
 * Protected: all endpoints require JWT authentication.
 */
@RestController
@RequestMapping("/api/context")
@RequiredArgsConstructor
public class ContextController {

    private final ContextService contextService;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<ApiResponse<ContextResponse>> submitContext(
            Authentication authentication,
            @Valid @RequestBody ContextRequest request) {
        try {
            User user = authService.getUserByUsername(authentication.getName());
            ContextResponse response = contextService.submitContext(user, request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.ok("Context submitted", response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Context submission failed", e.getMessage()));
        }
    }

    @GetMapping("/current")
    public ResponseEntity<ApiResponse<ContextResponse>> getCurrentContext(
            Authentication authentication) {
        try {
            User user = authService.getUserByUsername(authentication.getName());
            var context = contextService.getLatestContext(user);
            return ResponseEntity.ok(ApiResponse.ok(contextServiceToResponse(context)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<ContextResponse>>> getContextHistory(
            Authentication authentication) {
        User user = authService.getUserByUsername(authentication.getName());
        List<ContextResponse> history = contextService.getContextHistory(user);
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    private ContextResponse contextServiceToResponse(com.contextband.ai.entity.ContextEvent event) {
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
