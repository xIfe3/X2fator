import { Global, Module } from '@nestjs/common';

import { UserPermissionsService } from './services/user-permissions.service';

/**
 * Global module for cross-cutting providers every feature module needs
 * without wiring them in one at a time. `PermissionsGuard` is attached
 * via `@UseGuards(PermissionsGuard)` (a class reference) across ~18
 * different modules, so it's resolved from each controller's own
 * module — making UserPermissionsService global means every one of
 * those modules can construct the guard without importing anything.
 */
@Global()
@Module({
  providers: [UserPermissionsService],
  exports: [UserPermissionsService],
})
export class CommonModule {}
