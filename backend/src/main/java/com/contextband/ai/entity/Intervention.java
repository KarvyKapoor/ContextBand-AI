package com.contextband.ai.entity;

import com.contextband.ai.config.enums.InterventionTone;
import com.contextband.ai.config.enums.InterventionType;
import jakarta.persistence.*;
import lombok.*;

/**
 * Candidate intervention that the decision engine can select from.
 * Each intervention has a type, tone, message, and associated action.
 */
@Entity
@Table(name = "interventions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Intervention {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private InterventionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InterventionTone tone;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(length = 300)
    private String action;

    /** JSON string for additional metadata */
    @Column(columnDefinition = "TEXT")
    private String metadata;

    /** Whether this intervention is currently active */
    @Column(nullable = false)
    private boolean active = true;

    /** Which time-of-day this intervention is most suitable for (null = any) */
    @Column(length = 50)
    private String suitableTimeOfDay;
}
