-- Indonesian name for a category, mirroring products.name_id.
-- categories.name is treated as the English label; products.category stores
-- that same English name as a plain string (not a foreign key), so the
-- storefront looks up this table by name to translate it. NULL = no
-- Indonesian override yet, fall back to name.
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS name_id TEXT;

COMMENT ON COLUMN categories.name_id IS
  'Category name shown to Indonesian visitors. NULL = no translation yet, fall back to name.';

-- One-time backfill for the categories live on this store today. Safe to
-- re-run; adjust the wording below to taste before running in Supabase SQL
-- Editor. Any category added later (still done directly in Supabase, same as
-- today) can get its name_id set with the same UPDATE pattern.
UPDATE categories SET name_id = 'Topi' WHERE name = 'cap';
UPDATE categories SET name_id = 'Hoodie' WHERE name = 'Hoodie';
UPDATE categories SET name_id = 'Jaket' WHERE name = 'Jacket';
UPDATE categories SET name_id = 'Celana Pendek' WHERE name = 'Shorts';
UPDATE categories SET name_id = 'Kaos' WHERE name = 'T-Shirt';
