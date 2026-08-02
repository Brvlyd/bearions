-- Enforce maximum 3 shipping addresses per user at database level
CREATE OR REPLACE FUNCTION enforce_shipping_address_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM shipping_addresses
    WHERE user_id = NEW.user_id
  ) >= 3 THEN
    RAISE EXCEPTION 'MAX_ADDRESSES_REACHED';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shipping_address_limit ON shipping_addresses;

CREATE TRIGGER trigger_shipping_address_limit
BEFORE INSERT ON shipping_addresses
FOR EACH ROW
EXECUTE FUNCTION enforce_shipping_address_limit();
