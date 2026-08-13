import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { db, notifications } from '@2xfactor/database';

@Injectable()
export class NotificationsService {
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
