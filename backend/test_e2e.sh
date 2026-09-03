#!/bin/bash
set -e

# Start server in background
cd "$(dirname "$0")"
java -jar target/contextband-ai-0.1.0-SNAPSHOT.jar &>/tmp/app.log &
SERVER_PID=$!

# Wait for startup
for i in $(seq 1 30); do
    if curl -s http://localhost:8080/api/auth/register &>/dev/null; then
        echo "Server started after ${i}s (PID=$SERVER_PID)"
        break
    fi
    sleep 1
done

BASE="http://localhost:8080"

echo ""
echo "========================================="
echo "TEST 1: REGISTER"
echo "========================================="
REG=$(curl -s $BASE/api/auth/register -X POST -H "Content-Type: application/json" -d '{"username":"demouser","email":"demo@contextband.ai","password":"demo123","displayName":"Demo User"}')
echo "$REG" | python3 -m json.tool 2>/dev/null || echo "$REG"
TOKEN=$(echo "$REG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['token'])" 2>/dev/null)
echo "TOKEN=$TOKEN"

echo ""
echo "========================================="
echo "TEST 2: LOGIN"
echo "========================================="
LOGIN=$(curl -s $BASE/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"demouser","password":"demo123"}')
echo "$LOGIN" | python3 -m json.tool 2>/dev/null || echo "$LOGIN"
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['token'])" 2>/dev/null)
echo "TOKEN=$TOKEN"

echo ""
echo "========================================="
echo "TEST 3: GET CURRENT USER (JWT-protected)"
echo "========================================="
ME=$(curl -s $BASE/api/auth/me -H "Authorization: Bearer $TOKEN")
echo "$ME" | python3 -m json.tool 2>/dev/null || echo "$ME"

echo ""
echo "========================================="
echo "TEST 4: SUBMIT CONTEXT"
echo "========================================="
CTX=$(curl -s $BASE/api/context -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"timeOfDay":"MORNING","activityLevel":"MODERATE","stressLevel":"HIGH","locationCategory":"HOME","receptivityScore":0.7,"preferences":"{}","historicalResponseSummary":"{}"}')
echo "$CTX" | python3 -m json.tool 2>/dev/null || echo "$CTX"
CONTEXT_ID=$(echo "$CTX" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['id'])" 2>/dev/null)
echo "CONTEXT_ID=$CONTEXT_ID"

echo ""
echo "========================================="
echo "TEST 5: GET INTERVENTIONS"
echo "========================================="
curl -s $BASE/api/interventions -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || echo "FAILED"

echo ""
echo "========================================="
echo "TEST 6: MAKE DECISION (AI ENGINE)"
echo "========================================="
DEC=$(curl -s $BASE/api/decisions -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"contextId":'$CONTEXT_ID'}')
echo "$DEC" | python3 -m json.tool 2>/dev/null || echo "$DEC"
DECISION_ID=$(echo "$DEC" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['decisionId'])" 2>/dev/null)
echo "DECISION_ID=$DECISION_ID"

echo ""
echo "========================================="
echo "TEST 7: SUBMIT RESPONSE - COMPLETE"
echo "========================================="
RES=$(curl -s $BASE/api/interventions/response -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"decisionId":'$DECISION_ID',"response":"COMPLETE","responseTimeSeconds":30}')
echo "$RES" | python3 -m json.tool 2>/dev/null || echo "$RES"

echo ""
echo "========================================="
echo "TEST 8: CHECK HISTORY"
echo "========================================="
HIST=$(curl -s $BASE/api/history -H "Authorization: Bearer $TOKEN")
echo "$HIST" | python3 -m json.tool 2>/dev/null || echo "$HIST"

echo ""
echo "========================================="
echo "TEST 9: CHECK POLICY WEIGHTS"
echo "========================================="
POL=$(curl -s $BASE/api/history/policy -H "Authorization: Bearer $TOKEN")
echo "$POL" | python3 -m json.tool 2>/dev/null || echo "$POL"

echo ""
echo "========================================="
echo "TEST 10: SCENARIO B - DISMISSAL LOOP"
echo "========================================="
# Submit same context again
CTX2=$(curl -s $BASE/api/context -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"timeOfDay":"MORNING","activityLevel":"MODERATE","stressLevel":"HIGH","locationCategory":"HOME","receptivityScore":0.7}')
CTX2_ID=$(echo "$CTX2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['id'])" 2>/dev/null)

echo "--- Dismissal loop (3 times) ---"
for i in 1 2 3; do
    DEC_I=$(curl -s $BASE/api/decisions -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"contextId":'$CTX2_ID'}')
    DEC_I_ID=$(echo "$DEC_I" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['decisionId'])" 2>/dev/null)
    SELECTED=$(echo "$DEC_I" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['selectedIntervention']['type'])" 2>/dev/null)
    
    RES_I=$(curl -s $BASE/api/interventions/response -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
      -d '{"decisionId":'$DEC_I_ID',"response":"DISMISS","responseTimeSeconds":5}')
    REWARD=$(echo "$RES_I" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['rewardValue'])" 2>/dev/null)
    NEW_WEIGHT=$(echo "$RES_I" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['policyUpdate']['newWeight'])" 2>/dev/null)
    
    echo "  Round $i: Selected=$SELECTED, Response=DISMISS, Reward=$REWARD, NewWeight=$NEW_WEIGHT"
done

echo ""
echo "========================================="
echo "TEST 11: POLICY AFTER DISMISSALS"
echo "========================================="
POL2=$(curl -s $BASE/api/history/policy -H "Authorization: Bearer $TOKEN")
echo "$POL2" | python3 -m json.tool 2>/dev/null || echo "$POL2"

echo ""
echo "========================================="
echo "TEST 12: NEW DECISION AFTER POLICY UPDATE"
echo "========================================="
CTX3=$(curl -s $BASE/api/context -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"timeOfDay":"MORNING","activityLevel":"MODERATE","stressLevel":"HIGH","locationCategory":"HOME","receptivityScore":0.7}')
CTX3_ID=$(echo "$CTX3" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['id'])" 2>/dev/null)
DEC_NEW=$(curl -s $BASE/api/decisions -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"contextId":'$CTX3_ID'}')
echo "$DEC_NEW" | python3 -m json.tool 2>/dev/null || echo "$DEC_NEW"

echo ""
echo "========================================="
echo "TEST 13: FINAL FULL HISTORY"
echo "========================================="
HIST2=$(curl -s $BASE/api/history -H "Authorization: Bearer $TOKEN")
echo "$HIST2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Total decisions: {d[\"data\"][\"totalDecisions\"]}'); print(f'Average reward: {d[\"data\"][\"averageReward\"]}'); print(f'Completed: {d[\"data\"][\"completedCount\"]}')" 2>/dev/null

echo ""
echo "========================================="
echo "ALL TESTS COMPLETE"
echo "========================================="

# Cleanup
kill $SERVER_PID 2>/dev/null
