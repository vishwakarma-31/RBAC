import { AuthorizationEngine, AuthorizationRequest } from '../authorization/AuthorizationEngine';

describe('AuthorizationEngine', () => {
  let authEngine: AuthorizationEngine;

  beforeEach(() => {
    authEngine = new AuthorizationEngine();
  });

  it('should be instantiated correctly', () => {
    expect(authEngine).toBeInstanceOf(AuthorizationEngine);
  });

  it('should deny access when request is invalid', async () => {
    // Create a request with the minimum structure but missing required values
    const invalidRequest: AuthorizationRequest = {
      tenantId: '', // Required field with empty value
      principalId: '',
      action: '',
      resource: {
        type: '',
        id: ''
      }
    };

    const result = await authEngine.evaluate(invalidRequest);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Invalid request');
  });

  it('should return a proper authorization response structure', async () => {
    const validRequest: AuthorizationRequest = {
      tenantId: 'tenant-123',
      principalId: 'user-456',
      action: 'read',
      resource: {
        type: 'document',
        id: 'doc-789'
      }
    };

    const result = await authEngine.evaluate(validRequest);
    
    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('explanation');
    expect(result).toHaveProperty('evaluated_at');
    expect(typeof result.allowed).toBe('boolean');
    expect(typeof result.reason).toBe('string');
    expect(result.evaluated_at instanceof Date).toBe(true);
  });
});