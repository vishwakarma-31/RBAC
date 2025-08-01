# RBAC (Role-Based Access Control)

A modern React application for managing user roles and permissions with a beautiful, responsive UI.

## Features

- **User Management**: Create, edit, and delete users with role assignments
- **Role Management**: Define roles with specific permissions
- **Permission Management**: Granular permission control system
- **Modern UI**: Built with React 19, TypeScript, and Tailwind CSS
- **Dark Mode**: Full dark/light theme support
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: React Query for server state
- **Routing**: React Router DOM
- **Icons**: Lucide React

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/            # shadcn/ui components
│   ├── layout/        # Layout components
│   ├── users/         # User-related components
│   ├── roles/         # Role-related components
│   ├── permissions/   # Permission-related components
│   └── theme/         # Theme management
├── pages/             # Page components
├── hooks/             # Custom React hooks
├── lib/               # Utility functions
└── assets/            # Static assets
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
