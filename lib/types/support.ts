/**
 * Support Ticket Types
 */

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "technical" | "billing" | "feature_request" | "bug" | "other";

export interface SupportTicket {
  ticketId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  orgId: string;
  orgName?: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string; // User ID of support agent/admin
  assignedToName?: string;
  attachments?: Array<{
    url: string;
    filename: string;
    contentType: string;
    size: number;
  }>;
  tags?: string[];
  replies?: TicketReply[];
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  closedAt?: number;
  createdBy: string;
  lastReplyBy?: string;
  lastReplyAt?: number;
}

export interface TicketReply {
  replyId: string;
  ticketId: string;
  userId: string;
  userName?: string;
  userEmail: string;
  isInternal: boolean; // Internal notes visible only to support staff
  message: string;
  attachments?: Array<{
    url: string;
    filename: string;
    contentType: string;
    size: number;
  }>;
  createdAt: number;
  createdBy: string;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  userId?: string;
  orgId?: string;
  assignedTo?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

