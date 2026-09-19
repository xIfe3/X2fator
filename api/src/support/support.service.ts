import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { db, supportMessages, supportTickets, users } from '../database';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SupportService {
  constructor(private readonly auditService: AuditService) {}
  async createTicket(
    userId: string,
    params: {
      subject: string;
      message: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    },
  ) {
    if (!params.subject.trim()) {
      throw new BadRequestException('Subject is required');
    }

    if (!params.message.trim()) {
      throw new BadRequestException('Message is required');
    }

    return db.transaction(async (tx) => {
      const [ticket] = await tx
        .insert(supportTickets)
        .values({
          userId,
          subject: params.subject.trim(),
          priority: params.priority ?? 'medium',
          status: 'open',
        })
        .returning();

      await tx.insert(supportMessages).values({
        ticketId: ticket.id,
        senderId: userId,
        message: params.message.trim(),
      });

      return ticket;
    });
  }

  async getMyTickets(userId: string) {
    return db.query.supportTickets.findMany({
      where: eq(supportTickets.userId, userId),
      orderBy: [desc(supportTickets.createdAt)],
    });
  }

  async getMyTicket(userId: string, ticketId: string) {
    const ticket = await db.query.supportTickets.findFirst({
      where: and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.userId, userId),
      ),
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return ticket;
  }

  async getTicketMessages(userId: string, ticketId: string) {
    await this.getMyTicket(userId, ticketId);

    return db.query.supportMessages.findMany({
      where: eq(supportMessages.ticketId, ticketId),
      orderBy: [desc(supportMessages.createdAt)],
    });
  }

  async addMessage(userId: string, ticketId: string, message: string) {
    const ticket = await this.getMyTicket(userId, ticketId);

    if (ticket.status === 'closed') {
      throw new BadRequestException('Cannot reply to a closed ticket');
    }

    if (!message.trim()) {
      throw new BadRequestException('Message is required');
    }

    const [createdMessage] = await db
      .insert(supportMessages)
      .values({
        ticketId,
        senderId: userId,
        message: message.trim(),
      })
      .returning();

    if (ticket.status === 'resolved') {
      await db
        .update(supportTickets)
        .set({
          status: 'open',
          resolvedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, ticketId));
    } else {
      await db
        .update(supportTickets)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, ticketId));
    }

    return createdMessage;
  }

  async closeTicket(userId: string, ticketId: string) {
    const ticket = await this.getMyTicket(userId, ticketId);

    if (ticket.status === 'closed') {
      throw new BadRequestException('Ticket is already closed');
    }

    const [updatedTicket] = await db
      .update(supportTickets)
      .set({
        status: 'closed',
        updatedAt: new Date(),
        resolvedAt: ticket.resolvedAt ?? new Date(),
      })
      .where(
        and(eq(supportTickets.id, ticketId), eq(supportTickets.userId, userId)),
      )
      .returning();

    return updatedTicket;
  }

  // ---- Admin ------------------------------------------------------

  /**
   * Admin: every ticket, most recently updated first, with the
   * requester's name/email and (if assigned) the assigned staff
   * member's name attached — the support queue.
   */
  async getAllTickets(filters?: { status?: string; priority?: string }) {
    const conditions = [
      filters?.status
        ? eq(
            supportTickets.status,
            filters.status as (typeof supportTickets.status.enumValues)[number],
          )
        : undefined,
      filters?.priority
        ? eq(
            supportTickets.priority,
            filters.priority as (typeof supportTickets.priority.enumValues)[number],
          )
        : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const rows = await db
      .select({
        ticket: supportTickets,
        requesterFirstName: users.firstName,
        requesterLastName: users.lastName,
        requesterEmail: users.email,
      })
      .from(supportTickets)
      .innerJoin(users, eq(users.id, supportTickets.userId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(supportTickets.updatedAt));

    return rows.map((r) => ({
      ...r.ticket,
      requesterFirstName: r.requesterFirstName,
      requesterLastName: r.requesterLastName,
      requesterEmail: r.requesterEmail,
    }));
  }

  private async getTicketRecord(ticketId: string) {
    const ticket = await db.query.supportTickets.findFirst({
      where: eq(supportTickets.id, ticketId),
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return ticket;
  }

  /**
   * Admin: one ticket with its requester and full message history.
   */
  async getTicketForAdmin(ticketId: string) {
    const ticket = await this.getTicketRecord(ticketId);

    const requester = await db.query.users.findFirst({
      where: eq(users.id, ticket.userId),
    });

    const messages = await db.query.supportMessages.findMany({
      where: eq(supportMessages.ticketId, ticketId),
      orderBy: [supportMessages.createdAt],
    });

    return {
      ...ticket,
      requester: requester
        ? {
            id: requester.id,
            name: `${requester.firstName} ${requester.lastName}`.trim(),
            email: requester.email,
          }
        : null,
      messages,
    };
  }

  async assignTicket(adminId: string, ticketId: string, staffId: string | null) {
    const ticket = await this.getTicketRecord(ticketId);

    const [updated] = await db
      .update(supportTickets)
      .set({ assignedTo: staffId, updatedAt: new Date() })
      .where(eq(supportTickets.id, ticketId))
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'update',
      entityType: 'system',
      entityId: ticketId,
      description: staffId
        ? `Assigned support ticket "${ticket.subject}"`
        : `Unassigned support ticket "${ticket.subject}"`,
      oldValues: { assignedTo: ticket.assignedTo },
      newValues: { assignedTo: staffId },
    });

    return updated;
  }

  async setTicketPriority(
    adminId: string,
    ticketId: string,
    priority: 'low' | 'medium' | 'high' | 'urgent',
  ) {
    const ticket = await this.getTicketRecord(ticketId);

    const [updated] = await db
      .update(supportTickets)
      .set({ priority, updatedAt: new Date() })
      .where(eq(supportTickets.id, ticketId))
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'update',
      entityType: 'system',
      entityId: ticketId,
      description: `Changed priority for support ticket "${ticket.subject}"`,
      oldValues: { priority: ticket.priority },
      newValues: { priority },
    });

    return updated;
  }

  async adminReply(adminId: string, ticketId: string, message: string) {
    const ticket = await this.getTicketRecord(ticketId);

    if (ticket.status === 'closed') {
      throw new BadRequestException('Cannot reply to a closed ticket');
    }

    if (!message.trim()) {
      throw new BadRequestException('Message is required');
    }

    const [createdMessage] = await db
      .insert(supportMessages)
      .values({ ticketId, senderId: adminId, message: message.trim() })
      .returning();

    await db
      .update(supportTickets)
      .set({
        status: ticket.status === 'open' ? 'in_progress' : ticket.status,
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, ticketId));

    return createdMessage;
  }

  async resolveTicket(adminId: string, ticketId: string) {
    const ticket = await this.getTicketRecord(ticketId);

    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      throw new BadRequestException('Ticket is already finalized');
    }

    const [updated] = await db
      .update(supportTickets)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'update',
      entityType: 'system',
      entityId: ticketId,
      description: `Resolved support ticket "${ticket.subject}"`,
      oldValues: { status: ticket.status },
      newValues: { status: 'resolved' },
    });

    return updated;
  }

  async adminCloseTicket(adminId: string, ticketId: string) {
    const ticket = await this.getTicketRecord(ticketId);

    if (ticket.status === 'closed') {
      throw new BadRequestException('Ticket is already closed');
    }

    const [updated] = await db
      .update(supportTickets)
      .set({
        status: 'closed',
        updatedAt: new Date(),
        resolvedAt: ticket.resolvedAt ?? new Date(),
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();

    await this.auditService.log({
      actorId: adminId,
      action: 'update',
      entityType: 'system',
      entityId: ticketId,
      description: `Closed support ticket "${ticket.subject}"`,
      oldValues: { status: ticket.status },
      newValues: { status: 'closed' },
    });

    return updated;
  }
}
