-- One-time cleanup of conversations saved before titles existed.
-- Triggers are disabled so updated_at (sidebar ordering) is preserved.
alter table public.chat_sessions disable trigger chat_sessions_updated_at;

-- Empty rows were created by the old chat pane on open; hide them
update public.chat_sessions
set archived_at = now()
where archived_at is null and jsonb_array_length(messages) = 0;

-- Title = first user message, trimmed
update public.chat_sessions cs
set title = coalesce(nullif(left(regexp_replace(sub.txt, '\s+', ' ', 'g'), 60), ''), 'Untitled conversation')
from (
  select id,
    (select p->>'text'
       from jsonb_array_elements(messages) m, jsonb_array_elements(m->'parts') p
      where m->>'role' = 'user' and p->>'type' = 'text'
      limit 1) as txt
  from public.chat_sessions
  where title is null
) sub
where cs.id = sub.id;

alter table public.chat_sessions enable trigger chat_sessions_updated_at;
