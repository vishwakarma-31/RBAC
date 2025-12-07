#!/usr/bin/env node

// Simple script to test database connection and verify tables exist
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test connection by querying the permissions table
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data, error } = await supabase
      .from('permissions')
      .select('count()');
    
    if (error) {
      console.error('❌ Error connecting to permissions table:', error.message);
      console.log('\nThis usually means the table does not exist or the schema cache needs to be refreshed.');
      console.log('\nTo fix this:');
      console.log('1. Run the FIX_DATABASE.sql file in your Supabase SQL Editor');
      console.log('2. Make sure to execute the "NOTIFY pgrst, \'reload config\';" command');
      return;
    }
    
    console.log('✅ Successfully connected to permissions table');
    console.log('✅ Database setup is correct');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the test
testConnection();