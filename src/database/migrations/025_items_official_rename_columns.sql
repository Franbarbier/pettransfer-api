ALTER TABLE items_official RENAME COLUMN tipo TO operation_type;
ALTER TABLE items_official RENAME COLUMN aeropuerto TO airport;
ALTER TABLE items_official RENAME COLUMN pais TO country;
ALTER TABLE items_official RENAME COLUMN precio TO price_ref;
ALTER TABLE items_official RENAME COLUMN notas TO notes;
