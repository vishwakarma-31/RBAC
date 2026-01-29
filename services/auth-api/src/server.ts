import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import types
interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  roles: Role[];
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'read' | 'write' | 'update' | 'delete' | 'manage';
  description: string;
  tags: string[];
  createdAt: string;
}

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Mock in-memory storage (in production, this would be a database)
let users: User[] = [];
let roles: Role[] = [];

// Helper functions
const generateId = () => Math.random().toString(36).substr(2, 9);

// Auth routes
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // In a real implementation, we would verify the password hash
    // For demo purposes, we'll just check that a password was provided
    if (!password || password.length < 1) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    user.updatedAt = new Date().toISOString();

    // Generate a simple token (in real implementation, use JWT)
    const token = btoa(`${user.id}:${user.email}:${Date.now()}`);

    res.json({
      user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Determine user role
    let userRole = roles.find(r => r.name === (role || 'user'));
    if (!userRole) {
      // Create default user role if it doesn't exist
      userRole = {
        id: generateId(),
        name: role || 'user',
        description: role ? `${role} role` : 'Standard user role',
        permissions: [],
        userCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      roles.push(userRole);
    }

    // Create new user
    const newUser: User = {
      id: generateId(),
      name,
      email,
      status: 'active',
      roles: [userRole],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(newUser);
    
    // Increment role user count
    if (userRole) {
      userRole.userCount++;
      userRole.updatedAt = new Date().toISOString();
    }

    // Generate a simple token (in real implementation, use JWT)
    const token = btoa(`${newUser.id}:${newUser.email}:${Date.now()}`);

    res.status(201).json({
      user: newUser,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  // In a real implementation, we would invalidate the token
  // For now, just return success
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  // In a real implementation, we would verify the token and return user data
  // For now, return a placeholder
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Extract user info from token (simplified)
  const token = authHeader.substring(7);
  
  try {
    // For demo purposes, return a sample user
    // In real implementation, decode token and find user
    const user = users[0] || {
      id: generateId(),
      name: 'Demo User',
      email: 'demo@example.com',
      status: 'active',
      roles: [{
        id: generateId(),
        name: 'user',
        description: 'Standard user',
        permissions: [],
        userCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Auth API server running on port ${PORT}`);
});

export default app;