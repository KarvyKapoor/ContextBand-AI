package com.contextband.ai.entity;

import com.contextband.ai.config.enums.DecisionStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Records a decision made by the contextual bandit engine.
 * Links context, candidate interventions, and the selected intervention.
 */
@Entity
@Table(name = "decisions", indexes = {
    @Index(name = "idx_decision_user_time", columnList = "user_id, created_at DESC")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Decision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "context_id", nullable = false)
    private ContextEvent context;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "selected_intervention_id", nullable = false)
    private Intervention selectedIntervention;

    /** JSON list of candidate intervention IDs considered */
    @Column(columnDefinition = "TEXT")
    private String candidateIds;

    /** Explainable reason for this decision */
    @Column(columnDefinition = "TEXT")
    private String explanation;

    /** Confidence score 0.0 - 1.0 */
    @Column(nullable = false)
    private Double confidence;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DecisionStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
