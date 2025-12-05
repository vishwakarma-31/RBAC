#!/usr/bin/env node

// Script to set up the RBAC database tables and refresh PostgREST cache
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('Setting up RBAC database tables...');
  
  try {
    // Create permissions table
    const { error: permissionsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.permissions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
      `
    });
    
    if (permissionsError) {
      console.error('Error creating permissions table:', permissionsError);
    } else {
      console.log('✓ Permissions table created');
    }
    
    // Create roles table
    const { error: rolesError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.roles (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
      `
    });
    
    if (rolesError) {
      console.error('Error creating roles table:', rolesError);
    } else {
      console.log('✓ Roles table created');
    }
    
    // Create role_permissions table
    const { error: rolePermissionsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.role_permissions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
          permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(role_id, permission_id)
        );
        
        ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
      `
    });
    
    if (rolePermissionsError) {
      console.error('Error creating role_permissions table:', rolePermissionsError);
    } else {
      console.log('✓ Role_permissions table created');
    }
    
    // Create user_roles table
    const { error: userRolesError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_roles (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, role_id)
        );
        
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
      `
    });
    
    if (userRolesError) {
      console.error('Error creating user_roles table:', userRolesError);
    } else {
      console.log('✓ User_roles table created');
    }
    
    // Refresh PostgREST schema cache
    const { error: refreshError } = await supabase.rpc('execute_sql', {
      sql: "SELECT pg_notify('pgrst', 'reload config');"
    });
    
    if (refreshError) {
      console.error('Error refreshing schema cache:', refreshError);
    } else {
      console.log('✓ PostgREST schema cache refreshed');
    }
    
    console.log('\nDatabase setup completed!');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

// Run the setup
setupDatabase();