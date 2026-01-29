/**
 * Database Transaction Manager
 * Provides transaction boundaries for multi-step operations
 */

import { Pool, Client, PoolClient } from 'pg';

export interface TransactionOptions {
  isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  readOnly?: boolean;
}

export class TransactionManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Execute a function within a database transaction
   */
  async executeInTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Set transaction options if provided
      if (options?.isolationLevel) {
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
      }
      
      if (options?.readOnly) {
        await client.query('SET TRANSACTION READ ONLY');
      }
      
      // Execute the provided function within the transaction
      const result = await callback(client);
      
      // Commit the transaction
      await client.query('COMMIT');
      
      return result;
    } catch (error) {
      // Rollback the transaction in case of error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  }

  /**
   * Execute multiple operations within a single transaction
   */
  async executeMultipleInTransaction(
    operations: Array<(client: PoolClient) => Promise<void>>,
    options?: TransactionOptions
  ): Promise<void> {
    await this.executeInTransaction(async (client) => {
      for (const operation of operations) {
        await operation(client);
      }
    }, options);
  }

  /**
   * Execute a read-only query with snapshot isolation
   */
  async executeReadOnlyQuery<T>(
    queryFn: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    return this.executeInTransaction(queryFn, { 
      isolationLevel: 'REPEATABLE READ', 
      readOnly: true 
    });
  }
}