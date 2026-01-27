# Admin Dashboard

React-based administration interface for managing the Authorization Platform.

## Architecture Overview

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **State Management**: Redux Toolkit with RTK Query
- **UI Library**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **Form Handling**: React Hook Form + Zod validation
- **Charts**: Recharts for analytics visualization
- **Testing**: Jest + React Testing Library

### Security Model
- **Tenant-scoped authentication**
- **Role-based UI access control**
- **Client-side authorization enforcement**
- **Secure credential storage**
- **Activity logging**

## Core Features

### Tenant Management
- Create and configure new tenants
- View tenant statistics and usage metrics
- Suspend/reactivate tenants
- Manage tenant administrators

### Role Management
- Visual role hierarchy editor
- Drag-and-drop role organization
- Role inheritance visualization
- Bulk role operations

### Permission Assignment
- Matrix-style permission assignment UI
- Resource-type filtering
- Permission templates
- Bulk permission grants

### Policy Editor
- JSON policy editor with syntax highlighting
- Policy validation and testing
- Version history and rollback
- Policy simulation tool

### Audit & Compliance
- Real-time audit log viewer
- Advanced filtering and search
- Compliance report generation
- Export capabilities (PDF, CSV, JSON)

### Authorization Simulator
- "What if" scenario testing
- Principal permission enumeration
- Decision explanation breakdown
- Policy impact analysis

## Component Architecture

### Layout Structure
```
src/
├── components/
│   ├── layout/                 # Page layouts and navigation
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── tenant/                 # Tenant management components
│   ├── role/                   # Role management components
│   ├── permission/             # Permission components
│   ├── policy/                 # Policy editor components
│   ├── audit/                  # Audit log components
│   └── shared/                 # Reusable components
├── pages/                      # Route components
├── hooks/                      # Custom React hooks
├── store/                      # Redux store configuration
├── services/                   # API service clients
└── utils/                      # Utility functions
```

### Key Components

#### RoleHierarchyEditor
```tsx
// components/role/RoleHierarchyEditor.tsx
import React, { useState } from 'react';
import { TreeView, TreeItem } from '@mui/x-tree-view';
import { Role } from '../../types';

interface RoleHierarchyEditorProps {
  roles: Role[];
  onHierarchyChange: (updatedRoles: Role[]) => void;
}

export const RoleHierarchyEditor: React.FC<RoleHierarchyEditorProps> = ({
  roles,
  onHierarchyChange
}) => {
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  
  const handleDragEnd = (result: DropResult) => {
    // Handle drag-and-drop reorganization
    const updatedRoles = reorderRoles(roles, result);
    onHierarchyChange(updatedRoles);
  };

  return (
    <TreeView
      expanded={expandedNodes}
      onNodeToggle={(event, nodeIds) => setExpandedNodes(nodeIds)}
    >
      {renderRoleTree(roles)}
    </TreeView>
  );
};
```

#### PolicyEditor
```tsx
// components/policy/PolicyEditor.tsx
import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Policy, PolicyRule } from '../../types';

interface PolicyEditorProps {
  policy?: Policy;
  onSave: (policy: Policy) => void;
}

export const PolicyEditor: React.FC<PolicyEditorProps> = ({
  policy,
  onSave
}) => {
  const [code, setCode] = useState<string>(
    policy ? JSON.stringify(policy.rules, null, 2) : ''
  );
  
  const handleValidate = async () => {
    try {
      const rules: PolicyRule[] = JSON.parse(code);
      const validationResult = await validatePolicyRules(rules);
      return validationResult;
    } catch (error) {
      return { valid: false, errors: ['Invalid JSON syntax'] };
    }
  };

  return (
    <div className="policy-editor">
      <Editor
        height="600px"
        language="json"
        value={code}
        onChange={(value) => setCode(value || '')}
        theme="vs-dark"
      />
      <div className="editor-actions">
        <button onClick={handleValidate}>Validate</button>
        <button onClick={() => onSave({ ...policy!, rules: JSON.parse(code) })}>
          Save Policy
        </button>
      </div>
    </div>
  );
};
```

#### AuthorizationSimulator
```tsx
// components/simulator/AuthorizationSimulator.tsx
import React, { useState } from 'react';
import { simulateAuthorization } from '../../services/authz-api';

export const AuthorizationSimulator: React.FC = () => {
  const [principalId, setPrincipalId] = useState('');
  const [action, setAction] = useState('');
  const [resource, setResource] = useState({ type: '', id: '' });
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const handleSimulate = async () => {
    const result = await simulateAuthorization({
      principalId,
      action,
      resource
    });
    setSimulationResult(result);
  };

  return (
    <div className="simulator">
      <div className="input-section">
        <TextField
          label="Principal ID"
          value={principalId}
          onChange={(e) => setPrincipalId(e.target.value)}
        />
        <TextField
          label="Action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        {/* Resource inputs */}
      </div>
      
      <Button onClick={handleSimulate}>Simulate</Button>
      
      {simulationResult && (
        <div className="results">
          <h3>Decision: {simulationResult.allowed ? 'ALLOWED' : 'DENIED'}</h3>
          <p>Reason: {simulationResult.reason}</p>
          <div className="evaluation-trace">
            {simulationResult.evaluationTrace?.map((step: any, index: number) => (
              <div key={index} className={`step ${step.result}`}>
                {step.description}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

## State Management

### Redux Store Structure
```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './slices/authSlice';
import { tenantSlice } from './slices/tenantSlice';
import { roleSlice } from './slices/roleSlice';
import { api } from './services/api';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    tenants: tenantSlice.reducer,
    roles: roleSlice.reducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### RTK Query API Service
```typescript
// store/services/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('auth-token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getTenants: builder.query<Tenant[], void>({
      query: () => '/tenants',
    }),
    getRoles: builder.query<Role[], { tenantId: string }>({
      query: ({ tenantId }) => `/tenants/${tenantId}/roles`,
    }),
    createRole: builder.mutation<Role, CreateRoleRequest>({
      query: (newRole) => ({
        url: `/tenants/${newRole.tenantId}/roles`,
        method: 'POST',
        body: newRole,
      }),
    }),
    // ... other endpoints
  }),
});

export const {
  useGetTenantsQuery,
  useGetRolesQuery,
  useCreateRoleMutation,
} = api;
```

## Routing & Navigation

### Protected Routes
```tsx
// components/layout/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission
}) => {
  const { isAuthenticated, user } = useAppSelector(state => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !user?.permissions.includes(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

### Route Configuration
```tsx
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/tenants/:id" element={<TenantDetailPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
        </Route>
        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## Authentication Flow

### Login Component
```tsx
// components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { useLoginMutation } from '../../store/services/auth-api';
import { setCredentials } from '../../store/slices/authSlice';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await login({ email, password }).unwrap();
      dispatch(setCredentials(result));
    } catch (error) {
      // Handle login error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <LoadingButton
        loading={isLoading}
        type="submit"
        variant="contained"
      >
        Sign In
      </LoadingButton>
    </form>
  );
};
```

## Styling & Theme

### Custom Theme Configuration
```typescript
// theme/index.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});
```

### Responsive Design
```tsx
// hooks/useResponsive.ts
import { useMediaQuery, Theme } from '@mui/material';

export const useResponsive = () => {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery((theme: Theme) => theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

  return { isMobile, isTablet, isDesktop };
};
```

## Testing Strategy

### Component Testing
```tsx
// components/role/__tests__/RoleHierarchyEditor.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleHierarchyEditor } from '../RoleHierarchyEditor';

describe('RoleHierarchyEditor', () => {
  const mockRoles = [
    { id: '1', name: 'Admin', parentId: null },
    { id: '2', name: 'User', parentId: '1' }
  ];

  it('renders role hierarchy correctly', () => {
    render(<RoleHierarchyEditor roles={mockRoles} onHierarchyChange={jest.fn()} />);
    
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('handles drag and drop', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    
    render(<RoleHierarchyEditor roles={mockRoles} onHierarchyChange={handleChange} />);
    
    // Simulate drag and drop
    // ... test implementation
  });
});
```

### Integration Testing
```tsx
// __tests__/integration/auth-flow.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/login', (req, res, ctx) => {
    return res(ctx.json({ token: 'fake-jwt-token', user: { id: '1', name: 'Test User' } }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('full authentication flow', async () => {
  const user = userEvent.setup();
  
  render(<App />);
  
  // Navigate to login
  expect(screen.getByText('Sign In')).toBeInTheDocument();
  
  // Fill login form
  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.type(screen.getByLabelText('Password'), 'password123');
  
  // Submit form
  await user.click(screen.getByRole('button', { name: 'Sign In' }));
  
  // Should navigate to dashboard
  expect(await screen.findByText('Dashboard')).toBeInTheDocument();
});
```

## Performance Optimization

### Lazy Loading
```tsx
// components/LazyComponent.tsx
import React, { Suspense } from 'react';

const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

export const LazyLoadedComponent: React.FC = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <HeavyComponent />
  </Suspense>
);
```

### Memoization
```tsx
// hooks/useMemoizedData.ts
import { useMemo } from 'react';

export const useRoleHierarchy = (roles: Role[]) => {
  return useMemo(() => {
    // Expensive computation memoized
    return buildHierarchy(roles);
  }, [roles]);
};
```

## Internationalization

### i18n Setup
```typescript
// i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          "dashboard.title": "Authorization Dashboard",
          "roles.manage": "Manage Roles"
        }
      },
      es: {
        translation: {
          "dashboard.title": "Panel de Autorización",
          "roles.manage": "Gestionar Roles"
        }
      }
    },
    lng: 'en',
    fallbackLng: 'en',
  });

export default i18n;
```

## Deployment

### Build Configuration
```json
// package.json
{
  "scripts": {
    "build": "CI=false react-scripts build",
    "start": "react-scripts start",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
```

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

This completes Phase 1: Architecture & Folder Structure. We've established:

✅ **Enterprise-grade folder structure** with clear service boundaries
✅ **Shared types, constants, and utilities** for consistency
✅ **Detailed service documentation** explaining responsibilities
✅ **Infrastructure blueprints** for database, Redis, and Kubernetes
✅ **SDK and dashboard architecture** for developer experience
✅ **Security-first design principles** throughout

Would you like me to proceed with Phase 2: Database Schema & Migrations?