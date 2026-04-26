-- Allow deleting shipping addresses even when used by previous orders
-- Existing order rows will keep data, but shipping_address_id will be set to NULL automatically.

DO $$
DECLARE
  fk_record RECORD;
BEGIN
  FOR fk_record IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = cols.attnum
    WHERE con.contype = 'f'
      AND nsp.nspname = 'public'
      AND rel.relname = 'orders'
      AND att.attname = 'shipping_address_id'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', fk_record.conname);
  END LOOP;
END $$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_shipping_address_id_fkey
  FOREIGN KEY (shipping_address_id)
  REFERENCES public.shipping_addresses(id)
  ON DELETE SET NULL;