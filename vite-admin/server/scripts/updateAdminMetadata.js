// Script to update admin user metadata with name field
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dgefgxcxyyflxklptyln.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZWZneGN4eXlmbHhrbHB0eWxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAwODgyOCwiZXhwIjoyMDczNTg0ODI4fQ.OKtOfq6Lsvhhsm7TWbB5-TV-YXuTMK745JK9KJXIAWk';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateAdminUser() {
  try {
    // Get all users
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    console.log(`Found ${users.length} users`);

    // Find admin user
    const adminUser = users.find(user => user.email === 'admin@bmu.edu.in');

    if (!adminUser) {
      console.log('Admin user not found. Please create it first.');
      return;
    }

    console.log('Admin user found:', adminUser.email);
    console.log('Current metadata:', adminUser.user_metadata);

    // Update admin user with name in metadata
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      {
        user_metadata: { 
          name: 'Administrator'
        }
      }
    );

    if (updateError) {
      console.error('Error updating user:', updateError);
      return;
    }

    console.log('✅ Successfully updated admin user!');
    console.log('New metadata:', data.user.user_metadata);
  } catch (err) {
    console.error('Script error:', err);
  }
}

updateAdminUser();
