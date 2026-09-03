from itertools import product

TIME_OF_DAY = ["morning", "afternoon", "evening"]
ACTIVITY = ["low", "medium", "high"]
STRESS = ["low", "medium", "high"]
LOCATION = ["home", "work", "other"]


def generate_contexts():
    return [
        {
            "time_of_day": time,
            "activity": activity,
            "stress": stress,
            "location": location,
        }
        for time, activity, stress, location in product(
            TIME_OF_DAY,
            ACTIVITY,
            STRESS,
            LOCATION,
        )
    ]


if __name__ == "__main__":
    contexts = generate_contexts()
    print("Total Context Combinations:", len(contexts))
