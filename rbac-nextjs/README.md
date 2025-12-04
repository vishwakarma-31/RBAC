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
   - Run the SQL scripts in the `database` folder to set up your schema
   - The scripts will create the necessary tables for roles, permissions, and user management

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

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
1. Your Supabase credentials in `.env.local` are correct
2. Your Supabase project URL is properly formatted (should start with https://)
3. You have an active internet connection

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)