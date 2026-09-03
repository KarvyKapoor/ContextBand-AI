ACTIONS = [
    "hydration_reminder",
    "medication_reminder",
    "breathing_exercise",
    "activity_reminder",
]


ACTION_INFO = {

    "hydration_reminder": {

        "intervention": "hydration_reminder",

        "category": "hydration",

        "messages": {

            "friendly":
                "Hey! A quick sip of water could be a nice little reset.",

            "motivational":
                "Keep your momentum going—take a quick hydration break now.",

            "excited":
                "You're doing great! Keep the momentum flowing with a quick hydration boost!",

            "relaxing":
                "Take a slow moment for yourself. A glass of water can be a gentle reset.",

            "supportive":
                "A quick hydration break could help you feel refreshed. Take a moment to drink some water.",

            "minimal":
                "Quick hydration break?",
        },
    },


    "medication_reminder": {

        "intervention": "medication_reminder",

        "category": "medication",

        "messages": {

            "friendly":
                "Hey! Just a friendly reminder to check your scheduled medication routine.",

            "motivational":
                "Stay consistent with your routine—check your scheduled medication now.",

            "excited":
                "Nice work staying on track! Time to check your medication routine.",

            "relaxing":
                "When you're ready, take a calm moment to check your scheduled medication routine.",

            "supportive":
                "This is a gentle reminder to check your scheduled medication routine.",

            "minimal":
                "Check scheduled medication.",
        },
    },


    "breathing_exercise": {

        "intervention": "breathing_exercise",

        "category": "breathing",

        "messages": {

            "friendly":
                "How about taking a small pause? A few calm breaths might help.",

            "motivational":
                "You've got this. Take two minutes for a quick reset.",

            "excited":
                "Quick reset time! Give yourself two minutes to breathe and recharge.",

            "relaxing":
                "Slow down for a moment. Take a few deep breaths and let yourself reset.",

            "supportive":
                "You seem to be under some pressure. Take two minutes to slow down and reset.",

            "minimal":
                "2-minute breathing reset?",
        },
    },


    "activity_reminder": {

        "intervention": "activity_reminder",

        "category": "activity",

        "messages": {

            "friendly":
                "A little stretch or short walk could be a nice change of pace.",

            "motivational":
                "Get moving for a few minutes and build your momentum.",

            "excited":
                "Let's move! A quick stretch or walk can keep your energy going!",

            "relaxing":
                "No rush. When you're ready, try a gentle stretch or short walk.",

            "supportive":
                "A small movement break could be helpful right now. Stretch or walk for a few minutes.",

            "minimal":
                "Quick movement break?",
        },
    },
}


def get_message(action: str, tone: str) -> str:

    if action not in ACTION_INFO:
        raise ValueError(
            f"Unknown action: {action}"
        )

    messages = ACTION_INFO[action]["messages"]

    return messages.get(
        tone,
        messages["supportive"],
    )


def get_allowed_actions(preferences):

    if not preferences:
        return ACTIONS.copy()

    mapping = {

        "hydration":
            "hydration_reminder",

        "medication":
            "medication_reminder",

        "breathing":
            "breathing_exercise",

        "relaxation":
            "breathing_exercise",

        "activity":
            "activity_reminder",
    }

    allowed = []

    for preference in preferences:

        action = mapping.get(
            str(preference).lower()
        )

        if action and action not in allowed:
            allowed.append(action)

    return allowed or ACTIONS.copy()