import json
from pathlib import Path

import numpy as np


class LinUCB:
    def __init__(
        self,
        actions,
        feature_size,
        alpha=1.0,
        policy_file=None,
    ):
        self.actions = list(actions)
        self.feature_size = feature_size
        self.alpha = alpha

        self.policy_file = (
            Path(policy_file)
            if policy_file
            else Path(__file__).resolve().parent.parent
            / "data"
            / "policy_state.json"
        )

        self.policy_file.parent.mkdir(parents=True, exist_ok=True)

        self.A = {
            action: np.identity(feature_size)
            for action in self.actions
        }

        self.b = {
            action: np.zeros(feature_size)
            for action in self.actions
        }

        self.load_policy()

    def predict(self, features, allowed_actions=None):
        x = np.array(features, dtype=float)
        candidates = allowed_actions or self.actions

        scores = {}

        for action in candidates:
            A_inv = np.linalg.inv(self.A[action])
            theta = A_inv @ self.b[action]

            exploitation = float(theta @ x)

            exploration = float(
                self.alpha
                * np.sqrt(x @ A_inv @ x)
            )

            scores[action] = exploitation + exploration

        selected_action = max(
            scores,
            key=scores.get,
        )

        return selected_action, scores

    def update(self, features, action, reward):
        if action not in self.actions:
            raise ValueError(
                f"Unknown action: {action}"
            )

        x = np.array(
            features,
            dtype=float,
        )

        self.A[action] += np.outer(x, x)

        self.b[action] += float(reward) * x

        # Save AI learning immediately
        self.save_policy()

    def confidence(self, scores, action):
        if not scores:
            return 0.0

        values = list(scores.values())

        minimum = min(values)
        maximum = max(values)

        if maximum == minimum:
            return 0.5

        return round(
            (
                scores[action] - minimum
            )
            /
            (
                maximum - minimum
            ),
            3,
        )

    def save_policy(self):
        policy_data = {
            "feature_size": self.feature_size,
            "alpha": self.alpha,
            "actions": self.actions,
            "A": {
                action: self.A[action].tolist()
                for action in self.actions
            },
            "b": {
                action: self.b[action].tolist()
                for action in self.actions
            },
        }

        with open(
            self.policy_file,
            "w",
            encoding="utf-8",
        ) as file:
            json.dump(
                policy_data,
                file,
                indent=2,
            )

    def load_policy(self):
        if not self.policy_file.exists():
            return

        try:
            with open(
                self.policy_file,
                "r",
                encoding="utf-8",
            ) as file:
                policy_data = json.load(file)

            saved_actions = policy_data.get(
                "actions",
                [],
            )

            if (
                policy_data.get("feature_size")
                != self.feature_size
            ):
                print(
                    "Policy feature size mismatch."
                    " Starting with new policy."
                )
                return

            if set(saved_actions) != set(self.actions):
                print(
                    "Policy actions mismatch."
                    " Starting with new policy."
                )
                return

            for action in self.actions:
                self.A[action] = np.array(
                    policy_data["A"][action],
                    dtype=float,
                )

                self.b[action] = np.array(
                    policy_data["b"][action],
                    dtype=float,
                )

            print(
                "ContextBand AI policy loaded successfully."
            )

        except (
            json.JSONDecodeError,
            KeyError,
            OSError,
            ValueError,
        ) as error:

            print(
                f"Could not load policy: {error}"
            )

            print(
                "Starting with a new policy."
            )