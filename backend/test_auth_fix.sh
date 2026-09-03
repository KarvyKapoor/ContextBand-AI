#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Starting server..."
java -jar target/contextband-ai-0.1.0-SNAPSHOT.jar &>/tmp/app.log &
APP_PID=$!
echo "PID=$APP_PID"

# Wait for server to start
for i in $(seq 1 30); do
  if grep -q "Started ContextBandApplication" /tmp/app.log 2>/dev/null; then
    echo "Server started after ${i}s"
    break
  fi
  sleep 1
done

if ! grep -q "Started ContextBandApplication" /tmp/app.log 2>/dev/null; then
  echo "FAIL: Server did not start"
  cat /tmp/app.log
  kill $APP_PID 2>/dev/null
  exit 1
fi

echo ""
echo "========================================="
echo "AUTH FIX VERIFICATION"
echo "========================================="

PASS=0
FAIL=0

# (a) No token → 401
echo ""
echo "--- (a) No Authorization header → expected 401 ---"
RESP=$(curl -s -w "\n%{http_code}" http://localhost:8080/api/auth/me)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
echo "HTTP $CODE: $BODY"
if [ "$CODE" = "401" ]; then
  echo "✅ PASS"
  PASS=$((PASS+1))
else
  echo "❌ FAIL (got $CODE, expected 401)"
  FAIL=$((FAIL+1))
fi

# (b) Invalid token → 401
echo ""
echo "--- (b) Invalid JWT token → expected 401 ---"
RESP=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer invalid-token" http://localhost:8080/api/auth/me)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
echo "HTTP $CODE: $BODY"
if [ "$CODE" = "401" ]; then
  echo "✅ PASS"
  PASS=$((PASS+1))
else
  echo "❌ FAIL (got $CODE, expected 401)"
  FAIL=$((FAIL+1))
fi

# (c) Valid token → 200
echo ""
echo "--- (c) Valid JWT token → expected 200 ---"
# First register and login to get a valid token
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"authtest","email":"authtest@test.com","password":"Test@12345","displayName":"Auth Test"}' >/dev/null 2>&1

LOGIN_RESP=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"authtest","password":"Test@12345"}')
TOKEN=$(echo "$LOGIN_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

RESP=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/auth/me)
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
echo "HTTP $CODE: $BODY"
if [ "$CODE" = "200" ]; then
  echo "✅ PASS"
  PASS=$((PASS+1))
else
  echo "❌ FAIL (got $CODE, expected 200)"
  FAIL=$((FAIL+1))
fi

# Also verify register and login still work (public endpoints)
echo ""
echo "--- (d) POST /api/auth/register → expected 201 ---"
RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"authtest2","email":"authtest2@test.com","password":"Test@12345","displayName":"Auth Test 2"}')
CODE=$(echo "$RESP" | tail -1)
echo "HTTP $CODE"
if [ "$CODE" = "201" ]; then
  echo "✅ PASS"
  PASS=$((PASS+1))
else
  echo "❌ FAIL (got $CODE, expected 201)"
  FAIL=$((FAIL+1))
fi

echo ""
echo "--- (e) POST /api/auth/login → expected 200 ---"
RESP=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"authtest2","password":"Test@12345"}')
CODE=$(echo "$RESP" | tail -1)
echo "HTTP $CODE"
if [ "$CODE" = "200" ]; then
  echo "✅ PASS"
  PASS=$((PASS+1))
else
  echo "❌ FAIL (got $CODE, expected 200)"
  FAIL=$((FAIL+1))
fi

echo ""
echo "========================================="
echo "RESULTS: $PASS passed, $FAIL failed"
echo "========================================="

kill $APP_PID 2>/dev/null
wait $APP_PID 2>/dev/null
echo "Server stopped."

exit $FAIL
