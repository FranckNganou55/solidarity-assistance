-- Récupère la vraie date de la demande pour les assistances approuvées avant V3.
UPDATE events e
SET requested_at = r.created_at
FROM assistance_requests r
WHERE r.event_id = e.id;
