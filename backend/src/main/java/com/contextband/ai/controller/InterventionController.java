package com.contextband.ai.controller;

import com.contextband.ai.dto.*;
import com.contextband.ai.entity.User;
import com.contextband.ai.service.AuthService;
import com.contextband.ai.service.InterventionService;
import com.contextband.ai.service.LearningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Intervention endpoints.
 * - GET: retrieve available interventions
 * - POST /response: submit user response to an intervention
 */
@RestController
@RequestMapping("/api/interventions")
@RequiredArgsConstructor
public class InterventionController {

    private final InterventionService interventionService;
    private final LearningService learningService;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<InterventionResponse>>> getAllInterventions() {
        List<InterventionResponse> interventions = interventionService.getAllActiveInterventions();
        return ResponseEntity.ok(ApiResponse.ok(interventions));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InterventionResponse>> getIntervention(@PathVariable Long id) {
        var intervention = interventionService.getInterventionById(id);
        return ResponseEntity.ok(ApiResponse.ok(interventionService.toResponse(intervention)));
    }

    /**
     * Submit user's response to an intervention.
     * This triggers reward calculation and policy update.
     */
    @PostMapping("/response")
    public ResponseEntity<ApiResponse<ResponseResult>> submitResponse(
            Authentication authentication,
            @Valid @RequestBody ResponseRequest request) {
        try {
            User user = authService.getUserByUsername(authentication.getName());
            ResponseResult result = learningService.processResponse(user, request);
            return ResponseEntity.ok(ApiResponse.ok("Response recorded and policy updated", result));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Response processing failed", e.getMessage()));
        }
    }
}
