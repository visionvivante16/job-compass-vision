UPDATE public.jsearch_ingest_runs 
SET status='failed', completed_at=now(), 
    errors='[{"error":"Run orphaned — no edge function logs, function never executed processing loop"}]'::jsonb
WHERE id='72f4eba2-1c3a-491d-a1cc-c500ae1b700c' AND status='running';