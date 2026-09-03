from app.reward import calculate_reward


def process_feedback(response):
    return calculate_reward(response)
