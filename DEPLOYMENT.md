# ContextBand AI - Fast Deployment Guide

## What 
- Always-visible Complete, Snooze and Dismiss actions on recommendations.
- Same actions inside the intervention modal.
- Chronic-care profile: Diabetes, Hypertension, Asthma, General Chronic Care.
- Adaptive tone preference stored locally for the MVP.
- Home location can be saved from the device.
- Live device location is requested during check-in and compared with the home radius.
- If location permission is unavailable, the manual check-in location is used as fallback.
- Chronic-care and tone context is sent to the backend through `preferences` JSON without requiring a schema migration.

## Frontend deployment
Set `NEXT_PUBLIC_API_URL` to the deployed backend URL.

```bash
cd frontend
npm install
npm run build
npm start
```

## Backend
Use the existing backend deployment configuration. Keep CORS configured for the frontend domain.

## Demo flow
1. Register/login.
2. Open Profile and choose chronic-care focus + adaptive tone.
3. Click Set home from device and allow location permission.
4. Save care profile.
5. Return to Dashboard and submit a check-in.
6. Allow device location; ContextBand classifies Home/Away when possible.
7. Show the generated intervention and all three actions: Complete, Snooze, Dismiss.
8. Use an action and show the learning/history update.
