package com.contextband.ai.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * A context snapshot capturing the user's current state at a point in time.
 * Used by the decision engine to determine appropriate interventions.
 */
@Entity
@Table(name = "context_events", indexes = {
    @Index(name = "idx_context_user_time", columnList = "user_id, recorded_at DESC")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContextEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Time of day category */
    @Column(nullable = false, length = 50)
    private String timeOfDay;

    /** Activity level: LOW, MODERATE, HIGH, VERY_HIGH */
    @Column(nullable = false, length = 50)
    private String activityLevel;

    /** Stress proxy: LOW, MODERATE, HIGH */
    @Column(nullable = false, length = 50)
    private String stressLevel;

    /** Location/context category: HOME, WORK, OUTDOORS, TRANSIT, SOCIAL */
    @Column(nullable = false, length = 50)
    private String locationCategory;

    /** JSON string for user preferences at this context */
    @Column(columnDefinition = "TEXT")
    private String preferences;

    /** JSON string for historical response summary */
    @Column(columnDefinition = "TEXT")
    private String historicalResponseSummary;

    /** Overall receptivity score 0.0 - 1.0 computed from context signals */
    @Column(nullable = false)
    private Double receptivityScore;

    @Column(nullable = false, updatable = false)
    private LocalDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        recordedAt = LocalDateTime.now();
    }
}
