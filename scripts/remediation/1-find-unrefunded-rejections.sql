-- READ-ONLY. Lists rejected/cancelled withdrawals whose debit was never refunded.
-- Cause: admin "Reject" button (PATCH /admin/withdrawals/:id/reject) before the fix
-- on branch fix/withdrawal-refunds-and-wallet-locking.
--
-- CHECK `provider_transfer_id` BEFORE REFUNDING: if it is set, the payout was sent
-- to Flutterwave. Confirm in the Flutterwave dashboard whether that transfer
-- succeeded. If it did, the user was paid and is NOT owed a refund.
SELECT
  w.id                    AS withdrawal_id,
  u.email,
  u.first_name || ' ' || u.last_name AS name,
  w.wallet_type,
  w.amount                AS owed,
  w.status,
  w.provider_transfer_id,
  w.rejection_reason,
  w.created_at            AS requested_at,
  w.processed_at          AS rejected_at
FROM withdrawals w
JOIN users u ON u.id = w.user_id
WHERE w.status IN ('rejected', 'cancelled')
  AND NOT EXISTS (
    SELECT 1 FROM wallet_transactions t
    WHERE t.type = 'refund'
      AND t.direction = 'credit'
      AND t.metadata->>'withdrawalId' = w.id::text
  )
ORDER BY w.processed_at;

-- Totals
SELECT count(*) AS withdrawals, sum(w.amount) AS total_owed,
       count(*) FILTER (WHERE w.provider_transfer_id IS NOT NULL) AS need_flutterwave_check
FROM withdrawals w
WHERE w.status IN ('rejected', 'cancelled')
  AND NOT EXISTS (SELECT 1 FROM wallet_transactions t
                  WHERE t.type = 'refund' AND t.direction = 'credit'
                    AND t.metadata->>'withdrawalId' = w.id::text);
