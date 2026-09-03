import random

from app.context_generator import generate_contexts
from app.features import FEATURE_SIZE, encode_context
from app.interventions import ACTIONS
from app.model import LinUCB
from app.reward import calculate_reward
from app.simulation import simulate_user_response


def train_model(rounds=5000):
    contexts = generate_contexts()
    model = LinUCB(ACTIONS, FEATURE_SIZE, alpha=1.0)

    total_reward = 0.0

    for _ in range(rounds):
        context = random.choice(contexts)
        features = encode_context(context)
        action, _ = model.predict(features)
        response = simulate_user_response(context, action)
        reward = calculate_reward(response)
        model.update(features, action, reward)
        total_reward += reward

    print("Training complete")
    print("Average reward:", round(total_reward / rounds, 4))
    return model


if __name__ == "__main__":
    train_model()
