import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  const adminEmail = process.argv[2];
  const adminPassword = process.argv[3];

  if (!adminEmail || !adminPassword) {
    console.log('Usage: npm run create-admin <email> <password>');
    process.exit(1);
  }

  try {
    // Create the user in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }

    console.log('Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('User ID:', authData.user.id);
    
    // The trigger should automatically create the user in public.users table with admin role
    // Let's verify it was created correctly
    setTimeout(async () => {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
      } else {
        console.log('User role:', userData.role);
      }
    }, 2000);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createAdminUser();