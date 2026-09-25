-- Referral rows used to be created at signup, before payment. Remove the
-- ones whose referred user never paid (still `pending`) and earned nothing,
-- so unpaid signups stop showing in referrers' lists. If that person pays
-- later, the row is recreated at payment time.
DELETE FROM "referrals"
WHERE "total_commission" = 0
  AND "referred_user_id" IN (SELECT "id" FROM "users" WHERE "status" = 'pending');
