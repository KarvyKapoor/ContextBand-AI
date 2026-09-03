def choose_adaptive_tone(context=None):
    """
    Select an adaptive tone based on user context.
    """

    if not context:
        return "supportive"

    stress_level = context.get("stress_level", "normal") if isinstance(context, dict) else "normal"

    if stress_level == "high":
        return "calm"
    elif stress_level == "low":
        return "motivational"

    return "supportive"