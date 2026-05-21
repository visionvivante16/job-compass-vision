UPDATE public.jsearch_ingest_runs 
SET status='failed', completed_at=now(), 
    errors='[{"error":"Edge function timed out at 150s gateway limit before background task pattern was deployed"}]'::jsonb
WHERE id='9d611312-a09c-4b44-b63c-f190cf9bcc57' AND status='running';