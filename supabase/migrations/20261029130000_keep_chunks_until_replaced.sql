-- Keep a note's chunks until fresh ones replace them, and track which are stale.
--
-- Before: a trigger deleted a note's chunks on every edit, and embed-note wrote
-- new ones. With explicit saves that gap was short. The editor now autosaves
-- while you type and embeds only after a pause, so a note being worked on
-- would drop out of search for most of its editing session.
-- After: chunks stay until replace_note_chunks swaps them. Each chunk records a
-- hash of the text it was made from, so a note whose text has moved on since is
-- reported as stale rather than silently out of date.

-- 1. Hash of the text the chunks came from ------------------------------------
-- One definition, used when writing chunks and when checking them, so the two
-- can't drift apart.

create or replace function public.note_source_hash(p_title text, p_content text)
returns text
language sql
immutable
as $$
  select md5(coalesce(p_title, '') || chr(31) || coalesce(p_content, ''));
$$;

alter table public.note_chunks add column if not exists source_hash text;

-- Chunks that exist now match their note's current text (the old trigger
-- deleted any that didn't), so stamp them with the current hash.
update public.note_chunks c
set source_hash = public.note_source_hash(n.title, n.content)
from public.notes n
where n.id = c.note_id
  and c.source_hash is null;

-- 2. Edits no longer delete chunks ----------------------------------------------

drop trigger if exists notes_invalidate_chunks on public.notes;
drop function if exists public.notes_invalidate_chunks();

-- 3. Atomic replace, now stamping the hash ---------------------------------------
-- Same contract as before: returns false and writes nothing if the note changed
-- while Voyage was working. An empty p_chunks clears the note's chunks (a note
-- whose text was deleted shouldn't keep matching its old text).

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

  insert into public.note_chunks (note_id, user_id, chunk_index, title, content, embedding, source_hash)
  select p_note_id, n.user_id, (c.ord - 1)::int, p_title, c.value->>'content',
         (c.value->'embedding')::text::vector, public.note_source_hash(p_title, p_content)
  from jsonb_array_elements(p_chunks) with ordinality as c(value, ord);

  return true;
end;
$$;

revoke execute on function public.replace_note_chunks(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_note_chunks(uuid, text, text, jsonb) to service_role;

-- 4. Search status ------------------------------------------------------------------
-- Replaces unindexed_note_ids. 'missing' = no chunks, so chat can't see the
-- note; 'stale' = chunks from older text. Notes with no text are skipped: there
-- is nothing to search. Runs as the caller, so RLS limits it to their notes.

drop function if exists public.unindexed_note_ids(uuid);

create or replace function public.note_index_status(p_space_id uuid)
returns table (note_id uuid, status text)
language sql
stable
security invoker
set search_path = public
as $$
  select n.id,
         case when c.source_hash is null then 'missing' else 'stale' end
  from public.notes n
  left join lateral (
    select source_hash from public.note_chunks where note_id = n.id limit 1
  ) c on true
  where n.space_id = p_space_id
    and btrim(n.content) <> ''
    and c.source_hash is distinct from public.note_source_hash(n.title, n.content);
$$;
