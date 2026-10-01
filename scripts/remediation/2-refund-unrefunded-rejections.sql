-- WRITES MONEY. Run only after reviewing the output of 1-find-unrefunded-rejections.sql.
-- Refunds every rejected/cancelled withdrawal that has no refund yet AND was never
-- sent to Flutterwave (provider_transfer_id IS NULL). Ones that were sent are
-- skipped on purpose: check them in Flutterwave and handle individually.
--
-- Safe to re-run: a withdrawal that already has a refund row is skipped, and the
-- whole thing is one transaction with the wallet rows locked.
-- Ends with ROLLBACK so the first run is a dry run. Read the output, then change
-- the last line to COMMIT and run again.
BEGIN;

CREATE TEMP TABLE to_refund ON COMMIT DROP AS
SELECT w.id AS withdrawal_id, w.user_id, w.wallet_type, w.amount, w.transaction_reference
FROM withdrawals w
WHERE w.status IN ('rejected', 'cancelled')
  AND w.provider_transfer_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM wallet_transactions t
                  WHERE t.type = 'refund' AND t.direction = 'credit'
                    AND t.metadata->>'withdrawalId' = w.id::text);

-- Lock the affected wallets so no live request can interleave.
SELECT 1 FROM wallets wl JOIN to_refund r
  ON wl.user_id = r.user_id AND wl.type = r.wallet_type FOR UPDATE OF wl;

-- One ledger row per withdrawal, with correct running balances even when one
-- wallet has several unrefunded withdrawals.
WITH ordered AS (
  SELECT r.*, wl.id AS wallet_id, wl.balance AS start_balance,
         sum(r.amount) OVER (PARTITION BY wl.id ORDER BY r.withdrawal_id) AS running
  FROM to_refund r
  JOIN wallets wl ON wl.user_id = r.user_id AND wl.type = r.wallet_type
)
INSERT INTO wallet_transactions
  (wallet_id, type, direction, amount, balance_before, balance_after, reference, description, metadata, status)
SELECT wallet_id, 'refund', 'credit', amount,
       start_balance + running - amount,
       start_balance + running,
       'WDR-REMED-' || substr(md5(withdrawal_id::text), 1, 12),
       'Refund for rejected withdrawal (remediation)',
       jsonb_build_object('withdrawalId', withdrawal_id, 'withdrawalReference', transaction_reference, 'remediation', true),
       'completed'
FROM ordered;

UPDATE wallets wl
SET balance = wl.balance + s.total, updated_at = now()
FROM (SELECT user_id, wallet_type, sum(amount) total FROM to_refund GROUP BY 1, 2) s
WHERE wl.user_id = s.user_id AND wl.type = s.wallet_type;

SELECT count(*) AS refunded_withdrawals, coalesce(sum(amount), 0) AS total_refunded FROM to_refund;

ROLLBACK;  -- change to COMMIT after the dry run looks right
