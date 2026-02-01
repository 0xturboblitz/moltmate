// Delete broken chats using Supabase admin client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env file
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteBrokenChats() {
  console.log('🧹 Deleting broken chats from database...\n');

  // Get all chats
  const { data: chats, error: fetchError } = await supabase
    .from('user_chats')
    .select('id, match_id, profile_a_id, profile_b_id, messages, is_public');

  if (fetchError) {
    console.error('Error fetching chats:', fetchError);
    return;
  }

  console.log(`Found ${chats.length} total chats\n`);

  const brokenChatIds = [];
  const brokenMatchIds = [];

  // Identify broken chats
  for (const chat of chats) {
    if (!chat.messages || chat.messages.length === 0) {
      brokenChatIds.push(chat.id);
      brokenMatchIds.push(chat.match_id);
      continue;
    }

    // Count unique senders
    const senders = new Set(chat.messages.map(m => m.sender_profile_id));

    if (senders.size === 1) {
      brokenChatIds.push(chat.id);
      brokenMatchIds.push(chat.match_id);
      console.log(`❌ Marking for deletion: ${chat.id.substring(0, 8)}... (${chat.messages.length} msgs from one sender)`);
    }
  }

  console.log(`\n📊 Found ${brokenChatIds.length} broken chats to delete\n`);

  if (brokenChatIds.length === 0) {
    console.log('✨ No broken chats to delete!');
    return;
  }

  // Delete chat upvotes first
  console.log('Deleting chat upvotes...');
  const { error: upvotesError } = await supabase
    .from('chat_upvotes')
    .delete()
    .in('chat_id', brokenChatIds);

  if (upvotesError) {
    console.error('Error deleting upvotes:', upvotesError);
  } else {
    console.log('✓ Chat upvotes deleted');
  }

  // Delete chats
  console.log('Deleting chats...');
  const { error: chatsError } = await supabase
    .from('user_chats')
    .delete()
    .in('id', brokenChatIds);

  if (chatsError) {
    console.error('Error deleting chats:', chatsError);
  } else {
    console.log('✓ Chats deleted');
  }

  // Delete matches
  console.log('Deleting matches...');
  const { error: matchesError } = await supabase
    .from('matches')
    .delete()
    .in('id', brokenMatchIds);

  if (matchesError) {
    console.error('Error deleting matches:', matchesError);
  } else {
    console.log('✓ Matches deleted');
  }

  // Verify
  console.log('\n✅ Cleanup complete! Verifying...');
  const { data: remainingChats } = await supabase
    .from('user_chats')
    .select('id, messages, is_public')
    .eq('is_public', true);

  console.log(`\n📊 Remaining public chats: ${remainingChats.length}`);
  remainingChats.forEach((chat, i) => {
    const senders = new Set(chat.messages.map(m => m.sender_profile_id));
    console.log(`   ${i + 1}. Chat ${chat.id.substring(0, 8)}... - ${chat.messages.length} messages from ${senders.size} sender(s)`);
  });
}

deleteBrokenChats().catch(console.error);
