import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { db, supportMessages, supportTickets } from '../database';

@Injectable()
export class SupportService {
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
}
