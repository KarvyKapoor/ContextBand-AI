package com.contextband.ai.controller;

import com.contextband.ai.dto.ApiResponse;
import com.contextband.ai.dto.HistoryResponse;
import com.contextband.ai.dto.PolicyResponse;
import com.contextband.ai.entity.User;
import com.contextband.ai.service.AuthService;
import com.contextband.ai.service.HistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * History endpoints for retrieving past interventions, responses,
 * rewards, and policy evolution.
 */
@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
public class HistoryController {

    private final HistoryService historyService;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<HistoryResponse>> getHistory(
            Authentication authentication) {
        User user = authService.getUserByUsername(authentication.getName());
        HistoryResponse history = historyService.getHistory(user);
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    @GetMapping("/policy")
    public ResponseEntity<ApiResponse<PolicyResponse>> getPolicyWeights(
            Authentication authentication) {
        User user = authService.getUserByUsername(authentication.getName());
        PolicyResponse policy = historyService.getPolicyWeights(user);
        return ResponseEntity.ok(ApiResponse.ok(policy));
    }
}
