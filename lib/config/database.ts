import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

// Shared Supabase client
export const supabase: SupabaseClient = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// Database helper functions
export const db = {
    // Examples table (RAG knowledge base)
    examples: () => supabase.from('examples'),

    // Chat logs table
    chatLogs: () => supabase.from('chat_logs'),

    // Vector similarity search
    async matchExamples(
        queryEmbedding: number[],
        matchThreshold: number = 0.75,
        matchCount: number = 5,
        filterLanguage?: string
    ) {
        const { data, error } = await supabase.rpc('match_examples', {
            query_embedding: queryEmbedding,
            match_threshold: matchThreshold,
            match_count: matchCount,
            filter_language: filterLanguage,
        });

        if (error) throw error;
        return data;
    },

    // Increment example usage
    async incrementExampleUsage(exampleId: string) {
        const { error } = await supabase.rpc('increment_example_usage', {
            example_id: exampleId,
        });

        if (error) throw error;
    },
};

export default supabase;
