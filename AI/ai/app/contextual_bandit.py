# Backward-compatible wrapper around the LinUCB model.

from app.features import FEATURE_SIZE, encode_context
from app.model import LinUCB


class ContextualBandit:
    def __init__(self, actions, exploration_rate=0.2, learning_rate=0.5):
        self.actions = actions
        self.model = LinUCB(
            actions=actions,
            feature_size=FEATURE_SIZE,
            alpha=1.0,
        )

    def select_action(self, context):
        features = encode_context(context)
        action, _ = self.model.predict(features)
        return action

    def update(self, context, action, reward):
        self.model.update(
            encode_context(context),
            action,
            reward,
        )

    def get_policy(self):
        return {
            action: {
                "A": self.model.A[action].tolist(),
                "b": self.model.b[action].tolist(),
            }
            for action in self.actions
        }
