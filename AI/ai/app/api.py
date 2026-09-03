from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.features import FEATURE_SIZE, encode_context

from app.interventions import (
    ACTIONS,
    get_allowed_actions,
    get_message,
)

from app.tone_engine import (
    choose_adaptive_tone,
)

from app.learning import process_feedback

from app.model import LinUCB

from app.schemas import (
    FeedbackInput,
    FeedbackResponse,
    PredictionRequest,
    PredictionResponse,
)

from app.storage import (
    create_decision,
    get_history,
    get_user_fatigue,
    record_feedback,
)


# ---------------------------------------------
# AI MODEL
# ---------------------------------------------

model = LinUCB(

    actions=ACTIONS,

    feature_size=FEATURE_SIZE,

    alpha=1.0,
)


# ---------------------------------------------
# FASTAPI APP
# ---------------------------------------------

app = FastAPI(

    title="ContextBand AI",

    description=(
        "Adaptive contextual intervention engine "
        "using LinUCB and adaptive tone intelligence"
    ),

    version="4.0.0",
)


# ---------------------------------------------
# CORS
# ---------------------------------------------

app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=False,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ---------------------------------------------
# ROOT
# ---------------------------------------------

@app.get("/")
def health_check():

    return {

        "status": "running",

        "service": "ContextBand AI",

        "model": "LinUCB",

        "feature_size": FEATURE_SIZE,

        "actions": ACTIONS,

        "adaptive_tones": [

            "friendly",

            "motivational",

            "excited",

            "relaxing",

            "supportive",

            "minimal",
        ],
    }


# ---------------------------------------------
# HEALTH
# ---------------------------------------------

@app.get("/health")
def health():

    return {

        "status": "healthy",

        "service": "ContextBand AI",
    }


# ---------------------------------------------
# PREDICT
# ---------------------------------------------

@app.post(
    "/predict",
    response_model=PredictionResponse,
)
def predict(request: PredictionRequest):

    # -----------------------------------------
    # CONTEXT
    # -----------------------------------------

    context_dict = request.context.model_dump()

    features = encode_context(
        context_dict
    )


    # -----------------------------------------
    # WHAT?
    # LINUCB SELECTS INTERVENTION
    # -----------------------------------------

    allowed_actions = get_allowed_actions(
        request.preferences
    )

    action, scores = model.predict(

        features=features,

        allowed_actions=allowed_actions,
    )


    # -----------------------------------------
    # FATIGUE
    # -----------------------------------------

    stored_fatigue = get_user_fatigue(
        request.user_id
    )

    fatigue = max(

        request.fatigue_level,

        stored_fatigue,
    )


    # -----------------------------------------
    # HOW?
    # ADAPTIVE TONE ENGINE
    # -----------------------------------------

    tone = choose_adaptive_tone(

        context=context_dict,

        fatigue_level=fatigue,

        preferred_tone=request.preferred_tone,
    )


    # -----------------------------------------
    # WHEN?
    # FATIGUE CONTROL
    # -----------------------------------------

    if fatigue >= 9:

        timing = "skip"

    elif fatigue >= 7:

        timing = "later"

    else:

        timing = "now"


    # -----------------------------------------
    # MESSAGE
    # -----------------------------------------

    message = get_message(

        action,

        tone,
    )


    # -----------------------------------------
    # STORE DECISION
    # -----------------------------------------

    decision = create_decision(

        user_id=request.user_id,

        context=context_dict,

        action=action,

        tone=tone,

        message=message,
    )


    # -----------------------------------------
    # RESPONSE
    # -----------------------------------------

    return PredictionResponse(

        decision_id=decision["decision_id"],

        intervention=action,

        tone=tone,

        timing=timing,

        message=message,

        confidence=model.confidence(

            scores,

            action,
        ),

        context=context_dict,

        scores={

            key: round(value, 4)

            for key, value in scores.items()
        },
    )


# ---------------------------------------------
# FEEDBACK
# ---------------------------------------------

@app.post(
    "/feedback",
    response_model=FeedbackResponse,
)
def feedback(data: FeedbackInput):

    if data.action not in ACTIONS:

        raise HTTPException(

            status_code=400,

            detail=(
                f"Unknown action. "
                f"Use one of: {ACTIONS}"
            ),
        )


    # -----------------------------------------
    # CONTEXT
    # -----------------------------------------

    context_dict = data.context.model_dump()

    features = encode_context(
        context_dict
    )


    # -----------------------------------------
    # REWARD
    # -----------------------------------------

    try:

        reward = process_feedback(
            data.response
        )

    except ValueError as exc:

        raise HTTPException(

            status_code=400,

            detail=str(exc),
        )


    # -----------------------------------------
    # LINUCB LEARNING
    # -----------------------------------------

    model.update(

        features=features,

        action=data.action,

        reward=reward,
    )


    # -----------------------------------------
    # STORE FEEDBACK
    # -----------------------------------------

    record_feedback(

        decision_id=data.decision_id,

        user_id=data.user_id,

        action=data.action,

        response=data.response,

        reward=reward,
    )


    # -----------------------------------------
    # UPDATED FATIGUE
    # -----------------------------------------

    fatigue = get_user_fatigue(
        data.user_id
    )


    return FeedbackResponse(

        status="updated",

        action=data.action,

        response=data.response,

        reward=reward,

        fatigue_level=fatigue,

        updated=True,
    )


# ---------------------------------------------
# HISTORY
# ---------------------------------------------

@app.get("/history")
def history():

    return {

        "history": get_history()
    }