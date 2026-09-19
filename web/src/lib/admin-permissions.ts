// Maps each admin route to the permission that gates it, mirroring the
// @RequirePermission(...) decorators on the corresponding API
// controllers. Used to filter the sidebar and gate page access so a
// custom staff role only ever sees what it can actually do — keep this
// in sync whenever a controller's permission requirement changes.
//
// A route with no entry here (e.g. "/admin" itself) is visible to any
// staff member (anyone holding a role beyond the default "user" role).
export const ADMIN_ROUTE_PERMISSIONS: Record<string, string> = {
  "/admin/deposits": "deposits.read",
  "/admin/users": "users.read",
  "/admin/withdrawals": "withdrawals.read",
  "/admin/wallets": "users.read",
  "/admin/payments": "payments.read",
  "/admin/tasks": "tasks.manage",
  "/admin/tasks/submissions": "tasks.review",
  "/admin/checkin": "bonuses.manage",
  "/admin/plans": "plans.manage",
  "/admin/subscriptions": "subscriptions.read",
  "/admin/ads": "ads.manage",
  "/admin/referrals": "referrals.read",
  "/admin/support": "support.read",
  "/admin/notifications": "notifications.send",
  "/admin/site-content": "site_content.manage",
  "/admin/roles": "roles.manage",
  "/admin/audit": "audit.read",
};

/**
 * The permission required to view a given admin route, matched by
 * longest prefix (so `/admin/support/abc123` resolves to the same
 * permission as `/admin/support`). Returns null for routes any staff
 * member may view (no specific permission gate).
 */
export function permissionForRoute(pathname: string): string | null {
  let best: string | null = null;
  let bestLength = -1;

  for (const [route, permission] of Object.entries(ADMIN_ROUTE_PERMISSIONS)) {
    if (
      (pathname === route || pathname.startsWith(`${route}/`)) &&
      route.length > bestLength
    ) {
      best = permission;
      bestLength = route.length;
    }
  }

  return best;
}
