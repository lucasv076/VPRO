-- ============================================================
-- ViewerPulse — RAG & Trenddetectie setup
-- Voer dit uit in de Supabase SQL Editor (in volgorde)
-- De submissions tabel bestaat al — dit voegt alleen toe wat
-- nodig is voor embeddings, RAG-zoeken en trenddetectie.
-- ============================================================

-- FASE 1A: pgvector extensie aanzetten
create extension if not exists vector;

-- FASE 1B: Embedding kolom toevoegen aan bestaande tabel
alter table submissions
  add column if not exists embedding vector(768);

-- FASE 1C: Index voor snelle cosine-zoekopdrachten
create index if not exists idx_submissions_embedding
  on submissions
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

-- FASE 1D: Zoekfunctie (gebruikt door RAG in /api/search)
create or replace function zoek_vergelijkbaar(
  query_embedding vector(768),
  match_count     int  default 5,
  tenant          text default 'vpro'
)
returns table (
  id                uuid,
  samenvatting      text,
  onderwerp         text,
  origineel_bericht text,
  ingediend_op      timestamptz,
  gelijkenis        float
)
language sql stable as $$
  select
    id,
    samenvatting,
    onderwerp,
    origineel_bericht,
    ingediend_op,
    1 - (embedding <=> query_embedding) as gelijkenis
  from submissions
  where tenant_id = tenant
    and is_spam = false
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- FASE 4: Hulpfunctie voor trenddetectie (gebruikt door /api/trends)
create or replace function haal_recente_embeddings(
  uren   int  default 24,
  tenant text default 'vpro'
)
returns table (
  id         uuid,
  samenvatting text,
  onderwerp  text,
  embedding  vector(768)
)
language sql stable as $$
  select id, samenvatting, onderwerp, embedding
  from submissions
  where tenant_id = tenant
    and is_spam = false
    and embedding is not null
    and ingediend_op > now() - (uren || ' hours')::interval
  order by ingediend_op desc;
$$;
