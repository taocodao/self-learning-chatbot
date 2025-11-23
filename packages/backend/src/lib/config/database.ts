import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}

// Shared Supabase client - ONLY for backend use
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

// Database helper functions for self-learning chatbot
export const db = {
    // Examples table (RAG knowledge base)
    examples: () => supabase.from('examples'),

    // Chat logs table
    chatLogs: () => supabase.from('chat_logs'),

    // User sessions table
    userSessions: () => supabase.from('user_sessions'),

    // Conversations table
    conversations: () => supabase.from('conversations'),

    // Bookings table
    bookings: () => supabase.from('bookings'),

    // Video uploads table
    videoUploads: () => supabase.from('video_uploads'),

    // Businesses table
    businesses: () => supabase.from('businesses'),

    /**
     * Vector similarity search for self-learning
     * Finds similar examples based on embedding
     */
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
            filter_language: filterLanguage || null,
        });

        if (error) throw error;
        return data || [];
    },

    /**
     * Increment usage count for learning
     * Tracks which examples are most helpful
     */
    async incrementExampleUsage(exampleId: string) {
        const { error } = await supabase.rpc('increment_example_usage', {
            example_id: exampleId,
        });

        if (error) throw error;
    },

    /**
     * Update example success rate based on feedback
     */
    async updateExampleSuccessRate(exampleId: string, wasHelpful: boolean) {
        const { data: example, error: fetchError } = await supabase
            .from('examples')
            .select('usage_count, success_rate')
            .eq('id', exampleId)
            .single();

        if (fetchError) throw fetchError;

        const totalFeedback = example.usage_count;
        const currentSuccessCount = Math.round(example.success_rate * totalFeedback);
        const newSuccessCount = currentSuccessCount + (wasHelpful ? 1 : 0);
        const newSuccessRate = totalFeedback > 0 ? newSuccessCount / totalFeedback : 0.5;

        const { error: updateError } = await supabase
            .from('examples')
            .update({ success_rate: newSuccessRate })
            .eq('id', exampleId);

        if (updateError) throw updateError;
    },
};

export default supabase;
