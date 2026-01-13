# RBAC Configuration Tool

A Role-Based Access Control (RBAC) configuration tool built with Next.js 15, Supabase, and Tailwind CSS.

## Getting Started

### Prerequisites

1. Node.js 18+ installed
2. A Supabase account (free tier available at [supabase.com](https://supabase.com))

### Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd rbac-nextjs
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Navigate to Settings > API to get your project URL and anon key
   - Copy `.env.local.example` to `.env.local`:
     ```bash
     cp .env.local.example .env.local
     ```
   - Update `.env.local` with your Supabase credentials:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```

4. Set up the database:
   - Run the SQL scripts in the `secure_schema.sql` file to set up your schema
   - The scripts will create the necessary tables for roles, permissions, and user management
   - After running the SQL, execute `NOTIFY pgrst, 'reload config';` to refresh the PostgREST cache

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deploying to Vercel

The project is ready for deployment to Vercel. Here's how to deploy:

### Option 1: One-Click Deploy (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/rbac-nextjs&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY&envDescription=Supabase%20credentials%20required%20for%20the%20application&envLink=your-supabase-dashboard-link)

### Option 2: Manual Deployment

1. Push your code to a GitHub/GitLab/Bitbucket repository
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project" and import your repository
4. Add the required environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
5. Click "Deploy"

### Option 3: Using Vercel CLI

1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link your project to Vercel:
   ```bash
   vercel
   ```

3. Set the environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

4. Deploy:
   ```bash
   vercel --prod
   ```

### Environment Variables for Vercel

When deploying to Vercel, you'll need to set these environment variables in your Vercel project settings:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Note**: The `NEXT_PUBLIC_*` prefix is important - Vercel will automatically expose these to your client-side code.

### Database Setup for Production

After deployment, you'll need to set up your database schema in your Supabase production project:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the contents of `secure_schema.sql` to create the necessary tables and policies
4. Execute `NOTIFY pgrst, 'reload config';` to refresh the PostgREST cache

## Features

- User authentication (registration and login)
- Role-based access control
- Permission management
- Dashboard for administrators
- Responsive design with Tailwind CSS
- Dark mode support

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Authentication)
- **UI Components**: shadcn/ui, Radix UI, Lucide React Icons
- **State Management**: React Hooks
- **Deployment**: Vercel

## Environment Variables

The application requires the following environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Error Handling

If you see "Failed to fetch" errors, check that:
1. Your Supabase credentials in environment variables are correct
2. Your Supabase project URL is properly formatted (should start with https://)
3. You have set up the database schema in your Supabase project

## Build Configuration

This project is configured for Vercel deployment with:
- Optimized security headers
- React Strict Mode enabled
- Proper TypeScript configuration
- Tailwind CSS v4 integration

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vercel Documentation](https://vercel.com/docs)