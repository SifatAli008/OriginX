/**
 * Notification Types
 */

export type NotificationType = "info" | "success" | "warning" | "error" | "alert";
export type NotificationChannel = "in_app" | "email" | "sms" | "push";
export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface Notification {
  notificationId: string;
  userId?: string; // null for broadcast notifications
  orgId?: string; // null for user-specific or global notifications
  type: NotificationType;
  channel: NotificationChannel[];
  title: string;
  message: string;
  link?: string;
  linkText?: string;
  severity?: AlertSeverity;
  read: boolean;
  readAt?: number;
  createdAt: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

export interface Alert {
  alertId: string;
  orgId: string;
  userId?: string; // Alert for specific user
  subject: string;
  message: string;
  severity: AlertSeverity;
  category: "security" | "system" | "product" | "movement" | "verification" | "other";
  status: "active" | "resolved" | "dismissed";
  actionRequired: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  resolvedAt?: number;
  dismissedAt?: number;
  resolvedBy?: string;
  dismissedBy?: string;
}

