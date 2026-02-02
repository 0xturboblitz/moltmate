#!/bin/bash

# Debug Test Script - Creates and makes chat public
set -e

BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"

echo "🦞 Creating test match..."

# Use fixed timestamp for consistency
TIMESTAMP=$(date +%s)
USER_A_ID="test_user_a_${TIMESTAMP}"
USER_B_ID="test_user_b_${TIMESTAMP}"

echo "User A ID: ${USER_A_ID}"
echo "User B ID: ${USER_B_ID}"
echo ""

# Create Profile A
echo "Creating Profile A..."
curl -s -X POST "${API_URL}/profile" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d '{
    "display_name": "Maya",
    "age": 26,
    "gender": "female",
    "bio": "Photographer and nature lover. Always seeking new adventures",
    "interests": ["photography", "hiking", "yoga", "travel"],
    "values": ["authenticity", "creativity", "mindfulness"],
    "location": "Portland, OR",
    "looking_for": "dating"
  }' > /dev/null
echo "✓ Maya profile created"

# Create Profile B
echo "Creating Profile B..."
curl -s -X POST "${API_URL}/profile" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d '{
    "display_name": "Sam",
    "age": 28,
    "gender": "male",
    "bio": "Outdoor enthusiast and software developer. Love capturing life moments",
    "interests": ["hiking", "photography", "coffee", "tech"],
    "values": ["honesty", "adventure", "mindfulness"],
    "location": "Portland, OR",
    "looking_for": "dating"
  }' > /dev/null
echo "✓ Sam profile created"
echo ""

# Set preferences
echo "Setting preferences..."
curl -s -X POST "${API_URL}/preferences" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d '{
    "age_min": 24,
    "age_max": 32,
    "gender_preference": ["male"],
    "must_haves": ["outdoorsy", "creative"],
    "privacy_level": "public"
  }' > /dev/null

curl -s -X POST "${API_URL}/preferences" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d '{
    "age_min": 22,
    "age_max": 30,
    "gender_preference": ["female"],
    "must_haves": ["adventurous", "creative"],
    "privacy_level": "public"
  }' > /dev/null
echo "✓ Preferences set"
echo ""

# Find match
echo "Finding match..."
MATCH_JSON=$(curl -s -X POST "${API_URL}/match" -H "x-user-id: ${USER_A_ID}")
MATCH_ID=$(echo "$MATCH_JSON" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✓ Match ID: ${MATCH_ID}"
echo ""

# Send messages
echo "Sending messages..."

curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d "{\"match_id\": \"${MATCH_ID}\", \"message\": \"Hi! Maya here. I love that we both enjoy photography and hiking. What kind of photography do you do?\"}" > /dev/null
echo "✓ Maya sent message 1"

sleep 1
curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d "{\"match_id\": \"${MATCH_ID}\", \"message\": \"Hey Maya! I do mostly landscape and nature photography. I love capturing sunrise shots on hiking trips. What about you?\"}" > /dev/null
echo "✓ Sam sent message 2"

sleep 1
curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d "{\"match_id\": \"${MATCH_ID}\", \"message\": \"Same! There's something magical about golden hour in the mountains. Do you have a favorite trail in Portland?\"}" > /dev/null
echo "✓ Maya sent message 3"

sleep 1
curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d "{\"match_id\": \"${MATCH_ID}\", \"message\": \"Forest Park is amazing for quick escapes after work, but I love heading to Mount Hood on weekends. We should compare photography sometime!\"}" > /dev/null
echo "✓ Sam sent message 4"
echo ""

# Get chat to find chat_id
echo "Fetching chat..."
CHAT_JSON=$(curl -s "${API_URL}/chat/${MATCH_ID}" -H "x-user-id: ${USER_A_ID}")
CHAT_ID=$(echo "$CHAT_JSON" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✓ Chat ID: ${CHAT_ID}"
echo ""

# Approve match
echo "Approving match..."
curl -s -X PUT "${API_URL}/match/${MATCH_ID}" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d '{"action": "approve"}' > /dev/null
echo "✓ Maya approved"

curl -s -X PUT "${API_URL}/match/${MATCH_ID}" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d '{"action": "approve"}' > /dev/null
echo "✓ Sam approved"
echo ""

# Make chat public
echo "Making chat public..."
curl -s -X PUT "${API_URL}/chat/${CHAT_ID}/visibility" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d '{"is_public": true}' > /dev/null
echo "✓ Chat is now public"
echo ""

# Verify it's public
echo "Verifying public chats..."
PUBLIC_COUNT=$(curl -s "${API_URL}/chats?sort=matched&limit=10" | grep -o '"id"' | wc -l)
echo "✓ Public chats count: ${PUBLIC_COUNT}"
echo ""

echo "🎉 Success!"
echo "View at: ${BASE_URL}"
echo "Chat: ${BASE_URL}/chats/${CHAT_ID}"
