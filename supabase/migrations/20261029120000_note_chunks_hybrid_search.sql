-- Chunked embeddings + full-text search, combined with reciprocal rank fusion.
--
-- Before: one voyage-3-lite vector per note (notes.embedding), so a long note's
-- vector blurred every topic in it, and exact words (names, acronyms, error
-- codes) were only found if the embedding happened to capture them.
-- After: each note is split into overlapping chunks; each chunk has a vector
-- and a tsvector, and match_note_chunks ranks by both.
--
-- notes.embedding and match_notes are left in place (unused) so this can be
-- rolled back by redeploying the old functions. Drop them in a later migration.

-- 1. Chunks ------------------------------------------------------------------

create table if not exists public.note_chunks (
  id          bigint generated always as identity primary key,
  note_id     uuid not null references public.notes(id) on delete cascade,
  user_id     uuid not null,
  chunk_index int  not null,
  -- Title is copied in so keyword search hits on it; a title change re-chunks.
  title       text not null default '',
  content     text not null,
  embedding   vector(512) not null,
  fts         tsvector generated always as (
                setweight(to_tsvector('english'::regconfig, title), 'A') ||
                setweight(to_tsvector('english'::regconfig, content), 'B')
              ) stored,
  unique (note_id, chunk_index)
);

create index if not exists note_chunks_embedding_idx
  on public.note_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists note_chunks_fts_idx
  on public.note_chunks using gin (fts);
create index if not exists note_chunks_note_id_idx
  on public.note_chunks (note_id);

-- Users can read their own chunks; only the service role (embed-note) writes.
alter table public.note_chunks enable row level security;

drop policy if exists "Users can read their own chunks" on public.note_chunks;
create policy "Users can read their own chunks"
  on public.note_chunks for select
  to authenticated
  using (user_id = auth.uid());

-- 2. Carry over existing vectors -----------------------------------------------
-- Each already-embedded note becomes a single chunk with its current vector
-- (which was made from "title\ncontent", same model), so search keeps working
-- straight after the migration. The note is split properly the next time it is
-- edited or re-indexed.

insert into public.note_chunks (note_id, user_id, chunk_index, title, content, embedding)
select id, user_id, 0, coalesce(title, ''), content, embedding
from public.notes
where embedding is not null
on conflict (note_id, chunk_index) do nothing;

-- 3. Edits make chunks stale -------------------------------------------------
-- Drop a note's chunks as soon as its text changes, so search never matches
-- text that is gone. embed-note writes fresh ones.

create or replace function public.notes_invalidate_chunks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.title is distinct from old.title or new.content is distinct from old.content then
    delete from public.note_chunks where note_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists notes_invalidate_chunks on public.notes;
create trigger notes_invalidate_chunks
  after update of title, content on public.notes
  for each row execute function public.notes_invalidate_chunks();

-- 4. Atomic replace, used by embed-note ---------------------------------------
-- Swaps all chunks for a note in one transaction. p_title / p_content are the
-- text the chunks were made from: if the note changed while Voyage was working,
-- nothing is written and the function returns false (the newer save has its own
-- embed call on the way).

create or replace function public.replace_note_chunks(
  p_note_id uuid,
  p_title   text,
  p_content text,
  p_chunks  jsonb  -- [{ "content": text, "embedding": [float, ...] }, ...]
)
returns boolean
language plpgsql
set search_path = public, extensions
as $$
declare
  n public.notes;
begin
  select * into n from public.notes where id = p_note_id for update;
  if not found
     or coalesce(n.title, '') is distinct from p_title
     or n.content is distinct from p_content then
    return false;
  end if;

  delete from public.note_chunks where note_id = p_note_id;

  insert into public.note_chunks (note_id, user_id, chunk_index, title, content, embedding)
  select p_note_id, n.user_id, (c.ord - 1)::int, p_title, c.value->>'content', (c.value->'embedding')::text::vector
  from jsonb_array_elements(p_chunks) with ordinality as c(value, ord);

  return true;
end;
$$;

revoke execute on function public.replace_note_chunks(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_note_chunks(uuid, text, text, jsonb) to service_role;

-- 5. Search status -------------------------------------------------------------
-- Notes in a space with no chunks = not searchable. Runs as the caller, so RLS
-- limits it to their own notes.

create or replace function public.unindexed_note_ids(p_space_id uuid)
returns setof uuid
language sql
stable
security invoker
set search_path = public
as $$
  select n.id
  from public.notes n
  where n.space_id = p_space_id
    and not exists (select 1 from public.note_chunks c where c.note_id = n.id);
$$;

-- 6. Hybrid search ---------------------------------------------------------------
-- Takes the top candidates from vector search (above min_similarity) and from
-- keyword search, and merges them with reciprocal rank fusion:
-- score = 1/(k + semantic_rank) + 1/(k + keyword_rank). A chunk that ranks well
-- in both lists wins; a chunk found by only one still gets in.
-- Keyword terms are OR'ed (a question's words rarely all appear in one chunk);
-- ts_rank_cd rewards chunks that have more of them, closer together.

create or replace function public.match_note_chunks(
  query_embedding vector(512),
  query_text      text,
  match_space_id  uuid,
  match_count     int   default 8,
  min_similarity  float default 0.3,
  rrf_k           int   default 50
)
returns table (
  chunk_id    bigint,
  note_id     uuid,
  title       text,
  content     text,
  similarity  float,
  score       float
)
language sql
stable
set search_path = public, extensions
as $$
  with scoped as (
    select c.*
    from public.note_chunks c
    join public.notes n on n.id = c.note_id
    where n.space_id = match_space_id
  ),
  semantic as (
    select s.id,
           row_number() over (order by s.embedding <=> query_embedding) as rank
    from scoped s
    where 1 - (s.embedding <=> query_embedding) >= min_similarity
    order by s.embedding <=> query_embedding
    limit match_count * 2
  ),
  q as (
    -- Quote each lexeme so tokens from URLs or code can't break tsquery syntax.
    select to_tsquery('english', array_to_string(array(
             select quote_literal(l)
             from unnest(tsvector_to_array(to_tsvector('english', query_text))) as l
           ), ' | ')) as query
  ),
  keyword as (
    select s.id,
           row_number() over (order by ts_rank_cd(s.fts, q.query) desc) as rank
    from scoped s, q
    where s.fts @@ q.query
    order by ts_rank_cd(s.fts, q.query) desc
    limit match_count * 2
  )
  select c.id,
         c.note_id,
         c.title,
         c.content,
         1 - (c.embedding <=> query_embedding) as similarity,
         coalesce(1.0 / (rrf_k + sem.rank), 0.0) + coalesce(1.0 / (rrf_k + kw.rank), 0.0) as score
  from semantic sem
  full outer join keyword kw on kw.id = sem.id
  join public.note_chunks c on c.id = coalesce(sem.id, kw.id)
  order by score desc
  limit match_count;
$$;
