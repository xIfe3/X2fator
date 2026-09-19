import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { db, notifications, users } from '../database';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly auditService: AuditService) {}
  async getMyNotifications(userId: string) {
    return db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)],
    });
  }

  async getMyNotification(userId: string, notificationId: string) {
    const notification = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async getUnreadNotifications(userId: string) {
    return db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
      ),
      orderBy: [desc(notifications.createdAt)],
    });
  }

  async getUnreadCount(userId: string) {
    const unread = await db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
      ),
    });

    return {
      count: unread.length,
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.getMyNotification(userId, notificationId);

    if (notification.isRead) {
      return notification;
    }

    const [updated] = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      )
      .returning();

    return updated;
  }

  // ---- Admin ------------------------------------------------------

  /**
   * Admin: sends an in-app notification to one specific user.
   */
  async sendToUser(
    adminId: string,
    userId: string,
    params: { title: string; message: string; type?: string },
  ) {
    const recipient = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!recipient) {
      throw new NotFoundException('User not found');
    }

    const [created] = await db
      .insert(notifications)
      .values({
        userId,
        title: params.title,
        message: params.message,
        type: (params.type ?? 'general') as (typeof notifications.type.enumValues)[number],
        channel: 'in_app',
      })
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'create',
      entityType: 'user',
      entityId: userId,
      description: `Sent notification "${params.title}" to ${recipient.email}`,
    });

    return created;
  }

  /**
   * Admin: broadcasts an in-app notification to every user on the
   * platform. Returns how many recipients it went out to.
   */
  async broadcast(
    adminId: string,
    params: { title: string; message: string; type?: string },
  ) {
    const allUsers = await db.query.users.findMany({
      columns: { id: true },
    });

    if (allUsers.length === 0) {
      return { sent: 0 };
    }

    await db.insert(notifications).values(
      allUsers.map((u) => ({
        userId: u.id,
        title: params.title,
        message: params.message,
        type: (params.type ?? 'general') as (typeof notifications.type.enumValues)[number],
        channel: 'in_app' as const,
      })),
    );

    await this.auditService.log({
      actorId: adminId,
      action: 'create',
      entityType: 'system',
      description: `Broadcast notification "${params.title}" to ${allUsers.length} users`,
    });

    return { sent: allUsers.length };
  }

  async markAllAsRead(userId: string) {
    const [result] = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      )
      .returning();

    return {
      success: true,
      message: 'All notifications marked as read',
      updated: result ? true : false,
    };
  }
}
