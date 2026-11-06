-- ========================================================================
-- BotFlow AI - Phase 3: pgvector & Document Chunks Migration
-- ========================================================================
-- This migration enables vector storage for BotFlow AI's RAG system,
-- creates the document_chunks table, vector similarity indexes (HNSW),
-- and the match_document_chunks() function for semantic similarity retrieval.
-- ========================================================================

-- 1. Enable the pgvector extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create document_chunks table to store semantic chunk embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    token_count INT DEFAULT 0,
    embedding vector(1536), -- 1536 dimensions for text-embedding-3-small & text-embedding-ada-002
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create relational performance indexes
CREATE INDEX IF NOT EXISTS idx_chunks_chatbot_id ON public.document_chunks(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_chunks_knowledge_source_id ON public.document_chunks(knowledge_source_id);
CREATE INDEX IF NOT EXISTS idx_chunks_created_at ON public.document_chunks(created_at DESC);

-- 4. Create HNSW vector similarity search index for ultra-fast approximate nearest neighbors
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
ON public.document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- 5. Enable Row Level Security (RLS) on document_chunks
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage chunks of their chatbots"
    ON public.document_chunks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.chatbots c
            JOIN public.users u ON u.id = c.user_id
            WHERE c.id = document_chunks.chatbot_id
            AND u.auth_id = auth.uid()
        )
    );

CREATE POLICY "Public chatbot can query chunks for matching chatbot"
    ON public.document_chunks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chatbots c
            WHERE c.id = document_chunks.chatbot_id
            AND c.status = 'active'
        )
    );

-- 6. Similarity Search Matching Function
-- Filters strictly by chatbot_id to prevent cross-tenant data leaks!
CREATE OR REPLACE FUNCTION match_document_chunks (
    query_embedding vector(1536),
    filter_chatbot_id UUID,
    match_threshold float DEFAULT 0.40,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    knowledge_source_id UUID,
    chatbot_id UUID,
    chunk_index INT,
    content TEXT,
    metadata JSONB,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.knowledge_source_id,
        c.chatbot_id,
        c.chunk_index,
        c.content,
        c.metadata,
        1 - (c.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks c
    WHERE c.chatbot_id = filter_chatbot_id
      AND 1 - (c.embedding <=> query_embedding) >= match_threshold
    ORDER BY c.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;
