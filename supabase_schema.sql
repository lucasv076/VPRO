-- =========================================================
-- ViewerPulse — volledige database schema
-- Versie: 2026-05-12
-- =========================================================
-- Veilig op bestaande database: gebruikt IF NOT EXISTS en
-- ADD COLUMN IF NOT EXISTS overal. Voer dit uit in de
-- Supabase SQL Editor (project → SQL Editor → New query).
-- =========================================================


-- ---------------------------------------------------------
-- TABEL: submissions
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          text        NOT NULL DEFAULT 'vpro',
  naam               text,
  email              text,
  telefoonnummer     text,
  origineel_bericht  text        NOT NULL DEFAULT '',
  volledige_context  text        NOT NULL DEFAULT '',
  is_spam            boolean     NOT NULL DEFAULT false,
  hoofdthema         text,
  type               text        NOT NULL DEFAULT 'overig',
  onderwerp          text        NOT NULL DEFAULT '',
  samenvatting       text        NOT NULL DEFAULT '',
  sentiment          text        NOT NULL DEFAULT 'neutraal',
  prioriteit         integer     NOT NULL DEFAULT 1,
  trefwoorden        text[]      NOT NULL DEFAULT '{}',
  compleetheid_score integer     NOT NULL DEFAULT 1,
  status             text        NOT NULL DEFAULT 'nieuw',
  labels             text[]      NOT NULL DEFAULT '{}',
  ingediend_op       timestamptz NOT NULL DEFAULT now()
);

-- Voeg ontbrekende kolommen toe als de tabel al bestond
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tenant_id          text        NOT NULL DEFAULT 'vpro';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS naam               text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS email              text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS telefoonnummer     text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS origineel_bericht  text        NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS volledige_context  text        NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_spam            boolean     NOT NULL DEFAULT false;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS hoofdthema         text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS type               text        NOT NULL DEFAULT 'overig';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS onderwerp          text        NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS samenvatting       text        NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sentiment          text        NOT NULL DEFAULT 'neutraal';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS prioriteit         integer     NOT NULL DEFAULT 1;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS trefwoorden        text[]      NOT NULL DEFAULT '{}';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS compleetheid_score integer     NOT NULL DEFAULT 1;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS status             text        NOT NULL DEFAULT 'nieuw';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS labels             text[]      NOT NULL DEFAULT '{}';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ingediend_op       timestamptz NOT NULL DEFAULT now();


-- ---------------------------------------------------------
-- TABEL: submission_replies  (chat tussen redactie en kijker)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS submission_replies (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid        NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  bericht       text        NOT NULL,
  van           text        NOT NULL DEFAULT 'redactie',
  verzonden_op  timestamptz NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------
-- INDEXEN  (versnellen filteren en sorteren)
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_submissions_tenant_id    ON submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_ingediend_op ON submissions(ingediend_op DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status       ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_hoofdthema   ON submissions(hoofdthema);
CREATE INDEX IF NOT EXISTS idx_submissions_type         ON submissions(type);
CREATE INDEX IF NOT EXISTS idx_submissions_is_spam      ON submissions(is_spam);
CREATE INDEX IF NOT EXISTS idx_replies_submission_id    ON submission_replies(submission_id);


-- ---------------------------------------------------------
-- ROW LEVEL SECURITY
-- De app gebruikt de service_role key (via supabaseAdmin),
-- die RLS altijd omzeilt. De anon key mag niets lezen.
-- ---------------------------------------------------------
ALTER TABLE submissions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_replies ENABLE ROW LEVEL SECURITY;

-- Verwijder oude policy als die bestaat, dan opnieuw aanmaken
DROP POLICY IF EXISTS "service_role_all" ON submissions;
CREATE POLICY "service_role_all" ON submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all" ON submission_replies;
CREATE POLICY "service_role_all" ON submission_replies
  FOR ALL TO service_role USING (true) WITH CHECK (true);
