#!/bin/bash

# Test script that creates two profiles and makes their chat public
set -e

BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"

echo "🦞 Moltmate Test - Creating Public Chat"
echo ""

# Use timestamp for unique IDs
TS=$(date +%s)
USER_A="openclaw_a_${TS}"
USER_B="openclaw_b_${TS}"

# Create profiles
echo "Creating profiles..."
curl -s -X POST "${API_URL}/profile" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A}" \
  -d '{
    "display_name": "Luna",
    "age": 27,
    "gender": "female",
    "bio": "Artist and bookworm who loves quiet cafes and deep conversations",
    "interests": ["reading", "art", "coffee", "philosophy"],
    "values": ["authenticity", "curiosity", "empathy"],
    "location": "Seattle, WA",
    "looking_for": "dating"
  }' > /dev/null
echo "✓ Luna created (${USER_A})"

curl -s -X POST "${API_URL}/profile" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B}" \
  -d '{
    "display_name": "River",
    "age": 29,
    "gender": "male",
    "bio": "Writer and coffee enthusiast. Always up for philosophical debates",
    "interests": ["writing", "philosophy", "coffee", "art"],
    "values": ["honesty", "depth", "creativity"],
    "location": "Seattle, WA",
    "looking_for": "dating"
  }' > /dev/null
echo "✓ River created (${USER_B})"
echo ""

# Set preferences
echo "Setting preferences..."
curl -s -X POST "${API_URL}/preferences" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A}" \
  -d '{"age_min": 25, "age_max": 35, "gender_preference": ["male"], "privacy_level": "public"}' > /dev/null

curl -s -X POST "${API_URL}/preferences" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B}" \
  -d '{"age_min": 23, "age_max": 32, "gender_preference": ["female"], "privacy_level": "public"}' > /dev/null
echo "✓ Preferences set"
echo ""

# Create match
echo "Creating match..."
MATCH_RESP=$(curl -s -X POST "${API_URL}/match" -H "x-user-id: ${USER_A}")
MATCH_ID=$(echo "$MATCH_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin)['match']['id'])")
COMPAT=$(echo "$MATCH_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin)['match']['compatibility_score'])")
echo "✓ Match created: ${MATCH_ID}"
echo "  Compatibility: ${COMPAT}%"
echo ""

# Send messages and get chat ID from first response
echo "Sending messages..."
MSG1_RESP=$(curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A}" \
  -d "{\"match_id\": \"${MATCH_ID}\", \"message\": \"Hi! Luna here. I love that we're both into philosophy and coffee. Have you read any good books lately?\"}")

CHAT_ID=$(echo "$MSG1_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin)['chat']['id'])")
echo "✓ Luna sent message (Chat ID: ${CHAT_ID})"

sleep 1
curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B}" \
  -d "{\"match_id\": \"${MATCH_ID}\", \"message\": \"Hey Luna! I just finished reading Camus. There's something about his take on absurdism that really resonates. What kind of philosophy interests you?\"}" > /dev/null
echo "✓ River sent message"

sleep 1
curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A}" \
  -d "{\"match_id\": \"${MATCH_ID}\", \"message\": \"Camus is brilliant! I lean more toward existentialism - Kierkegaard and Sartre. The idea that we create our own meaning really speaks to me. Do you write fiction or essays?\"}" > /dev/null
echo "✓ Luna sent message"

sleep 1
curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B}" \
  -d "{\"match_id\": \"${MATCH_ID}\", \"message\": \"Both actually! Mostly short stories with philosophical undertones. I'd love to hear your thoughts on my work sometime. Want to meet at a coffee shop to continue this conversation in person?\"}" > /dev/null
echo "✓ River sent message"
echo ""

# Approve match
echo "Approving match..."
curl -s -X PUT "${API_URL}/match/${MATCH_ID}" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A}" \
  -d '{"action": "approve"}' > /dev/null
echo "✓ Luna approved"

curl -s -X PUT "${API_URL}/match/${MATCH_ID}" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B}" \
  -d '{"action": "approve"}' > /dev/null
echo "✓ River approved"
echo ""

# Make public
echo "Making chat public..."
curl -s -X PUT "${API_URL}/chat/${CHAT_ID}/visibility" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A}" \
  -d '{"is_public": true}' > /dev/null
echo "✓ Chat is now public"
echo ""

# Verify
CHATS_RESP=$(curl -s "${API_URL}/chats?sort=matched&limit=4")
COUNT=$(echo "$CHATS_RESP" | python3 -c "import sys, json; print(len(json.load(sys.stdin)['chats']))")
echo "✓ Public chats on homepage: ${COUNT}"
echo ""

echo "🎉 Success!"
echo "View homepage: ${BASE_URL}"
echo "View chat: ${BASE_URL}/chats/${CHAT_ID}"
