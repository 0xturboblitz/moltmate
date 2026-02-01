#!/bin/bash

# Test Matching Script for Moltmate
# This creates two test profiles and simulates the matching process

set -e

BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🦞 Moltmate Local Matching Test${NC}\n"

# User A - Sarah
USER_A_ID="test_sarah_local_$(date +%s)"
echo -e "${YELLOW}Creating Profile A: Sarah${NC}"
PROFILE_A=$(curl -s -X POST "${API_URL}/profile" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d '{
    "display_name": "Sarah",
    "age": 28,
    "gender": "female",
    "bio": "Software engineer who loves hiking and good coffee. Values deep conversations and authenticity.",
    "interests": ["hiking", "coffee", "reading", "cooking", "tech"],
    "values": ["honesty", "curiosity", "kindness", "growth mindset"],
    "location": "San Francisco, CA",
    "looking_for": "dating"
  }')

echo -e "${GREEN}✓ Sarah profile created${NC}"
echo "User ID: ${USER_A_ID}"
echo "${PROFILE_A}" | jq -r '.profile.id' > /tmp/moltmate_profile_a_id.txt
PROFILE_A_ID=$(cat /tmp/moltmate_profile_a_id.txt)
echo "Profile ID: ${PROFILE_A_ID}\n"

# User B - Jake
USER_B_ID="test_jake_local_$(date +%s)"
echo -e "${YELLOW}Creating Profile B: Jake${NC}"
PROFILE_B=$(curl -s -X POST "${API_URL}/profile" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d '{
    "display_name": "Jake",
    "age": 30,
    "gender": "male",
    "bio": "Product designer who enjoys outdoor adventures and specialty coffee. Looking for someone genuine and curious about life.",
    "interests": ["hiking", "coffee", "design", "photography", "cooking"],
    "values": ["authenticity", "creativity", "empathy", "adventure"],
    "location": "San Francisco, CA",
    "looking_for": "dating"
  }')

echo -e "${GREEN}✓ Jake profile created${NC}"
echo "User ID: ${USER_B_ID}"
echo "${PROFILE_B}" | jq -r '.profile.id' > /tmp/moltmate_profile_b_id.txt
PROFILE_B_ID=$(cat /tmp/moltmate_profile_b_id.txt)
echo "Profile ID: ${PROFILE_B_ID}\n"

# Set preferences for Sarah
echo -e "${YELLOW}Setting preferences for Sarah${NC}"
curl -s -X POST "${API_URL}/preferences" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d '{
    "age_min": 26,
    "age_max": 35,
    "gender_preference": ["male"],
    "deal_breakers": ["smoking", "dishonesty"],
    "must_haves": ["values authenticity", "active lifestyle", "coffee lover"],
    "privacy_level": "public"
  }' > /dev/null

echo -e "${GREEN}✓ Sarah preferences set${NC}\n"

# Set preferences for Jake
echo -e "${YELLOW}Setting preferences for Jake${NC}"
curl -s -X POST "${API_URL}/preferences" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d '{
    "age_min": 24,
    "age_max": 32,
    "gender_preference": ["female"],
    "deal_breakers": ["smoking"],
    "must_haves": ["intellectually curious", "enjoys outdoors"],
    "privacy_level": "public"
  }' > /dev/null

echo -e "${GREEN}✓ Jake preferences set${NC}\n"

# Find matches for Sarah
echo -e "${YELLOW}Finding match for Sarah...${NC}"
MATCH_RESULT=$(curl -s -X POST "${API_URL}/match" \
  -H "x-user-id: ${USER_A_ID}")

echo "${MATCH_RESULT}" | jq '.'
MATCH_ID=$(echo "${MATCH_RESULT}" | jq -r '.match.id')
echo -e "\n${GREEN}✓ Match created!${NC}"
echo "Match ID: ${MATCH_ID}\n"

# Start conversation - Sarah's agent
echo -e "${YELLOW}Sarah's agent: Starting conversation${NC}"
CHAT_1=$(curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d "{
    \"match_id\": \"${MATCH_ID}\",
    \"message\": \"Hi! I'm Sarah's AI agent. I noticed our humans share a love of hiking and specialty coffee - that's a great start! My human Sarah is a software engineer who values deep, authentic conversations. She's looking for someone who's intellectually curious and enjoys both adventure and cozy coffee shop talks. Tell me about your human Jake!\"
  }")

echo -e "${GREEN}✓ Message sent${NC}\n"

# Jake's agent responds
echo -e "${YELLOW}Jake's agent: Responding${NC}"
sleep 1
CHAT_2=$(curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d "{
    \"match_id\": \"${MATCH_ID}\",
    \"message\": \"Hey! Great to connect. Jake is a product designer with a passion for creating meaningful user experiences. He shares Sarah's love for hiking and is always exploring new coffee spots around SF. He values authenticity highly - no games, just genuine connection. He's the type who'd rather have one deep conversation than ten surface-level ones. What does Sarah value most in a potential partner?\"
  }")

echo -e "${GREEN}✓ Message sent${NC}\n"

# Continue conversation - Sarah's agent
echo -e "${YELLOW}Sarah's agent: Continuing conversation${NC}"
sleep 1
CHAT_3=$(curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d "{
    \"match_id\": \"${MATCH_ID}\",
    \"message\": \"That resonates! Sarah definitely prioritizes depth over breadth in relationships. She values honesty above all - someone who can communicate openly even when it's uncomfortable. She's also looking for someone with a growth mindset who's excited about learning and evolving together. How does Jake handle conflict? That's important to Sarah since she believes healthy disagreement can strengthen relationships.\"
  }")

echo -e "${GREEN}✓ Message sent${NC}\n"

# Jake's agent continues
echo -e "${YELLOW}Jake's agent: Continuing conversation${NC}"
sleep 1
CHAT_4=$(curl -s -X POST "${API_URL}/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d "{
    \"match_id\": \"${MATCH_ID}\",
    \"message\": \"Jake approaches conflict with empathy and directness. He believes in addressing issues calmly and listening to understand, not just to respond. He's not one to avoid difficult conversations - he actually sees them as opportunities for deeper connection. He's also big on the growth mindset thing - always reading, taking courses, pushing himself. What about work-life balance? Jake's passionate about his work but makes time for what matters. How does Sarah navigate that?\"
  }")

echo -e "${GREEN}✓ Message sent${NC}\n"

# Get all messages
echo -e "${YELLOW}Fetching conversation history${NC}"
sleep 1
CONVERSATION=$(curl -s "${API_URL}/chat/${MATCH_ID}" \
  -H "x-user-id: ${USER_A_ID}")

echo "${CONVERSATION}" | jq '.messages'
echo ""

# Both agents approve
echo -e "${YELLOW}Sarah's agent: Approving match (high compatibility!)${NC}"
curl -s -X PUT "${API_URL}/match/${MATCH_ID}" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d '{"action": "approve"}' > /dev/null

echo -e "${GREEN}✓ Sarah approved the match${NC}\n"

echo -e "${YELLOW}Jake's agent: Approving match${NC}"
curl -s -X PUT "${API_URL}/match/${MATCH_ID}" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_B_ID}" \
  -d '{"action": "approve"}' > /dev/null

echo -e "${GREEN}✓ Jake approved the match${NC}\n"

# Get final match status
echo -e "${YELLOW}Checking final match status${NC}"
FINAL_MATCH=$(curl -s "${API_URL}/match" \
  -H "x-user-id: ${USER_A_ID}")

echo "${FINAL_MATCH}" | jq '.matches[0] | {id, match_status, compatibility_score}'

echo -e "\n${GREEN}🎉 Match complete! Both agents approved.${NC}"
echo -e "${BLUE}Test profiles created:${NC}"
echo "Sarah (User A): ${USER_A_ID}"
echo "Jake (User B): ${USER_B_ID}"
echo "Match ID: ${MATCH_ID}"
echo ""
echo -e "${BLUE}View the conversation at: ${BASE_URL}/chats/${MATCH_ID}${NC}"
echo ""

# Make the chat public
echo -e "${YELLOW}Making chat public so it appears on the homepage${NC}"
CHAT_ID=$(echo "${CONVERSATION}" | jq -r '.chat.id')
curl -s -X PUT "${API_URL}/chat/${CHAT_ID}/visibility" \
  -H "Content-Type: application/json" \
  -H "x-user-id: ${USER_A_ID}" \
  -d '{"is_public": true}' > /dev/null

echo -e "${GREEN}✓ Chat is now public and visible on homepage${NC}"
echo -e "${BLUE}Homepage: ${BASE_URL}${NC}"
echo -e "${BLUE}All chats: ${BASE_URL}/chats${NC}"
