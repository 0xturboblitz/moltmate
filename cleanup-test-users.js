// Clean up test users from database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupTestUsers() {
  console.log('🧹 Cleaning up test users...\n');

  // Identify test users by patterns in user_id or display_name
  const testPatterns = [
    '%test%',
    '%Test%',
    '%sec_%',
    '%enh_%',
    '%scam_%',
    '%_a_%',
    '%_b_%',
    '%security%',
    '%Security%',
    '%demo%',
    '%Demo%'
  ];

  let totalDeleted = 0;

  for (const pattern of testPatterns) {
    console.log(`\nSearching for pattern: ${pattern}`);

    // Find profiles matching test patterns
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, user_id, display_name, created_at')
      .or(`user_id.ilike.${pattern},display_name.ilike.${pattern}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error finding profiles: ${error.message}`);
      continue;
    }

    if (!profiles || profiles.length === 0) {
      console.log('  No matches found');
      continue;
    }

    console.log(`  Found ${profiles.length} test profiles:`);

    for (const profile of profiles) {
      console.log(`    - ${profile.display_name} (${profile.user_id.substring(0, 30)}...)`);

      // Delete associated data (cascade should handle most, but be thorough)

      // Delete violations
      await supabase
        .from('user_violations')
        .delete()
        .eq('profile_id', profile.id);

      // Delete chat upvotes
      const { data: chats } = await supabase
        .from('user_chats')
        .select('id')
        .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id}`);

      if (chats) {
        for (const chat of chats) {
          await supabase
            .from('chat_upvotes')
            .delete()
            .eq('chat_id', chat.id);
        }
      }

      // Delete chats (profile_a or profile_b)
      await supabase
        .from('user_chats')
        .delete()
        .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id}`);

      // Delete matches (profile_a or profile_b)
      await supabase
        .from('matches')
        .delete()
        .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id}`);

      // Delete preferences
      await supabase
        .from('preferences')
        .delete()
        .eq('profile_id', profile.id);

      // Finally, delete the profile itself
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id);

      if (deleteError) {
        console.log(`      ❌ Error deleting: ${deleteError.message}`);
      } else {
        console.log(`      ✓ Deleted`);
        totalDeleted++;
      }
    }
  }

  // Also clean up orphaned data
  console.log('\n🧹 Cleaning up orphaned data...\n');

  // Find chats with deleted profiles
  const { data: orphanedChats } = await supabase
    .from('user_chats')
    .select('id, profile_a_id, profile_b_id')
    .limit(1000);

  if (orphanedChats) {
    for (const chat of orphanedChats) {
      // Check if profiles exist
      const { data: profileA } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', chat.profile_a_id)
        .single();

      const { data: profileB } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', chat.profile_b_id)
        .single();

      if (!profileA || !profileB) {
        console.log(`  Deleting orphaned chat ${chat.id.substring(0, 8)}...`);

        await supabase
          .from('chat_upvotes')
          .delete()
          .eq('chat_id', chat.id);

        await supabase
          .from('user_chats')
          .delete()
          .eq('id', chat.id);

        totalDeleted++;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n✅ Cleanup complete! Removed ${totalDeleted} test users and orphaned records.\n`);
}

cleanupTestUsers().catch(console.error);
