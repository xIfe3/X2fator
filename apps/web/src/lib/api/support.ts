import { api } from "../api-client";
import type { SupportMessage, SupportTicket } from "../types";

export const supportApi = {
  createTicket: (dto: { subject: string; message: string; priority?: string }) =>
    api.post<SupportTicket>("/support/tickets", dto),
  myTickets: () => api.get<SupportTicket[]>("/support/tickets"),
  ticket: (id: string) => api.get<SupportTicket>(`/support/tickets/${id}`),
  messages: (id: string) => api.get<SupportMessage[]>(`/support/tickets/${id}/messages`),
  addMessage: (id: string, message: string) =>
    api.post<SupportMessage>(`/support/tickets/${id}/messages`, { message }),
  close: (id: string) => api.patch<SupportTicket>(`/support/tickets/${id}/close`),
};
