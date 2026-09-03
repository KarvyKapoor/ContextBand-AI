REWARD_MAP = {
    "completed": 1.0,
    "partially_completed": 0.3,
    "engaged": 0.2,
    "clicked": 0.2,
    "ignored": -0.5,
    "dismissed": -1.0,
    "snoozed": -0.2,
}


def calculate_reward(response) -> float:
    if isinstance(response, dict):
        if response.get("completed") is True:
            return 1.0
        if response.get("partially_completed") is True:
            return 0.3
        if response.get("engaged") is True:
            return 0.2
        if response.get("dismissed") is True:
            return -1.0
        if response.get("ignored") is True:
            return -0.5
        if response.get("snoozed") is True:
            return -0.2
        return 0.0

    key = str(response).strip().lower()
    if key not in REWARD_MAP:
        raise ValueError(
            f"Unknown response '{response}'. "
            f"Use one of: {', '.join(REWARD_MAP)}"
        )
    return REWARD_MAP[key]
