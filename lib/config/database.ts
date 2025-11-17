/**
 * Supabase Database Configuration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './environment';
import { logger } from '../utils/logger';

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase configuration');
}

export const supabase: SupabaseClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// Test connection on startup
async function testConnection() {
    try {
        const { error } = await supabase.from('examples').select('count').limit(1);
        if (error) throw error;
        logger.info('✓ Supabase connection established');
    } catch (error) {
        logger.error('✗ Supabase connection failed:', error);
        throw error;
    }
}

testConnection();

export default supabase;
