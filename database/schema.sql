-- ================================================================
-- HOME SERVICE CHATBOT - SUPABASE DATABASE SCHEMA
-- ================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLE: examples (Q&A knowledge base with vector embeddings)
-- ================================================================
CREATE TABLE IF NOT EXISTS examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  embedding vector(1536),
  source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'perplexity', 'learning')),
  usage_count INTEGER DEFAULT 0,
  success_rate FLOAT DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vector index for fast similarity search
CREATE INDEX IF NOT EXISTS examples_embedding_idx ON examples 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create regular indexes
CREATE INDEX IF NOT EXISTS examples_language_idx ON examples(language);
CREATE INDEX IF NOT EXISTS examples_category_idx ON examples(category);
CREATE INDEX IF NOT EXISTS examples_source_idx ON examples(source);
CREATE INDEX IF NOT EXISTS examples_created_at_idx ON examples(created_at DESC);

-- ================================================================
-- TABLE: chat_logs (conversation history for learning)
-- ================================================================
CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  language VARCHAR(10) NOT NULL,
  confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  examples_used UUID[],
  timestamp TIMESTAMPTZ NOT NULL,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_helpful BOOLEAN,
  feedback_comment TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS chat_logs_session_idx ON chat_logs(session_id);
CREATE INDEX IF NOT EXISTS chat_logs_timestamp_idx ON chat_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS chat_logs_feedback_idx ON chat_logs(feedback_rating) WHERE feedback_rating IS NOT NULL;

-- ================================================================
-- FUNCTION: match_examples (vector similarity search)
-- ================================================================
CREATE OR REPLACE FUNCTION match_examples(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 5,
  filter_language text DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  category VARCHAR(100),
  language VARCHAR(10),
  source VARCHAR(20),
  usage_count INTEGER,
  success_rate FLOAT,
  similarity FLOAT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.question,
    e.answer,
    e.category,
    e.language,
    e.source,
    e.usage_count,
    e.success_rate,
    1 - (e.embedding <=> query_embedding) AS similarity,
    e.created_at,
    e.updated_at
  FROM examples e
  WHERE 
    (filter_language IS NULL OR e.language = filter_language)
    AND (1 - (e.embedding <=> query_embedding)) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ================================================================
-- FUNCTION: increment_example_usage
-- ================================================================
CREATE OR REPLACE FUNCTION increment_example_usage(example_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE examples 
  SET 
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE id = example_id;
END;
$$;

-- ================================================================
-- FUNCTION: update_updated_at_timestamp (trigger function)
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ================================================================
-- TRIGGER: Auto-update updated_at on examples
-- ================================================================
DROP TRIGGER IF EXISTS update_examples_updated_at ON examples;
CREATE TRIGGER update_examples_updated_at 
  BEFORE UPDATE ON examples
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================
ALTER TABLE examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to examples"
  ON examples FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to chat_logs"
  ON chat_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ================================================================
-- SEED DATA: Initial examples
-- ================================================================
INSERT INTO examples (question, answer, category, language, source) VALUES
  (
    'How much does it cost to fix a leaky faucet?',
    'The cost to fix a leaky faucet typically ranges from $150-$300 depending on the type of faucet and severity of the leak. Our standard service call is $99, and that includes diagnosis. Most faucet repairs take 30-60 minutes.',
    'plumbing',
    'en',
    'manual'
  ),
  (
    'Do you offer emergency plumbing services?',
    'Yes! We provide 24/7 emergency plumbing services. For urgent issues like burst pipes, flooding, or sewage backups, call our emergency hotline and we''ll have a technician to you within 2 hours. Emergency service rates start at $199.',
    'plumbing',
    'en',
    'manual'
  ),
  (
    'My AC is not cooling properly, what should I do?',
    'If your AC isn''t cooling, first check your thermostat settings and air filter. If those are fine, you likely need professional service. Our HVAC technicians can diagnose the issue (common causes: low refrigerant, compressor problems, or duct leaks). We offer same-day service appointments.',
    'hvac',
    'en',
    'manual'
  )
ON CONFLICT DO NOTHING;
