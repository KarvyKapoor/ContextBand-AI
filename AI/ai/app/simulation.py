from typing import Dict


def simulate_user_response(context: Dict, action: str) -> Dict:
    if context.get("stress") == "high" and action == "breathing_exercise":
        return {"completed": True}

    if context.get("activity") == "low" and action == "activity_reminder":
        return {"completed": True}

    if (
        context.get("time_of_day") in ["morning", "afternoon"]
        and context.get("location") == "work"
        and action == "hydration_reminder"
    ):
        return {"completed": True}

    return {"ignored": True}
