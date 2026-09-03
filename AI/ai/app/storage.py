import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
HISTORY_FILE = DATA_DIR / "interaction_history.json"

DATA_DIR.mkdir(exist_ok=True)


def _load_history():
    if not HISTORY_FILE.exists():
        return []
    try:
        return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _save_history(history):
    HISTORY_FILE.write_text(
        json.dumps(history, indent=2),
        encoding="utf-8",
    )


def create_decision(user_id, context, action, tone, message):
    history = _load_history()
    decision = {
        "decision_id": str(uuid4()),
        "type": "decision",
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "context": context,
        "action": action,
        "tone": tone,
        "message": message,
        "response": None,
        "reward": None,
    }
    history.append(decision)
    _save_history(history)
    return decision


def record_feedback(decision_id, user_id, action, response, reward):
    history = _load_history()
    timestamp = datetime.now(timezone.utc).isoformat()

    if decision_id:
        for item in reversed(history):
            if item.get("decision_id") == decision_id:
                item["response"] = response
                item["reward"] = reward
                item["feedback_timestamp"] = timestamp
                _save_history(history)
                return

    history.append({
        "decision_id": decision_id or str(uuid4()),
        "type": "feedback",
        "user_id": user_id,
        "timestamp": timestamp,
        "action": action,
        "response": response,
        "reward": reward,
    })
    _save_history(history)


def get_user_fatigue(user_id):
    history = _load_history()
    recent = [
        item for item in history[-20:]
        if item.get("user_id") == user_id
        and item.get("response") is not None
    ][-5:]

    fatigue = 0
    for item in recent:
        if item.get("response") == "ignored":
            fatigue += 2
        elif item.get("response") == "dismissed":
            fatigue += 3
        elif item.get("response") == "snoozed":
            fatigue += 1
        elif item.get("response") == "completed":
            fatigue = max(0, fatigue - 1)

    return min(fatigue, 10)


def get_history(limit=50):
    return _load_history()[-limit:]
