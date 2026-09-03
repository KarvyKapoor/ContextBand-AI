package com.contextband.ai.entity;

import com.contextband.ai.config.enums.ResponseStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Records a user's response to an intervention and the associated reward.
 * Used by the learning service to update policy weights.
 */
@Entity
@Table(name = "rewards", indexes = {
    @Index(name = "idx_reward_decision", columnList = "decision_id"),
    @Index(name = "idx_reward_user_time", columnList = "user_id, responded_at DESC")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Reward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decision_id", nullable = false)
    private Decision decision;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResponseStatus response;

    @Column(nullable = false)
    private Double rewardValue;

    /** Time between intervention delivery and user response, in seconds */
    private Long responseTimeSeconds;

    @Column(nullable = false)
    private LocalDateTime respondedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (respondedAt == null) {
            respondedAt = LocalDateTime.now();
        }
    }
}
