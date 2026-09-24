INSERT INTO "permissions" ("name", "description")
VALUES ('flutterwave.balance', 'View the live Flutterwave balance (requires re-entering password)')
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r, "permissions" p
WHERE r."name" = 'admin'
  AND p."name" = 'flutterwave.balance'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id"
  );
