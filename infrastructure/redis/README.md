# Redis Configuration

High-performance caching layer for authorization decisions and session management.

## Architecture Overview

### Cache Layers
1. **Authorization Decision Cache** - Sub-5ms responses
2. **Role Hierarchy Cache** - Fast role inheritance lookups
3. **Policy Cache** - Policy rule evaluation acceleration
4. **Session Cache** - Active user sessions and tokens

### Multi-Tenancy Implementation
- **Namespace isolation** using tenant prefixes
- **Eviction policies** per tenant
- **Memory quotas** for fair resource allocation
- **Cross-tenant access prevention**

## Configuration

### Redis Instance Setup
```bash
# Primary Redis instance for authorization cache
redis-server --port 6379 --maxmemory 2gb --maxmemory-policy allkeys-lru

# Redis Sentinel for high availability
redis-sentinel /etc/redis/sentinel.conf --port 26379

# Redis Cluster for horizontal scaling (optional)
redis-cli --cluster create host1:7000 host2:7000 host3:7000 --cluster-replicas 1
```

### Connection Configuration
```typescript
// redis-config.ts
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  tls: process.env.REDIS_TLS === 'true',
  
  // Connection pooling
  connectionTimeout: 5000,
  keepAlive: 30000,
  retryAttempts: 10,
  retryDelay: 500,
  
  // Performance tuning
  enableOfflineQueue: false,
  connectTimeout: 10000,
  lazyConnect: true
};
```

## Cache Key Design

### Naming Convention
```
{prefix}:{tenant_id}:{entity_id}:{qualifier}
```

### Authorization Decision Keys
```typescript
// Pattern: authz:{tenant_id}:{principal_id}:{action}:{resource_type}:{resource_id}
const authzKey = `authz:${tenantId}:${principalId}:${action}:${resourceType}:${resourceId}`;

// Example: authz:tenant-123:user-456:delete:invoice:inv-789
```

### Role Hierarchy Keys
```typescript
// Pattern: role-hierarchy:{tenant_id}:{principal_id}
const hierarchyKey = `role-hierarchy:${tenantId}:${principalId}`;

// Pattern: role-permissions:{tenant_id}:{role_id}
const rolePermsKey = `role-permissions:${tenantId}:${roleId}`;
```

### Policy Keys
```typescript
// Pattern: policy:{tenant_id}:{policy_name}:{version}
const policyKey = `policy:${tenantId}:${policyName}:${version}`;

// Pattern: active-policies:{tenant_id}
const activePoliciesKey = `active-policies:${tenantId}`;
```

## Data Structures

### Authorization Decision Cache
```typescript
// Hash structure for rich decision metadata
HSET authz:tenant-123:user-456:delete:invoice:inv-789
  allowed "true"
  reason "Inherited permission from role FinanceAdmin"
  policy_evaluated "invoice-delete-policy-v3"
  evaluated_at "2024-01-01T10:00:00Z"
  ttl 300  // 5 minutes
```

### Role Hierarchy Cache
```typescript
// Set of all roles for a principal (including inherited)
SADD principal-roles:tenant-123:user-456 role-id-1 role-id-2 role-id-3

// Hash mapping role IDs to role names for fast lookup
HSET role-names:tenant-123 role-id-1 "FinanceAdmin" role-id-2 "Viewer"
```

### Permission Cache
```typescript
// Set of all permissions for a role
SADD role-permissions:tenant-123:role-id-1 perm-create perm-read perm-update

// Hash of permission details
HSET permission-details:tenant-123:perm-create
  resource_type "invoice"
  action "create"
  description "Create invoices"
```

### Session Management
```typescript
// User session with expiration
SETEX session:tenant-123:user-456 3600 "{jwt_payload}"

// Active sessions tracking
SADD tenant-sessions:tenant-123 session-id-1 session-id-2
EXPIRE tenant-sessions:tenant-123 3600
```

## Cache Invalidation Strategy

### Event-Driven Invalidation
```typescript
// When role is assigned/revoked
DEL principal-roles:tenant-123:user-456
DEL authz:tenant-123:user-456:*  // Invalidate all decisions

// When permission is granted/revoked
DEL role-permissions:tenant-123:role-id-1
DEL authz:tenant-123:*:*:invoice:*  // Invalidate invoice-related decisions

// When policy is updated
DEL policy:tenant-123:invoice-policy:*
DEL active-policies:tenant-123
```

### Time-Based Invalidation
```typescript
// Configure TTL during cache set operations
SETEX key 300 value  // 5 minute TTL

// Different TTLs for different data types
const TTL_CONFIG = {
  AUTHORIZATION_DECISION: 300,    // 5 minutes
  ROLE_HIERARCHY: 3600,           // 1 hour
  POLICY: 1800,                   // 30 minutes
  SESSION: 3600,                  // 1 hour
  CONFIG: 7200                    // 2 hours
};
```

## Performance Optimization

### Pipeline Operations
```typescript
// Batch multiple operations for better performance
const pipeline = redis.pipeline();
pipeline.hset('authz:key1', 'allowed', 'true');
pipeline.hset('authz:key2', 'allowed', 'false');
pipeline.expire('authz:key1', 300);
const results = await pipeline.exec();
```

### Lua Scripts for Atomic Operations
```lua
-- Atomic cache update with TTL
local key = KEYS[1]
local field = ARGV[1]
local value = ARGV[2]
local ttl = tonumber(ARGV[3])

redis.call('HSET', key, field, value)
redis.call('EXPIRE', key, ttl)
return redis.call('TTL', key)
```

### Memory Optimization
```bash
# Configure Redis memory policies
maxmemory 2gb
maxmemory-policy allkeys-lru
maxmemory-samples 10

# Enable compression for large values
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
```

## High Availability

### Redis Sentinel Configuration
```bash
# sentinel.conf
sentinel monitor mymaster redis-master 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

### Client-side Failover
```typescript
import Redis from 'ioredis';

const redis = new Redis({
  sentinels: [
    { host: 'sentinel1', port: 26379 },
    { host: 'sentinel2', port: 26379 },
    { host: 'sentinel3', port: 26379 }
  ],
  name: 'mymaster',
  retryStrategy: (times) => Math.min(times * 50, 2000)
});
```

## Monitoring & Metrics

### Key Metrics to Track
```bash
# Memory usage
INFO memory

# Hit ratio (critical for performance)
INFO stats | grep keyspace_hits
INFO stats | grep keyspace_misses

# Connection count
INFO clients

# Command statistics
INFO commandstats
```

### Application-Level Metrics
```typescript
// Track cache performance
const metrics = {
  cache: {
    hits: prometheus.Counter(),
    misses: prometheus.Counter(),
    hitRatio: prometheus.Gauge(),
    evictionCount: prometheus.Counter()
  }
};

// Monitor cache operations
export class CacheMetrics {
  static recordHit(key: string) {
    metrics.cache.hits.inc({ cache_key: key });
  }
  
  static recordMiss(key: string) {
    metrics.cache.misses.inc({ cache_key: key });
  }
}
```

## Security Configuration

### Network Security
```bash
# Bind to specific interface
bind 127.0.0.1 10.0.0.1

# Enable authentication
requirepass your-very-secure-password

# Disable dangerous commands
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
```

### Encryption
```bash
# Enable TLS (Redis 6.0+)
tls-port 6380
tls-cert-file /path/to/cert.pem
tls-key-file /path/to/key.pem
tls-ca-cert-file /path/to/ca.pem
```

## Backup & Recovery

### RDB Snapshots
```bash
# Save configuration
save 900 1      # 1 change in 15 minutes
save 300 10     # 10 changes in 5 minutes
save 60 10000   # 10000 changes in 1 minute

# Disable RDB for pure cache usage
save ""
```

### AOF (Append Only File)
```bash
appendonly yes
appendfsync everysec  # Balance between performance and durability
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

## Testing Strategy

### Cache Behavior Tests
```typescript
describe('Authorization Cache', () => {
  it('should cache authorization decisions', async () => {
    // Test cache hit/miss behavior
    // Test TTL expiration
    // Test invalidation on updates
  });
  
  it('should maintain tenant isolation', async () => {
    // Test cross-tenant data access prevention
    // Test namespace collision prevention
  });
});
```

### Performance Tests
```typescript
// Benchmark cache operations
const benchmark = async () => {
  const start = Date.now();
  for(let i = 0; i < 10000; i++) {
    await redis.get(`test:key:${i}`);
  }
  const duration = Date.now() - start;
  console.log(`Average: ${duration/10000}ms per operation`);
};
```