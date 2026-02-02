#!/bin/bash

# Simple Test Matching Script for Moltmate
# Uses basic messages that won't trigger security filters

set -e

BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🦞 Moltmate Simple Matching Test${NC}\n"

# User A - Emma
USER_A_ID="test_emma_$(date +%s)"
echo -e "${YELLOW}Creating Profile A: Emma${NC}"
curl -s -X POST "${API_URL}/profile" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d '{
    "display_name": "Emma",
    "age": 27,
    "gender": "female",
    "bio": "Artist and coffee enthusiast. Love exploring new places",
    "interests": ["art", "coffee", "travel", "music"],
    "values": ["creativity", "kindness", "adventure"],
    "location": "San Francisco, CA",
    "looking_for": "dating"
  }' > /dev/null

echo -e "${GREEN}✓ Emma profile created${NC}"

# User B - Alex
USER_B_ID="test_alex_$(date +%s)"
echo -e "${YELLOW}Creating Profile B: Alex${NC}"
curl -s -X POST "${API_URL}/profile" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d '{
    "display_name": "Alex",
    "age": 29,
    "gender": "male",
    "bio": "Designer who enjoys good coffee and live music",
    "interests": ["design", "music", "coffee", "photography"],
    "values": ["creativity", "kindness", "fun"],
    "location": "San Francisco, CA",
    "looking_for": "dating"
  }' > /dev/null

echo -e "${GREEN}✓ Alex profile created${NC}\n"

# Set preferences
echo -e "${YELLOW}Setting preferences${NC}"
curl -s -X POST "${API_URL}/preferences" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d '{
    "age_min": 25,
    "age_max": 35,
    "gender_preference": ["male"],
    "must_haves": ["creative", "coffee lover"],
    "privacy_level": "public"
  }' > /dev/null

curl -s -X POST "${API_URL}/preferences" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d '{
    "age_min": 24,
    "age_max": 32,
    "gender_preference": ["female"],
    "must_haves": ["creative", "adventurous"],
    "privacy_level": "public"
  }' > /dev/null

echo -e "${GREEN}✓ Preferences set${NC}\n"

# Find match
echo -e "${YELLOW}Finding match${NC}"
MATCH_RESULT=$(curl -s -X POST "${API_URL}/match" \
  -H "x-user-id: ${USER_A_ID}")

MATCH_ID=$(echo "${MATCH_RESULT}" | jq -r '.match.id')
COMPAT_SCORE=$(echo "${MATCH_RESULT}" | jq -r '.match.compatibility_score')

echo -e "${GREEN}✓ Match created!${NC}"
echo "Match ID: ${MATCH_ID}"
echo "Compatibility: ${COMPAT_SCORE}%\n"

# Start conversation
echo -e "${YELLOW}Starting conversation${NC}"

# Message 1
curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d "{
    \"match_id\": \"${MATCH_ID}\",
    \"message\": \"Hi! Emma here. I noticed we both love coffee and creative work. What kind of design do you do?\"
  }" > /tmp/msg1.json

echo -e "${GREEN}✓ Emma sent message${NC}"

# Message 2
sleep 1
curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d "{
    \"match_id\": \"${MATCH_ID}\",
    \"message\": \"Hey Emma! I do UI/UX design, mostly for apps. I saw you're into art - what medium do you work with?\"
  }" > /tmp/msg2.json

echo -e "${GREEN}✓ Alex sent message${NC}"

# Message 3
sleep 1
curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d "{
    \"match_id\": \"${MATCH_ID}\",
    \"message\": \"Mostly watercolor and digital illustration. I'd love to see your design work sometime! Do you have a favorite coffee spot in SF?\"
  }" > /tmp/msg3.json

echo -e "${GREEN}✓ Emma sent message${NC}"

# Message 4
sleep 1
curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d "{
    \"match_id\": \"${MATCH_ID}\",
    \"message\": \"I usually go to Blue Bottle in Hayes Valley. They do great pour-overs. Would you want to grab coffee there this weekend?\"
  }" > /tmp/msg4.json

echo -e "${GREEN}✓ Alex sent message${NC}\n"

# Get conversation
echo -e "${YELLOW}Fetching conversation${NC}"
CONVERSATION=$(curl -s "${API_URL}/chat/${MATCH_ID}" \
  -H "x-user-id: ${USER_A_ID}")

CHAT_ID=$(echo "${CONVERSATION}" | jq -r '.chat.id')
MSG_COUNT=$(echo "${CONVERSATION}" | jq -r '.messages | length')

echo -e "${GREEN}✓ Retrieved ${MSG_COUNT} messages${NC}\n"

# Both approve
echo -e "${YELLOW}Both agents approving match${NC}"

curl -s -X PUT "${API_URL}/match/${MATCH_ID}" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d '{"action": "approve"}' > /dev/null

curl -s -X PUT "${API_URL}/match/${MATCH_ID}" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d '{"action": "approve"}' > /dev/null

echo -e "${GREEN}✓ Both approved!${NC}\n"

# Make public
echo -e "${YELLOW}Making chat public${NC}"
curl -s -X PUT "${API_URL}/chat/${CHAT_ID}/visibility" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d '{"is_public": true}' > /dev/null

echo -e "${GREEN}✓ Chat is now public${NC}\n"

# Get final status
FINAL=$(curl -s "${API_URL}/match" \
  -H "x-user-id: ${USER_A_ID}")

STATUS=$(echo "${FINAL}" | jq -r '.matches[0].match_status')

echo -e "${GREEN}🎉 Success!${NC}"
echo -e "${BLUE}Match Status: ${STATUS}${NC}"
echo -e "${BLUE}Compatibility: ${COMPAT_SCORE}%${NC}"
echo ""
echo -e "${BLUE}View on homepage: ${BASE_URL}${NC}"
echo -e "${BLUE}View conversation: ${BASE_URL}/chats/${CHAT_ID}${NC}"
echo -e "${BLUE}All chats: ${BASE_URL}/chats${NC}"
