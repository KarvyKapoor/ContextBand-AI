package com.contextband.ai.controller;

import com.contextband.ai.dto.ApiResponse;
import com.contextband.ai.dto.DecisionRequest;
import com.contextband.ai.dto.DecisionResponse;
import com.contextband.ai.entity.User;
import com.contextband.ai.service.AuthService;
import com.contextband.ai.service.DecisionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Decision engine endpoints.
 * The AI decision engine selects interventions based on context.
 */
@RestController
@RequestMapping("/api/decisions")
@RequiredArgsConstructor
public class DecisionController {

    private final DecisionService decisionService;
    private final AuthService authService;

    /**
     * Request an AI decision for the current context.
     * Optionally provide a specific contextId, or it uses the latest context.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<DecisionResponse>> makeDecision(
            Authentication authentication,
            @RequestBody(required = false) DecisionRequest request) {
        try {
            User user = authService.getUserByUsername(authentication.getName());
            DecisionResponse response = decisionService.makeDecision(user,
                    request != null ? request : new DecisionRequest());
            return ResponseEntity.ok(ApiResponse.ok("Decision made", response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Decision failed", e.getMessage()));
        }
    }
}
