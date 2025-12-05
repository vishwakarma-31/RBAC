import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test connection by querying the permissions table
    const { data, error } = await supabase
      .from('permissions')
      .select('count()');
    
    if (error) {
      console.error('Error connecting to permissions table:', error.message);
      return;
    }
    
    console.log('Successfully connected to permissions table');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

// Run the test
testConnection();