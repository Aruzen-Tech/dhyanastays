-- Double-booking prevention: DB-level trigger ensures no two confirmed bookings
-- overlap on the same listing. This is a safety net beyond the application-level
-- hold system — catches race conditions that slip past row locks.

CREATE OR REPLACE FUNCTION prevent_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE', 'PAYMENT_PENDING') THEN
    IF EXISTS (
      SELECT 1 FROM "Booking"
      WHERE "listingId" = NEW."listingId"
        AND id != NEW.id
        AND status IN ('CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE', 'PAYMENT_PENDING')
        AND tsrange("startsAt", "endsAt") && tsrange(NEW."startsAt", NEW."endsAt")
    ) THEN
      RAISE EXCEPTION 'Double booking detected for listing % between % and %',
        NEW."listingId", NEW."startsAt", NEW."endsAt";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_booking_overlap
  BEFORE INSERT OR UPDATE ON "Booking"
  FOR EACH ROW EXECUTE FUNCTION prevent_booking_overlap();


-- Ledger immutability: LedgerEvent rows must never be modified or deleted.
-- Financial audit trail integrity depends on this constraint.

CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'LedgerEvent rows are immutable — updates and deletes are forbidden';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_no_update
  BEFORE UPDATE ON "LedgerEvent"
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE TRIGGER trg_ledger_no_delete
  BEFORE DELETE ON "LedgerEvent"
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
