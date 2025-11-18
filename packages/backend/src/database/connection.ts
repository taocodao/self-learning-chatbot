import { Pool, PoolClient } from 'pg';
import config from '../config';

class Database {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            connectionString: config.database.url,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        this.pool.on('error', (err) => {
            console.error('Unexpected database error:', err);
        });
    }

    public async query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(text, params);
            return result.rows as T[];
        } finally {
            client.release();
        }
    }

    public async getClient(): Promise<PoolClient> {
        return await this.pool.connect();
    }

    public async close(): Promise<void> {
        await this.pool.end();
    }
}

export default new Database();
