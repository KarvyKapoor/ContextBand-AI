package com.contextband.ai.config;

import com.contextband.ai.config.enums.InterventionTone;
import com.contextband.ai.config.enums.InterventionType;
import com.contextband.ai.entity.Intervention;
import com.contextband.ai.repository.InterventionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Application configuration.
 * Seeds the database with candidate interventions on first startup.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class AppConfig {

    @Bean
    CommandLineRunner seedInterventions(InterventionRepository interventionRepository) {
        return args -> {
            if (interventionRepository.count() > 0) {
                log.info("Interventions already seeded, skipping.");
                return;
            }

            log.info("Seeding candidate interventions...");

            seedIntervention(interventionRepository,
                    InterventionType.MEDICATION_REMINDER, InterventionTone.DIRECT,
                    "Time to take your medication. Consistency helps manage your condition effectively.",
                    "Take medication now", "MORNING");

            seedIntervention(interventionRepository,
                    InterventionType.MEDICATION_REMINDER, InterventionTone.ENCOURAGING,
                    "Great job staying consistent! Your next dose is due. Keep up the excellent work!",
                    "Take medication now", "EVENING");

            seedIntervention(interventionRepository,
                    InterventionType.BREATHING_EXERCISE, InterventionTone.GAMIFIED,
                    "🎯 Breathing Challenge: 4-7-8 technique. Can you complete 3 rounds? Beat your best!",
                    "Start breathing exercise", null);

            seedIntervention(interventionRepository,
                    InterventionType.BREATHING_EXERCISE, InterventionTone.ENCOURAGING,
                    "A few deep breaths can help. Try 4 counts in, 7 hold, 8 out. You've got this.",
                    "Start breathing exercise", null);

            seedIntervention(interventionRepository,
                    InterventionType.MOVEMENT_PROMPT, InterventionTone.ENCOURAGING,
                    "A short walk can boost your energy and mood. Even 5 minutes makes a difference!",
                    "Start a 5-minute walk", null);

            seedIntervention(interventionRepository,
                    InterventionType.MOVEMENT_PROMPT, InterventionTone.GAMIFIED,
                    "🏃 Step Challenge: Take 200 steps right now! Every step counts toward your goal.",
                    "Start walking", "AFTERNOON");

            seedIntervention(interventionRepository,
                    InterventionType.HYDRATION_REMINDER, InterventionTone.MINIMAL,
                    "💧 Time to hydrate.",
                    "Log water intake", null);

            seedIntervention(interventionRepository,
                    InterventionType.HYDRATION_REMINDER, InterventionTone.GAMIFIED,
                    "💧 Hydration Check! You've been active — time to refuel. Log a glass of water!",
                    "Log water intake", "AFTERNOON");

            seedIntervention(interventionRepository,
                    InterventionType.STRESS_MANAGEMENT, InterventionTone.ENCOURAGING,
                    "You're doing great managing your stress. Try a quick body scan: relax shoulders, unclench jaw.",
                    "Start body scan", null);

            seedIntervention(interventionRepository,
                    InterventionType.STRESS_MANAGEMENT, InterventionTone.DIRECT,
                    "Stress detected. Take action now: 5 minutes of progressive muscle relaxation.",
                    "Start relaxation", null);

            seedIntervention(interventionRepository,
                    InterventionType.SLEEP_HYGIENE, InterventionTone.MINIMAL,
                    "🌙 Wind down time. Dim screens and prepare for rest.",
                    "Start wind-down routine", "EVENING");

            seedIntervention(interventionRepository,
                    InterventionType.SLEEP_HYGIENE, InterventionTone.ENCOURAGING,
                    "Good sleep supports good health. Try dimming lights and avoiding screens for 30 minutes.",
                    "Start sleep routine", "NIGHT");

            seedIntervention(interventionRepository,
                    InterventionType.SOCIAL_CONNECTION, InterventionTone.ENCOURAGING,
                    "Connecting with others supports wellbeing. Consider reaching out to a friend today.",
                    "Open contacts", "AFTERNOON");

            seedIntervention(interventionRepository,
                    InterventionType.SOCIAL_CONNECTION, InterventionTone.GAMIFIED,
                    "🌟 Social Boost: Send a quick message to someone you care about!",
                    "Open messages", null);

            seedIntervention(interventionRepository,
                    InterventionType.MINDFULNESS, InterventionTone.MINIMAL,
                    "🧘 One mindful breath. Notice this moment.",
                    "Take a mindful breath", null);

            seedIntervention(interventionRepository,
                    InterventionType.MINDFULNESS, InterventionTone.ENCOURAGING,
                    "Take a moment to center yourself. A 2-minute mindfulness exercise can reset your day.",
                    "Start mindfulness", null);

            log.info("Seeded {} candidate interventions.", interventionRepository.count());
        };
    }

    private void seedIntervention(InterventionRepository repo, InterventionType type,
                                  InterventionTone tone, String message,
                                  String action, String suitableTime) {
        Intervention intervention = Intervention.builder()
                .type(type)
                .tone(tone)
                .message(message)
                .action(action)
                .suitableTimeOfDay(suitableTime)
                .active(true)
                .build();
        repo.save(intervention);
    }
}
