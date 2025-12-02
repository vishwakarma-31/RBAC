# RBAC Configuration Tool

A modern Role-Based Access Control (RBAC) configuration tool built with Next.js, TypeScript, Supabase, and Tailwind CSS.

## 🚀 Features

- **User Authentication**: Secure login system with Supabase Auth
- **Permission Management**: Full CRUD operations for system permissions
- **Role Management**: Create, edit, and delete user roles
- **Role-Permission Assignment**: Visual interface to assign permissions to roles
- **Modern UI**: Clean, responsive design with shadcn/ui components
- **Real-time Database**: Powered by Supabase for reliable data storage

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI Library**: shadcn/ui with Tailwind CSS
- **Icons**: Lucide React
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd rbac-nextjs
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Set Up Database Schema

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create permissions table
CREATE TABLE permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create roles table
CREATE TABLE roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create role_permissions junction table
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Create user_roles junction table
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Enable Row Level Security
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON permissions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON permissions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON permissions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for authenticated users" ON permissions FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON roles FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON roles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON roles FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for authenticated users" ON roles FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON role_permissions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON role_permissions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for authenticated users" ON role_permissions FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON user_roles FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON user_roles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for authenticated users" ON user_roles FOR DELETE USING (auth.role() = 'authenticated');
```

### 5. Apply Security Upgrades (Recommended)

For production deployments, apply the security upgrades in `secure_schema.sql` to enhance database security:

1. This upgrade includes:
   - An `is_admin()` function to check admin privileges
   - Secure Row Level Security (RLS) policies limiting write access to admins only
   - Removal of insecure policies that allowed any authenticated user to modify data

2. Run the security upgrade script in your Supabase SQL Editor:
   - Open `secure_schema.sql` from the project root
   - Copy and execute the entire script in your Supabase SQL Editor

3. Create an 'Admin' role and assign it to users who should have administrative privileges:
   - First create the 'Admin' role in the application
   - Then assign this role to specific users via the user_roles table

### 6. Create a Test User

1. Go to your Supabase dashboard
2. Navigate to Authentication > Users
3. Click "Add User" and create a test account
4. Note down the email and password for testing

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── login/             # Authentication page
│   ├── dashboard/         # Protected dashboard routes
│   │   ├── permissions/   # Permission management
│   │   └── roles/         # Role management
│   └── page.tsx           # Home page (redirects to login)
├── components/            # Reusable UI components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility functions
│   ├── supabase.ts       # Supabase client
│   └── utils.ts          # Helper functions
└── types/                # TypeScript type definitions
    └── rbac.ts           # RBAC-related types
```

## 🔐 Authentication

The application uses Supabase Auth for user authentication. Users must be logged in to access the dashboard and manage RBAC settings.

## 🎯 Core Features

### Permission Management
- Create, read, update, and delete permissions
- Each permission has a name and optional description
- Permissions are the building blocks of your access control system

### Role Management
- Create, edit, and delete user roles
- Assign multiple permissions to each role
- Visual interface for managing role-permission relationships

### Dashboard
- Overview statistics showing total permissions, roles, and assignments
- Quick access to common tasks
- Real-time data from Supabase

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set these in your Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

## 🧒 RBAC Explanation for Kids

**Role-Based Access Control (RBAC)** is like giving different keys to different people in a big building. Some people get keys to all rooms (like the boss), some get keys to just the kitchen (like the chef), and others get keys to just the library (like the librarian). This way, everyone can only go where they're supposed to go!
