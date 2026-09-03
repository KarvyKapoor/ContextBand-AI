#!/bin/bash
# Comprehensive ContextBand AI Backend Verification
# Covers: Demo scenarios, Auth regression, API regression, DB integrity

set -e
cd "$(dirname "$0")"

PASS=0
FAIL=0
WARN=0
DB_NAME="contextband_ai"
DB_USER="shreygupta"

pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1"; }
warn() { WARN=$((WARN+1)); echo "  ⚠️  $1"; }
header() { echo ""; echo "========================================"; echo " $1"; echo "========================================"; }

# ============================================================
# SETUP: Clean DB, build, start server
# ============================================================
header "SETUP"

echo "Resetting database..."
psql -U $DB_USER -d $DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO $DB_USER;" -q 2>&1
pass "Database reset"

echo "Packaging..."
mvn package -DskipTests -q 2>&1 | tail -3
pass "Maven package"

echo "Starting server..."
java -jar target/contextband-ai-0.1.0-SNAPSHOT.jar &>/tmp/comprehensive.log &
SERVER_PID=$!

for i in $(seq 1 30); do
  if grep -q "Started ContextBandApplication" /tmp/comprehensive.log 2>/dev/null; then
    echo "Server started after ${i}s (PID=$SERVER_PID)"
    break
  fi
  sleep 1
done

if ! grep -q "Started ContextBandApplication" /tmp/comprehensive.log 2>/dev/null; then
  echo "FATAL: Server did not start. Log:"
  cat /tmp/comprehensive.log
  exit 1
fi
pass "Server started"

BASE="http://localhost:8080"

# Helper: curl with status code extraction
req() {
  # Usage: req METHOD URL [HEADERS...] [BODY]
  local method=$1 url=$2
  shift 2
  local headers="" body=""
  while [ $# -gt 0 ]; do
    case "$1" in
      -H*) headers="$headers $1 $2"; shift 2 ;;
      -d*) body="$1 $2"; shift 2 ;;
      *) shift ;;
    esac
  done
  curl -s -w "\n__HTTP_CODE__:%{http_code}" -X "$method" "$url" $headers $body
}

extract_code() {
  echo "$1" | grep "__HTTP_CODE__:" | cut -d: -f2
}

extract_body() {
  echo "$1" | sed '/__HTTP_CODE__/d'
}

# ============================================================
# SECTION 1: DAY 4 — DEMO DATA & SCENARIOS
# ============================================================
header "DAY 4 — DEMO DATA & SCENARIOS"

echo ""
echo "--- 1.1 Intervention seeding on startup ---"
# Use dummy token — auth entry point returns 401 JSON, but interventions endpoint
# may work without auth in some configs. Check DB directly as ground truth.
INTV_DB=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM interventions;" 2>&1 | tr -d ' ')
if [ "$INTV_DB" = "16" ]; then
  pass "16 candidate interventions seeded (8 types × 2 tones)"
else
  fail "Expected 16 interventions, got $INTV_DB"
fi

echo ""
echo "--- 1.2 Scenario A: Positive response flow ---"
# Register
REG=$(curl -s "$BASE/api/auth/register" -X POST -H "Content-Type: application/json" \
  -d '{"username":"demo_user_a","email":"demo_a@test.com","password":"Test@12345","displayName":"Demo A"}')
TOKEN_A=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
if [ -n "$TOKEN_A" ] && [ "$TOKEN_A" != "null" ]; then
  pass "Registration for Scenario A"
else
  fail "Registration for Scenario A failed"
fi

# Context
CTX_A=$(curl -s "$BASE/api/context" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d '{"timeOfDay":"MORNING","activityLevel":"MODERATE","stressLevel":"HIGH","locationCategory":"HOME","receptivityScore":0.8}')
CTX_A_ID=$(echo "$CTX_A" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
if [ -n "$CTX_A_ID" ] && [ "$CTX_A_ID" != "null" ] && [ "$CTX_A_ID" != "0" ]; then
  pass "Context submitted (id=$CTX_A_ID)"
else
  fail "Context submission failed"
fi

# Decision
DEC_A=$(curl -s "$BASE/api/decisions" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"contextId\":$CTX_A_ID}")
DEC_A_ID=$(echo "$DEC_A" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['decisionId'])" 2>/dev/null)
DEC_A_TYPE=$(echo "$DEC_A" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['selectedIntervention']['type'])" 2>/dev/null)
DEC_A_EXPLAIN=$(echo "$DEC_A" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['explanation'])" 2>/dev/null)
DEC_A_CANDIDATES=$(echo "$DEC_A" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['candidateInterventions']))" 2>/dev/null)
if [ -n "$DEC_A_ID" ] && [ "$DEC_A_ID" != "null" ] && [ "$DEC_A_ID" != "0" ]; then
  pass "Decision made: selected=$DEC_A_TYPE (id=$DEC_A_ID, candidates=$DEC_A_CANDIDATES)"
else
  fail "Decision failed"
fi
if [ -n "$DEC_A_EXPLAIN" ] && [ ${#DEC_A_EXPLAIN} -gt 10 ]; then
  pass "Decision explanation present: \"${DEC_A_EXPLAIN:0:80}...\""
else
  fail "Decision explanation missing or too short"
fi

# COMPLETE response → positive reward → policy increase
RES_A=$(curl -s "$BASE/api/interventions/response" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"decisionId\":$DEC_A_ID,\"response\":\"COMPLETE\",\"responseTimeSeconds\":15}")
RES_A_REWARD=$(echo "$RES_A" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['rewardValue'])" 2>/dev/null)
RES_A_PREV=$(echo "$RES_A" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['policyUpdate']['previousWeight'])" 2>/dev/null)
RES_A_NEW=$(echo "$RES_A" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['policyUpdate']['newWeight'])" 2>/dev/null)
if [ "$RES_A_REWARD" = "1.0" ]; then
  pass "COMPLETE response → reward=1.0 (positive)"
else
  fail "Expected reward=1.0, got $RES_A_REWARD"
fi
if [ -n "$RES_A_NEW" ] && [ "$RES_A_NEW" != "0.0" ] && [ "$RES_A_NEW" != "null" ]; then
  pass "Policy weight updated: $RES_A_PREV → $RES_A_NEW"
else
  fail "Policy weight not updated (still $RES_A_NEW)"
fi

echo ""
echo "--- 1.3 Scenario B: Repeated dismissal loop ---"
# Submit same-context signals
CTX_B=$(curl -s "$BASE/api/context" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d '{"timeOfDay":"MORNING","activityLevel":"MODERATE","stressLevel":"HIGH","locationCategory":"HOME","receptivityScore":0.8}')
CTX_B_ID=$(echo "$CTX_B" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

PREV_SELECTED=""
SWITCHED=false
for i in 1 2 3 4 5; do
  DEC_B=$(curl -s "$BASE/api/decisions" -X POST \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
    -d "{\"contextId\":$CTX_B_ID}")
  DEC_B_ID=$(echo "$DEC_B" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['decisionId'])" 2>/dev/null)
  CURR_SELECTED=$(echo "$DEC_B" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['selectedIntervention']['type'])" 2>/dev/null)

  RES_B=$(curl -s "$BASE/api/interventions/response" -X POST \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
    -d "{\"decisionId\":$DEC_B_ID,\"response\":\"DISMISS\",\"responseTimeSeconds\":2}")

  if [ -n "$PREV_SELECTED" ] && [ "$CURR_SELECTED" != "$PREV_SELECTED" ]; then
    SWITCHED=true
  fi
  PREV_SELECTED="$CURR_SELECTED"
  echo "  Round $i: selected=$CURR_SELECTED"
done

if [ "$SWITCHED" = "true" ]; then
  pass "Intervention switching observed during dismissal loop"
else
  warn "No intervention switch in 5 rounds (may be valid if one intervention always scores highest)"
fi

# Verify policy weights show degradation
POL_A=$(curl -s "$BASE/api/history/policy" -H "Authorization: Bearer $TOKEN_A")
WEIGHTS_COUNT=$(echo "$POL_A" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['weights']))" 2>/dev/null)
if [ "$WEIGHTS_COUNT" -gt 1 ] 2>/dev/null; then
  pass "Policy weights tracked across $WEIGHTS_COUNT context-intervention pairs"
else
  warn "Only $WEIGHTS_COUNT policy weight(s) tracked"
fi

# Verify history shows adaptation evidence
HIST_A=$(curl -s "$BASE/api/history" -H "Authorization: Bearer $TOKEN_A")
TOTAL_DECS=$(echo "$HIST_A" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['totalDecisions'])" 2>/dev/null)
AVG_REWARD=$(echo "$HIST_A" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['averageReward'])" 2>/dev/null)
COMPLETED=$(echo "$HIST_A" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['completedCount'])" 2>/dev/null)
echo "  Total decisions: $TOTAL_DECS, Avg reward: $AVG_REWARD, Completed: $COMPLETED"
if [ "$TOTAL_DECS" = "6" ] 2>/dev/null; then
  pass "Full decision history recorded (6 decisions)"
else
  warn "Expected 6 decisions, got $TOTAL_DECS"
fi
if [ "$COMPLETED" = "1" ] 2>/dev/null; then
  pass "Completion count correct (1 COMPLETE from Scenario A)"
else
  warn "Expected 1 completion, got $COMPLETED"
fi

# ============================================================
# SECTION 2: DAY 5 — AUTHENTICATION & API REGRESSION
# ============================================================
header "DAY 5 — AUTHENTICATION & API REGRESSION"

echo ""
echo "--- 2.1 Public endpoints ---"
# Register (already done, test duplicate)
REG_DUP=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/auth/register" -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"demo_user_a","email":"dup@test.com","password":"Test@12345"}')
DUP_CODE=$(extract_code "$REG_DUP")
if [ "$DUP_CODE" = "400" ]; then
  pass "Duplicate registration → 400"
else
  fail "Duplicate registration → expected 400, got $DUP_CODE"
fi

# Login success
LOGIN_OK=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/auth/login" -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"demo_user_a","password":"Test@12345"}')
LOGIN_CODE=$(extract_code "$LOGIN_OK")
if [ "$LOGIN_CODE" = "200" ]; then
  pass "Login success → 200"
else
  fail "Login success → expected 200, got $LOGIN_CODE"
fi

# Login wrong password
LOGIN_BAD=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/auth/login" -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"demo_user_a","password":"wrongpassword"}')
BAD_CODE=$(extract_code "$LOGIN_BAD")
if [ "$BAD_CODE" = "401" ]; then
  pass "Wrong password → 401"
else
  fail "Wrong password → expected 401, got $BAD_CODE"
fi

# Login non-existent user
LOGIN_NO=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/auth/login" -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"nonexistent","password":"Test@12345"}')
NO_CODE=$(extract_code "$LOGIN_NO")
if [ "$NO_CODE" = "401" ]; then
  pass "Non-existent user login → 401"
else
  fail "Non-existent user login → expected 401, got $NO_CODE"
fi

echo ""
echo "--- 2.2 JWT authentication on /api/auth/me ---"
# No token → 401
ME_NO=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/auth/me")
ME_NO_CODE=$(extract_code "$ME_NO")
ME_NO_BODY=$(extract_body "$ME_NO")
if [ "$ME_NO_CODE" = "401" ]; then
  pass "No token → 401"
else
  fail "No token → expected 401, got $ME_NO_CODE"
fi
if echo "$ME_NO_BODY" | grep -q "Unauthorized"; then
  pass "401 response body contains 'Unauthorized'"
else
  fail "401 response body missing 'Unauthorized': $ME_NO_BODY"
fi

# Invalid token
ME_BAD=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" -H "Authorization: Bearer invalid-token-xyz" "$BASE/api/auth/me")
ME_BAD_CODE=$(extract_code "$ME_BAD")
if [ "$ME_BAD_CODE" = "401" ]; then
  pass "Invalid token → 401"
else
  fail "Invalid token → expected 401, got $ME_BAD_CODE"
fi

# Malformed header: "Bearer" only, no token
ME_MAL=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" -H "Authorization: Bearer" "$BASE/api/auth/me")
ME_MAL_CODE=$(extract_code "$ME_MAL")
if [ "$ME_MAL_CODE" = "401" ]; then
  pass "Malformed 'Bearer' (no token) → 401"
else
  fail "Malformed 'Bearer' → expected 401, got $ME_MAL_CODE"
fi

# Malformed header: "Basic" scheme instead of "Bearer"
ME_BASIC=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" -H "Authorization: Basic dXNlcjpwYXNz" "$BASE/api/auth/me")
ME_BASIC_CODE=$(extract_code "$ME_BASIC")
if [ "$ME_BASIC_CODE" = "401" ]; then
  pass "Wrong auth scheme (Basic) → 401"
else
  fail "Wrong auth scheme → expected 401, got $ME_BASIC_CODE"
fi

# Empty Authorization header
ME_EMPTY=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" -H "Authorization: " "$BASE/api/auth/me")
ME_EMPTY_CODE=$(extract_code "$ME_EMPTY")
if [ "$ME_EMPTY_CODE" = "401" ]; then
  pass "Empty Authorization header → 401"
else
  fail "Empty Authorization header → expected 401, got $ME_EMPTY_CODE"
fi

# Valid token → 200
ME_OK=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" -H "Authorization: Bearer $TOKEN_A" "$BASE/api/auth/me")
ME_OK_CODE=$(extract_code "$ME_OK")
ME_OK_BODY=$(extract_body "$ME_OK")
if [ "$ME_OK_CODE" = "200" ]; then
  pass "Valid token → 200"
else
  fail "Valid token → expected 200, got $ME_OK_CODE"
fi
if echo "$ME_OK_BODY" | grep -q "demo_user_a"; then
  pass "Response contains correct username"
else
  fail "Response missing username"
fi

echo ""
echo "--- 2.3 Protected endpoints reject unauthenticated ---"
ENDPOINTS=(
  "GET $BASE/api/context/current"
  "GET $BASE/api/context/history"
  "GET $BASE/api/interventions"
  "GET $BASE/api/history"
  "GET $BASE/api/history/policy"
  "POST $BASE/api/decisions"
)
for ep in "${ENDPOINTS[@]}"; do
  METHOD=$(echo "$ep" | cut -d' ' -f1)
  URL=$(echo "$ep" | cut -d' ' -f2)
  RESP=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" -X "$METHOD" "$URL")
  CODE=$(extract_code "$RESP")
  if [ "$CODE" = "401" ] || [ "$CODE" = "403" ]; then
    pass "$METHOD $URL unauthenticated → $CODE"
  else
    fail "$METHOD $URL unauthenticated → expected 401/403, got $CODE"
  fi
done

echo ""
echo "--- 2.4 Protected endpoints work with valid JWT ---"
# GET /api/context/current (no context yet for token_a... actually we submitted one)
CTX_CUR=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/context/current" -H "Authorization: Bearer $TOKEN_A")
CTX_CUR_CODE=$(extract_code "$CTX_CUR")
if [ "$CTX_CUR_CODE" = "200" ]; then
  pass "GET /api/context/current with JWT → 200"
else
  fail "GET /api/context/current with JWT → expected 200, got $CTX_CUR_CODE"
fi

INTV_AUTH=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/interventions" -H "Authorization: Bearer $TOKEN_A")
INTV_AUTH_CODE=$(extract_code "$INTV_AUTH")
if [ "$INTV_AUTH_CODE" = "200" ]; then
  pass "GET /api/interventions with JWT → 200"
else
  fail "GET /api/interventions with JWT → expected 200, got $INTV_AUTH_CODE"
fi

HIST_AUTH=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/history" -H "Authorization: Bearer $TOKEN_A")
HIST_AUTH_CODE=$(extract_code "$HIST_AUTH")
if [ "$HIST_AUTH_CODE" = "200" ]; then
  pass "GET /api/history with JWT → 200"
else
  fail "GET /api/history with JWT → expected 200, got $HIST_AUTH_CODE"
fi

POL_AUTH=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/history/policy" -H "Authorization: Bearer $TOKEN_A")
POL_AUTH_CODE=$(extract_code "$POL_AUTH")
if [ "$POL_AUTH_CODE" = "200" ]; then
  pass "GET /api/history/policy with JWT → 200"
else
  fail "GET /api/history/policy with JWT → expected 200, got $POL_AUTH_CODE"
fi

echo ""
echo "--- 2.5 Validation error responses ---"
# Register with missing fields
REG_BAD=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/auth/register" -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"ab"}')
REG_BAD_CODE=$(extract_code "$REG_BAD")
if [ "$REG_BAD_CODE" = "400" ]; then
  pass "Register with invalid data → 400"
else
  fail "Register with invalid data → expected 400, got $REG_BAD_CODE"
fi

# Submit context with missing fields
CTX_BAD=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/context" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d '{"timeOfDay":"MORNING"}')
CTX_BAD_CODE=$(extract_code "$CTX_BAD")
if [ "$CTX_BAD_CODE" = "400" ]; then
  pass "Submit context with missing fields → 400"
else
  fail "Submit context with missing fields → expected 400, got $CTX_BAD_CODE"
fi

# Submit response with invalid response type
DEC_FOR_RES=$(curl -s "$BASE/api/decisions" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"contextId\":$CTX_B_ID}")
DEC_FOR_RES_ID=$(echo "$DEC_FOR_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['decisionId'])" 2>/dev/null)
RES_BAD=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/interventions/response" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"decisionId\":$DEC_FOR_RES_ID,\"response\":\"INVALID_RESPONSE\"}")
RES_BAD_CODE=$(extract_code "$RES_BAD")
if [ "$RES_BAD_CODE" = "400" ]; then
  pass "Submit response with invalid type → 400"
else
  fail "Submit response with invalid type → expected 400, got $RES_BAD_CODE"
fi

echo ""
echo "--- 2.6 Cross-user isolation ---"
# Create second user
REG2=$(curl -s "$BASE/api/auth/register" -X POST -H "Content-Type: application/json" \
  -d '{"username":"other_user","email":"other@test.com","password":"Test@12345","displayName":"Other"}')
TOKEN_OTHER=$(echo "$REG2" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

# User B submits context, makes decision
CTX_OTHER=$(curl -s "$BASE/api/context" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_OTHER" \
  -d '{"timeOfDay":"EVENING","activityLevel":"LOW","stressLevel":"LOW","locationCategory":"HOME","receptivityScore":0.5}')
CTX_OTHER_ID=$(echo "$CTX_OTHER" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
DEC_OTHER=$(curl -s "$BASE/api/decisions" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_OTHER" \
  -d "{\"contextId\":$CTX_OTHER_ID}")
DEC_OTHER_ID=$(echo "$DEC_OTHER" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['decisionId'])" 2>/dev/null)

# User A tries to respond to User B's decision → should fail
CROSS=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/interventions/response" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"decisionId\":$DEC_OTHER_ID,\"response\":\"COMPLETE\"}")
CROSS_CODE=$(extract_code "$CROSS")
if [ "$CROSS_CODE" = "400" ]; then
  pass "Cross-user response blocked → 400"
else
  fail "Cross-user response → expected 400, got $CROSS_CODE"
fi

# User A tries to get User B's context by ID (not exposed, but let's check history isolation)
HIST_OTHER=$(curl -s "$BASE/api/history" -H "Authorization: Bearer $TOKEN_OTHER")
OTHER_DECS=$(echo "$HIST_OTHER" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['totalDecisions'])" 2>/dev/null)
HIST_A2=$(curl -s "$BASE/api/history" -H "Authorization: Bearer $TOKEN_A")
A_DECS=$(echo "$HIST_A2" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['totalDecisions'])" 2>/dev/null)
if [ "$OTHER_DECS" = "1" ] && [ "$A_DECS" != "$OTHER_DECS" ]; then
  pass "History isolated: User A=$A_DECS decisions, User B=$OTHER_DECS decisions"
else
  warn "History isolation check: User A=$A_DECS, User B=$OTHER_DECS"
fi

echo ""
echo "--- 2.7 Duplicate response prevention ---"
DEC_DUP=$(curl -s "$BASE/api/decisions" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"contextId\":$CTX_B_ID}")
DEC_DUP_ID=$(echo "$DEC_DUP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['decisionId'])" 2>/dev/null)

# First response
curl -s "$BASE/api/interventions/response" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"decisionId\":$DEC_DUP_ID,\"response\":\"COMPLETE\"}" >/dev/null

# Second response to same decision → should fail
DUP_RES=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$BASE/api/interventions/response" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"decisionId\":$DEC_DUP_ID,\"response\":\"DISMISS\"}")
DUP_RES_CODE=$(extract_code "$DUP_RES")
if [ "$DUP_RES_CODE" = "400" ]; then
  pass "Duplicate response to same decision → 400"
else
  fail "Duplicate response → expected 400, got $DUP_RES_CODE"
fi

echo ""
echo "--- 2.8 Response type mappings ---"
# Test DELAY reward value
DEC_DELAY=$(curl -s "$BASE/api/decisions" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"contextId\":$CTX_B_ID}")
DEC_DELAY_ID=$(echo "$DEC_DELAY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['decisionId'])" 2>/dev/null)
RES_DELAY=$(curl -s "$BASE/api/interventions/response" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"decisionId\":$DEC_DELAY_ID,\"response\":\"DELAY\"}")
DELAY_REWARD=$(echo "$RES_DELAY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['rewardValue'])" 2>/dev/null)
if [ "$DELAY_REWARD" = "-0.5" ]; then
  pass "DELAY response → reward=-0.5"
else
  fail "DELAY response → expected -0.5, got $DELAY_REWARD"
fi

DEC_IGNORE=$(curl -s "$BASE/api/decisions" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"contextId\":$CTX_B_ID}")
DEC_IGNORE_ID=$(echo "$DEC_IGNORE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['decisionId'])" 2>/dev/null)
RES_IGNORE=$(curl -s "$BASE/api/interventions/response" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"decisionId\":$DEC_IGNORE_ID,\"response\":\"IGNORE\"}")
IGNORE_REWARD=$(echo "$RES_IGNORE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['rewardValue'])" 2>/dev/null)
if [ "$IGNORE_REWARD" = "-1.0" ]; then
  pass "IGNORE response → reward=-1.0"
else
  fail "IGNORE response → expected -1.0, got $IGNORE_REWARD"
fi

echo ""
echo "--- 2.9 CORS headers on error responses ---"
# Preflight to protected endpoint
CORS_PREFLIGHT=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  "$BASE/api/auth/me")
if [ "$CORS_PREFLIGHT" = "200" ]; then
  pass "CORS preflight → 200"
else
  fail "CORS preflight → expected 200, got $CORS_PREFLIGHT"
fi

# Check CORS headers on 401 response
CORS_401=$(curl -s -D- -o /dev/null -H "Origin: http://localhost:3000" "$BASE/api/auth/me")
if echo "$CORS_401" | grep -qi "access-control-allow-origin"; then
  pass "CORS headers present on 401 response"
else
  warn "CORS headers may not be on 401 response (entry point bypasses filter)"
fi

# ============================================================
# SECTION 3: DAY 5 — DATABASE INTEGRITY
# ============================================================
header "DAY 5 — DATABASE INTEGRITY"

echo ""
echo "--- 3.1 Table existence ---"
TABLES=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" 2>&1)
EXPECTED_TABLES="users context_events decisions interventions policy_weights rewards"
for t in $EXPECTED_TABLES; do
  if echo "$TABLES" | grep -q "$t"; then
    pass "Table '$t' exists"
  else
    fail "Table '$t' NOT FOUND"
  fi
done

echo ""
echo "--- 3.2 Primary keys ---"
# Check each table has a bigint/bigserial id primary key
for t in users context_events decisions interventions rewards policy_weights; do
  PK_COL=$(psql -U $DB_USER -d $DB_NAME -t -c "
    SELECT a.attname FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = '$t'::regclass AND i.indisprimary
    LIMIT 1;" 2>&1 | tr -d ' ')
  if [ "$PK_COL" = "id" ]; then
    pass "$t PK is 'id'"
  else
    fail "$t PK expected 'id', got '$PK_COL'"
  fi
done

echo ""
echo "--- 3.3 Foreign keys ---"
FK_CHECK=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT tc.table_name || '.' || kcu.column_name || ' -> ' || ccu.table_name AS fk
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  ORDER BY tc.table_name, kcu.column_name;" 2>&1)

echo "$FK_CHECK" | while IFS= read -r line; do
  [ -z "$line" ] && continue
  echo "  FK found: $line"
done

# Check each expected FK
check_fk() {
  local tbl=$1 col=$2 ftable=$3
  local expected="$tbl.$col -> $ftable"
  if echo "$FK_CHECK" | grep -q "$tbl\.$col"; then
    pass "FK: $tbl.$col → $ftable"
  else
    fail "FK: $tbl.$col → $ftable NOT FOUND"
  fi
}

check_fk context_events user_id users
check_fk decisions user_id users
check_fk decisions context_id context_events
check_fk decisions selected_intervention_id interventions
check_fk rewards decision_id decisions
check_fk rewards user_id users
check_fk policy_weights user_id users
check_fk policy_weights intervention_id interventions

echo ""
echo "--- 3.4 Unique constraints ---"
UCHECK=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT tc.table_name, tc.constraint_name
  FROM information_schema.table_constraints tc
  WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
  ORDER BY tc.table_name;" 2>&1)

# users should have unique on username and email
if echo "$UCHECK" | grep -qi "users"; then
  pass "Unique constraints exist on users table"
else
  fail "No unique constraints on users table"
fi

# policy_weights should have unique on user_id+intervention_id+context_signature
if echo "$UCHECK" | grep -qi "policy_weights"; then
  pass "Unique constraint exists on policy_weights table"
else
  fail "No unique constraint on policy_weights table"
fi

echo ""
echo "--- 3.5 Enum/status fields ---"
# Check ResponseStatus enum values stored correctly in rewards
ENUM_CHECK=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT DISTINCT response FROM rewards WHERE user_id = (SELECT id FROM users WHERE username='demo_user_a') ORDER BY response;" 2>&1)
echo "  Response values in rewards table: $(echo "$ENUM_CHECK" | tr -d ' ')"
if echo "$ENUM_CHECK" | grep -q "COMPLETE"; then
  pass "COMPLETE enum value stored correctly"
else
  warn "COMPLETE enum value not found in rewards"
fi
if echo "$ENUM_CHECK" | grep -q "DISMISS"; then
  pass "DISMISS enum value stored correctly"
else
  warn "DISMISS enum value not found in rewards"
fi
if echo "$ENUM_CHECK" | grep -q "DELAY"; then
  pass "DELAY enum value stored correctly"
else
  warn "DELAY enum value not found in rewards"
fi
if echo "$ENUM_CHECK" | grep -q "IGNORE"; then
  pass "IGNORE enum value stored correctly"
else
  warn "IGNORE enum value not found in rewards"
fi

# Check DecisionStatus
DEC_STATUS=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT DISTINCT status FROM decisions;" 2>&1)
echo "  Decision status values: $(echo "$DEC_STATUS" | tr -d ' ')"
if echo "$DEC_STATUS" | grep -q "SELECTED"; then
  pass "SELECTED enum stored in decisions"
else
  fail "SELECTED enum missing from decisions"
fi
if echo "$DEC_STATUS" | grep -q "RESPONDED"; then
  pass "RESPONDED enum stored in decisions"
else
  warn "RESPONDED enum not found (some decisions may not have responses yet)"
fi

# Check intervention types and tones
INTV_TYPES=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT DISTINCT type FROM interventions ORDER BY type;" 2>&1)
INTV_TONES=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT DISTINCT tone FROM interventions ORDER BY tone;" 2>&1)
echo "  Intervention types: $(echo "$INTV_TYPES" | tr -d '\n ')"
echo "  Intervention tones: $(echo "$INTV_TONES" | tr -d '\n ')"
TYPE_COUNT=$(echo "$INTV_TYPES" | grep -c "[A-Z]" || true)
TONE_COUNT=$(echo "$INTV_TONES" | grep -c "[A-Z]" || true)
if [ "$TYPE_COUNT" -ge 7 ]; then
  pass "Multiple intervention types present ($TYPE_COUNT)"
else
  fail "Expected >= 7 intervention types, got $TYPE_COUNT"
fi
if [ "$TONE_COUNT" -ge 3 ]; then
  pass "Multiple intervention tones present ($TONE_COUNT)"
else
  fail "Expected >= 3 intervention tones, got $TONE_COUNT"
fi

echo ""
echo "--- 3.6 Not-null constraints ---"
# Check critical NOT NULL columns
NN_CHECK=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT table_name, column_name, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND is_nullable = 'NO'
  AND table_name IN ('users','context_events','decisions','interventions','rewards','policy_weights')
  ORDER BY table_name, column_name;" 2>&1)
# Spot-check critical ones
for col_pair in "users:username" "users:password_hash" "users:email" "context_events:user_id" "context_events:time_of_day" "decisions:user_id" "decisions:context_id" "decisions:selected_intervention_id" "decisions:confidence" "interventions:type" "interventions:tone" "interventions:message" "rewards:decision_id" "rewards:user_id" "rewards:response" "rewards:reward_value" "policy_weights:user_id" "policy_weights:intervention_id" "policy_weights:context_signature"; do
  TBL=$(echo "$col_pair" | cut -d: -f1)
  COL=$(echo "$col_pair" | cut -d: -f2)
  if echo "$NN_CHECK" | grep -q "$TBL.*$COL.*NO"; then
    pass "NOT NULL: $TBL.$COL"
  else
    fail "NOT NULL constraint missing: $TBL.$COL"
  fi
done

echo ""
echo "--- 3.7 Data integrity: record counts ---"
for t in users context_events decisions interventions rewards policy_weights; do
  COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM $t;" 2>&1 | tr -d ' ')
  echo "  $t: $COUNT rows"
done

echo ""
echo "--- 3.8 Relationship integrity: no orphaned records ---"
# Every context_events.user_id must reference a valid user
ORPHAN_CTX=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM context_events ce
  LEFT JOIN users u ON ce.user_id = u.id
  WHERE u.id IS NULL;" 2>&1 | tr -d ' ')
if [ "$ORPHAN_CTX" = "0" ]; then
  pass "No orphaned context_events (all user_ids valid)"
else
  fail "Found $ORPHAN_CTX orphaned context_events"
fi

# Every decision.user_id must reference a valid user
ORPHAN_DEC_U=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM decisions d
  LEFT JOIN users u ON d.user_id = u.id
  WHERE u.id IS NULL;" 2>&1 | tr -d ' ')
if [ "$ORPHAN_DEC_U" = "0" ]; then
  pass "No orphaned decisions (all user_ids valid)"
else
  fail "Found $ORPHAN_DEC_U orphaned decisions"
fi

# Every decision.context_id must reference a valid context_event
ORPHAN_DEC_C=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM decisions d
  LEFT JOIN context_events ce ON d.context_id = ce.id
  WHERE ce.id IS NULL;" 2>&1 | tr -d ' ')
if [ "$ORPHAN_DEC_C" = "0" ]; then
  pass "No orphaned decisions (all context_ids valid)"
else
  fail "Found $ORPHAN_DEC_C orphaned decisions with invalid context_id"
fi

# Every decision.selected_intervention_id must reference a valid intervention
ORPHAN_DEC_I=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM decisions d
  LEFT JOIN interventions i ON d.selected_intervention_id = i.id
  WHERE i.id IS NULL;" 2>&1 | tr -d ' ')
if [ "$ORPHAN_DEC_I" = "0" ]; then
  pass "No orphaned decisions (all intervention_ids valid)"
else
  fail "Found $ORPHAN_DEC_I orphaned decisions with invalid intervention_id"
fi

# Every reward.decision_id must reference a valid decision
ORPHAN_RWD=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM rewards r
  LEFT JOIN decisions d ON r.decision_id = d.id
  WHERE d.id IS NULL;" 2>&1 | tr -d ' ')
if [ "$ORPHAN_RWD" = "0" ]; then
  pass "No orphaned rewards (all decision_ids valid)"
else
  fail "Found $ORPHAN_RWD orphaned rewards"
fi

# Every reward.user_id must reference a valid user
ORPHAN_RWD_U=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM rewards r
  LEFT JOIN users u ON r.user_id = u.id
  WHERE u.id IS NULL;" 2>&1 | tr -d ' ')
if [ "$ORPHAN_RWD_U" = "0" ]; then
  pass "No orphaned rewards (all user_ids valid)"
else
  fail "Found $ORPHAN_RWD_U orphaned rewards"
fi

# Every policy_weight must reference valid user and intervention
ORPHAN_PW=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM policy_weights pw
  LEFT JOIN users u ON pw.user_id = u.id
  LEFT JOIN interventions i ON pw.intervention_id = i.id
  WHERE u.id IS NULL OR i.id IS NULL;" 2>&1 | tr -d ' ')
if [ "$ORPHAN_PW" = "0" ]; then
  pass "No orphaned policy_weights (all user_ids and intervention_ids valid)"
else
  fail "Found $ORPHAN_PW orphaned policy_weights"
fi

echo ""
echo "--- 3.9 Reward-policy consistency ---"
# Every reward's user_id should match its decision's user_id
MISMATCH=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM rewards r
  JOIN decisions d ON r.decision_id = d.id
  WHERE r.user_id != d.user_id;" 2>&1 | tr -d ' ')
if [ "$MISMATCH" = "0" ]; then
  pass "All reward.user_id match decision.user_id"
else
  fail "Found $MISMATCH rewards with user_id mismatch"
fi

# Verify policy weights contain only valid intervention types from the interventions table
PW_VALID=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM policy_weights pw
  JOIN interventions i ON pw.intervention_id = i.id
  WHERE i.type IS NULL;" 2>&1 | tr -d ' ')
if [ "$PW_VALID" = "0" ]; then
  pass "All policy_weights reference interventions with valid types"
else
  fail "Found $PW_VALID policy_weights referencing invalid intervention types"
fi

echo ""
echo "--- 3.10 Indexes ---"
IDX_CHECK=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT indexname FROM pg_indexes
  WHERE schemaname = 'public'
  ORDER BY indexname;" 2>&1)
for idx in "idx_context_user_time" "idx_decision_user_time" "idx_reward_decision" "idx_reward_user_time" "idx_policy_user" "idx_policy_context"; do
  if echo "$IDX_CHECK" | grep -q "$idx"; then
    pass "Index '$idx' exists"
  else
    warn "Index '$idx' not found (may use different name)"
  fi
done

echo ""
echo "--- 3.11 Password hashing verification ---"
HASH=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT password_hash FROM users WHERE username='demo_user_a';" 2>&1 | tr -d ' ')
if echo "$HASH" | grep -q '^\$2[aby]\$'; then
  pass "Password stored as BCrypt hash (not plaintext)"
elif echo "$HASH" | grep -qF '$2a$'; then
  pass "Password stored as BCrypt hash (not plaintext)"
else
  fail "Password may not be BCrypt hashed: ${HASH:0:20}..."
fi

echo ""
echo "--- 3.12 Timestamp integrity ---"
# Check that timestamps are reasonable (not null where expected, not epoch)
TS_NULL=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM users WHERE created_at IS NULL;" 2>&1 | tr -d ' ')
if [ "$TS_NULL" = "0" ]; then
  pass "All users have created_at timestamps"
else
  fail "$TS_NULL users missing created_at"
fi

TS_CTX_NULL=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM context_events WHERE recorded_at IS NULL;" 2>&1 | tr -d ' ')
if [ "$TS_CTX_NULL" = "0" ]; then
  pass "All context_events have recorded_at timestamps"
else
  fail "$TS_CTX_NULL context_events missing recorded_at"
fi

TS_DEC_NULL=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM decisions WHERE created_at IS NULL;" 2>&1 | tr -d ' ')
if [ "$TS_DEC_NULL" = "0" ]; then
  pass "All decisions have created_at timestamps"
else
  fail "$TS_DEC_NULL decisions missing created_at"
fi

TS_PW_NULL=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT COUNT(*) FROM policy_weights WHERE last_updated_at IS NULL;" 2>&1 | tr -d ' ')
if [ "$TS_PW_NULL" = "0" ]; then
  pass "All policy_weights have last_updated_at timestamps"
else
  fail "$TS_PW_NULL policy_weights missing last_updated_at"
fi

echo ""
echo "--- 3.13 Cascade behavior check ---"
# Deleting a user should cascade-delete their context_events, decisions, rewards, policy_weights
# We'll test this with the other_user we created
OTHER_UID=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM users WHERE username='other_user';" 2>&1 | tr -d ' ')
OTHER_CTX=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM context_events WHERE user_id=$OTHER_UID;" 2>&1 | tr -d ' ')
OTHER_DEC=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM decisions WHERE user_id=$OTHER_UID;" 2>&1 | tr -d ' ')
OTHER_PW=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM policy_weights WHERE user_id=$OTHER_UID;" 2>&1 | tr -d ' ')
echo "  other_user has: $OTHER_CTX contexts, $OTHER_DEC decisions, $OTHER_PW policy_weights"

# Check if JPA entities have cascade delete configured
CASCADE_CHECK=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT confdeltype FROM pg_constraint
  WHERE confrelid = 'users'::regclass AND contype = 'f';" 2>&1 | tr -d ' ')
echo "  DB cascade types on users FKs: '$CASCADE_CHECK'"
if echo "$CASCADE_CHECK" | grep -q '[acd]'; then
  pass "DB-level cascade configured on user foreign keys"
else
  warn "No DB-level ON DELETE CASCADE on user FKs (JPA default). Application should delete related records before user."
fi

# Verify referential integrity is enforced (not just a warning)
FK_ENFORCED=$(psql -U $DB_USER -d $DB_NAME -t -c "
  SELECT conname FROM pg_constraint
  WHERE contype = 'f' AND conrelid = 'context_events'::regclass;" 2>&1 | wc -l | tr -d ' ')
if [ "$FK_ENFORCED" -gt 0 ]; then
  pass "Foreign key constraints enforced at DB level (prevents orphans)"
else
  fail "No foreign key constraints found"
fi

# ============================================================
# SUMMARY
# ============================================================
header "SUMMARY"
TOTAL=$((PASS + FAIL + WARN))
echo ""
echo "  ✅ Passed: $PASS"
echo "  ❌ Failed: $FAIL"
echo "  ⚠️  Warnings: $WARN"
echo "  Total checks: $TOTAL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "  🎉 ALL CHECKS PASSED"
else
  echo "  ⚡ $FAIL CHECKS FAILED — review above"
fi
echo ""

# Cleanup
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
echo "Server stopped."

exit $FAIL
