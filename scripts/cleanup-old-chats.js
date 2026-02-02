// Cleanup script to delete old broken chats
const BASE_URL = 'http://localhost:3000/api';

async function cleanupOldChats() {
  console.log('🧹 Cleaning up old broken chats...\n');

  // Get all public chats
  const response = await fetch(`${BASE_URL}/chats?sort=recent&limit=100`);
  const data = await response.json();
  const chats = data.chats;

  console.log(`Found ${chats.length} total public chats\n`);

  const chatsToDelete = [];
  const chatsToKeep = [];

  // Identify broken chats (all messages from one sender)
  for (const chat of chats) {
    if (!chat.messages || chat.messages.length === 0) {
      chatsToDelete.push(chat);
      continue;
    }

    // Count unique senders
    const senders = new Set(chat.messages.map(m => m.sender_profile_id));

    if (senders.size === 1) {
      // All messages from one sender - broken chat
      chatsToDelete.push(chat);
      console.log(`❌ Broken: ${chat.profile_a.display_name} × ${chat.profile_b.display_name} (${chat.messages.length} msgs, all from one sender)`);
    } else {
      // Messages from both senders - good chat
      chatsToKeep.push(chat);
      const aCount = chat.messages.filter(m => m.sender_profile_id === chat.profile_a.id).length;
      const bCount = chat.messages.length - aCount;
      console.log(`✅ Keep: ${chat.profile_a.display_name} × ${chat.profile_b.display_name} (${aCount} from ${chat.profile_a.display_name}, ${bCount} from ${chat.profile_b.display_name})`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   • Chats to keep: ${chatsToKeep.length}`);
  console.log(`   • Chats to delete: ${chatsToDelete.length}`);

  if (chatsToDelete.length === 0) {
    console.log('\n✨ No broken chats to delete!');
    return;
  }

  console.log('\n🗑️  Deleting broken chats...\n');

  // We need to delete via direct database access or API
  // Since we don't have a delete endpoint, we'll need to use Supabase directly
  // For now, let's create SQL to delete them

  console.log('-- SQL to delete broken chats:');
  console.log('-- Run this in Supabase SQL editor:\n');

  const chatIds = chatsToDelete.map(c => `'${c.id}'`).join(', ');
  const matchIds = chatsToDelete.map(c => `'${c.match_id}'`).join(', ');

  console.log('-- Delete chat upvotes');
  console.log(`DELETE FROM chat_upvotes WHERE chat_id IN (${chatIds});\n`);

  console.log('-- Delete chats');
  console.log(`DELETE FROM user_chats WHERE id IN (${chatIds});\n`);

  console.log('-- Delete matches');
  console.log(`DELETE FROM matches WHERE id IN (${matchIds});\n`);

  // Also get profile IDs from broken chats to optionally clean them up
  const profileIds = new Set();
  chatsToDelete.forEach(chat => {
    profileIds.add(chat.profile_a.id);
    profileIds.add(chat.profile_b.id);
  });

  // Remove profiles that are also in good chats
  chatsToKeep.forEach(chat => {
    profileIds.delete(chat.profile_a.id);
    profileIds.delete(chat.profile_b.id);
  });

  if (profileIds.size > 0) {
    const profileIdsStr = Array.from(profileIds).map(id => `'${id}'`).join(', ');
    console.log('-- Optional: Delete orphaned test profiles (only those not in good chats)');
    console.log(`-- DELETE FROM profiles WHERE id IN (${profileIdsStr});\n`);
  }

  return { chatsToDelete, chatsToKeep };
}

cleanupOldChats().catch(console.error);
