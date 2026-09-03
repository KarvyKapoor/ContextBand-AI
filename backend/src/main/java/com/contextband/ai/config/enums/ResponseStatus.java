package com.contextband.ai.config.enums;

/**
 * User response types mapped to reward values.
 * Centralized reward mapping used by LearningService.
 */
public enum ResponseStatus {
    COMPLETE(1.0, "User completed the intervention"),
    DISMISS(0.0, "User actively dismissed the intervention"),
    DELAY(-0.5, "User delayed the intervention"),
    IGNORE(-1.0, "User ignored the intervention");

    private final double rewardValue;
    private final String description;

    ResponseStatus(double rewardValue, String description) {
        this.rewardValue = rewardValue;
        this.description = description;
    }

    public double getRewardValue() {
        return rewardValue;
    }

    public String getDescription() {
        return description;
    }
}
