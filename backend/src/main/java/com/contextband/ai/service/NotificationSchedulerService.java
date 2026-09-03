package com.contextband.ai.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class NotificationSchedulerService {

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String AI_URL =
            "http://127.0.0.1:8000/predict";

    /**
     * Runs automatically every 2 minutes.
     *
     * For testing, change 120000 to 30000
     * to generate/check every 30 seconds.
     */
    @Scheduled(fixedRate = 120000)
    public void generateAutomaticIntervention() {

        System.out.println(
                "\n===================================="
        );

        System.out.println(
                "CONTEXTBAND AUTO NOTIFICATION CHECK"
        );

        System.out.println(
                "Time: " + LocalDateTime.now()
        );

        System.out.println(
                "===================================="
        );

        try {

            /*
             * DEMO CONTEXT
             *
             * This proves automatic generation works
             * even when the user is not clicking
             * anything in the frontend.
             */

            Map<String, Object> context = new HashMap<>();

            context.put("time_of_day", "morning");

            context.put("activity", "sedentary");

            context.put("stress_level", 3);

            context.put(
                    "location_category",
                    "UNKNOWN"
            );


            /*
             * REQUEST BODY
             */

            Map<String, Object> request =
                    new HashMap<>();

            request.put(
                    "user_id",
                    "demo-user"
            );

            request.put(
                    "context",
                    context
            );

            request.put(
                    "preferences",
                    new HashMap<>()
            );

            request.put(
                    "fatigue_level",
                    2
            );

            request.put(
                    "preferred_tone",
                    "supportive"
            );


            /*
             * CALL AI
             */

            Map response =
                    restTemplate.postForObject(

                            AI_URL,

                            request,

                            Map.class
                    );


            /*
             * AI RESPONSE
             */

            if (response != null) {

                System.out.println(
                        "AI INTERVENTION GENERATED"
                );

                System.out.println(
                        "Intervention: "
                                + response.get(
                                "intervention"
                        )
                );

                System.out.println(
                        "Tone: "
                                + response.get(
                                "tone"
                        )
                );

                System.out.println(
                        "Timing: "
                                + response.get(
                                "timing"
                        )
                );

                System.out.println(
                        "Message: "
                                + response.get(
                                "message"
                        )
                );

                System.out.println(
                        "Decision ID: "
                                + response.get(
                                "decision_id"
                        )
                );

            }

        } catch (Exception exception) {

            System.err.println(
                    "AI SERVICE NOT AVAILABLE"
            );

            System.err.println(
                    exception.getMessage()
            );

        }

    }

}