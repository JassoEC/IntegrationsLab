-- Ver el último evento de Stripe y su status
  SELECT id, event_type, status, error, payload->'data'->'object'->>'id' AS session_id
  FROM webhook_events
  WHERE provider = 'stripe'
  ORDER BY created_at DESC
  LIMIT 5;

  -- Ver el último payment y su metadata
  SELECT id, external_id, status, metadata
  FROM payments
  WHERE provider = 'stripe'
  ORDER BY created_at DESC
  LIMIT 5;
