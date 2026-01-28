export interface RBACClientConfig {
  baseUrl: string;
  serviceToken: string;
  tenantId: string;
}

export interface AuthorizationRequest {
  principalId: string;
  action: string;
  resource: {
    type: string;
    id: string;
    attributes?: Record<string, any>;
  };
  context?: Record<string, any>;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason: string;
  explanation?: string;
}

export class RBACClient {
  private baseUrl: string;
  private serviceToken: string;
  private tenantId: string;

  constructor(config: RBACClientConfig) {
    this.baseUrl = config.baseUrl;
    this.serviceToken = config.serviceToken;
    this.tenantId = config.tenantId;
  }

  async can(principalId: string, action: string, resource: { type: string; id: string; attributes?: Record<string, any> }): Promise<AuthorizationResult> {
    const request: AuthorizationRequest = {
      principalId,
      action,
      resource,
      context: {}
    };

    const response = await fetch(`${this.baseUrl}/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.serviceToken}`,
        'X-Tenant-ID': this.tenantId
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Authorization request failed: ${response.statusText}`);
    }

    return response.json() as Promise<AuthorizationResult>;
  }

  async batchCan(requests: AuthorizationRequest[]): Promise<AuthorizationResult[]> {
    const response = await fetch(`${this.baseUrl}/batch-authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.serviceToken}`,
        'X-Tenant-ID': this.tenantId
      },
      body: JSON.stringify({ requests })
    });

    if (!response.ok) {
      throw new Error(`Batch authorization request failed: ${response.statusText}`);
    }

    return response.json() as Promise<AuthorizationResult[]>;
  }
}


