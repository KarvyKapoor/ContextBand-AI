package com.contextband.ai.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Stores learned policy weights for the contextual bandit.
 * Each weight represents the affinity between a user+context-type and an intervention.
 * Updated by the LearningService after each reward.
 */
@Entity
@Table(name = "policy_weights", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "intervention_id", "context_signature"})
}, indexes = {
    @Index(name = "idx_policy_user", columnList = "user_id"),
    @Index(name = "idx_policy_context", columnList = "context_signature")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PolicyWeight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "intervention_id", nullable = false)
    private Intervention intervention;

    /**
     * A compact string signature representing the context type.
     * Format: "TIME_OF_DAY:STRESS_LEVEL:ACTIVITY_LEVEL"
     * e.g. "MORNING:LOW:MODERATE"
     */
    @Column(nullable = false, length = 200)
    private String contextSignature;

    /** Learned weight/affinity score. Starts at 0.0, can go positive or negative. */
    @Column(nullable = false)
    private Double weight = 0.0;

    /** Number of observations contributing to this weight */
    @Column(nullable = false)
    private Integer observationCount = 0;

    /** Simple moving average of rewards observed */
    @Column(nullable = false)
    private Double averageReward = 0.0;

    @Column(nullable = false)
    private LocalDateTime lastUpdatedAt;

    @PrePersist
    protected void onCreate() {
        lastUpdatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        lastUpdatedAt = LocalDateTime.now();
    }
}
