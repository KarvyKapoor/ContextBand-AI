from typing import Dict, List

TIME_OF_DAY = ["morning", "afternoon", "evening"]
ACTIVITY_LEVEL = ["low", "medium", "high"]
STRESS_LEVEL = ["low", "medium", "high"]
LOCATION = ["home", "work", "other"]

FEATURE_SIZE = (
    len(TIME_OF_DAY)
    + len(ACTIVITY_LEVEL)
    + len(STRESS_LEVEL)
    + len(LOCATION)
)


def one_hot(value: str, categories: List[str]) -> List[float]:
    value = str(value).lower()
    return [1.0 if value == category else 0.0 for category in categories]


def encode_context(context: Dict) -> List[float]:
    return (
        one_hot(context.get("time_of_day", "morning"), TIME_OF_DAY)
        + one_hot(context.get("activity", "low"), ACTIVITY_LEVEL)
        + one_hot(context.get("stress", "low"), STRESS_LEVEL)
        + one_hot(context.get("location", "home"), LOCATION)
    )
