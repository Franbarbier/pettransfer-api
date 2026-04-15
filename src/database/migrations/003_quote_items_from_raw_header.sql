-- Rellena quote_items (y quote_item_details) desde quotes.raw_header_json->'items'.
-- Requiere 001_quotes.sql y 002_quotes_related_tables.sql aplicados.
-- Idempotente: ON CONFLICT DO NOTHING.

INSERT INTO quote_items (
  quote_item_id,
  quote_id,
  item_number,
  display_order,
  item_name_raw,
  item_catalog_id,
  item_display_name,
  price_raw,
  price_amount,
  currency,
  inline_note,
  is_zero_priced
)
SELECT
  item->>'quote_item_id',
  q.import_key,
  CASE
    WHEN trim(coalesce(item->>'item_number', '')) = '' THEN NULL
    ELSE (item->>'item_number')::integer
  END,
  COALESCE(
    (item->>'display_order')::integer,
    arr.ord::integer
  ),
  coalesce(item->>'item_name_raw', ''),
  coalesce(item->>'item_catalog_id', ''),
  coalesce(item->>'item_display_name', ''),
  coalesce(item->>'price_raw', ''),
  (item->>'price_amount')::numeric,
  coalesce(item->>'currency', ''),
  CASE
    WHEN trim(coalesce(item->>'inline_note', '')) = '' THEN NULL
    ELSE item->>'inline_note'
  END,
  coalesce((item->>'is_zero_priced')::boolean, false)
FROM quotes q
CROSS JOIN LATERAL jsonb_array_elements(
  coalesce(q.raw_header_json->'items', '[]'::jsonb)
) WITH ORDINALITY AS arr(item, ord)
WHERE q.raw_header_json IS NOT NULL
  AND jsonb_typeof(coalesce(q.raw_header_json->'items', '[]'::jsonb)) = 'array'
  AND trim(coalesce(item->>'quote_item_id', '')) <> ''
ON CONFLICT (quote_item_id) DO NOTHING;

INSERT INTO quote_item_details (
  quote_item_detail_id,
  quote_item_id,
  quote_id,
  detail_order,
  detail_text
)
SELECT
  (item->>'quote_item_id') || '-D' || lpad(detail.ord::text, 4, '0'),
  item->>'quote_item_id',
  q.import_key,
  detail.ord::integer,
  detail.detail_text
FROM quotes q
CROSS JOIN LATERAL jsonb_array_elements(
  coalesce(q.raw_header_json->'items', '[]'::jsonb)
) AS arr(item)
CROSS JOIN LATERAL jsonb_array_elements_text(
  coalesce(item->'details', '[]'::jsonb)
) WITH ORDINALITY AS detail(detail_text, ord)
WHERE q.raw_header_json IS NOT NULL
  AND trim(coalesce(item->>'quote_item_id', '')) <> ''
  AND trim(detail.detail_text) <> ''
ON CONFLICT (quote_item_detail_id) DO NOTHING;
