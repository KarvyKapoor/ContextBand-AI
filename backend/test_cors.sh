#!/bin/bash
cd /Users/shreygupta/Documents/ContextBandAI/backend

# Start server
java -jar target/contextband-ai-0.1.0-SNAPSHOT.jar &>/tmp/cors_test.log &
PID=$!
echo "Server PID: $PID"

# Wait for startup
for i in $(seq 1 20); do
    if curl -s http://localhost:8080/api/auth/register &>/dev/null; then
        echo "Server ready after ${i}s"
        break
    fi
    sleep 1
done

echo ""
echo "=== CORS TEST: Preflight from localhost:3000 ==="
curl -s -i -X OPTIONS http://localhost:8080/api/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" 2>&1 | grep -i "access-control\|HTTP/"

echo ""
echo "=== CORS TEST: Actual POST from localhost:3000 ==="
curl -s -i http://localhost:8080/api/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"username":"corstest","email":"cors@test.com","password":"test123"}' 2>&1 | grep -i "access-control\|HTTP/\|success"

echo ""
echo "=== CORS TEST: Unauthorized request from localhost:3000 ==="
curl -s -i http://localhost:8080/api/context \
  -H "Origin: http://localhost:3000" 2>&1 | grep -i "access-control\|HTTP/"

# Stop server
kill $PID 2>/dev/null
echo ""
echo "Server stopped"
