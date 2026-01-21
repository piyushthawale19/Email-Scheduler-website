// API Types - matching backend types

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  createdAt: string;
}

export interface Sender {
  id: string;
  email: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

export type EmailStatus =
  | "SCHEDULED"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "RATE_LIMITED";

export interface EmailAttachment {
  name: string;
  size: number;
  type: string;
  preview?: string;
}

export interface EmailMetadata {
  attachments?: EmailAttachment[];
  [key: string]: unknown;
}

export interface Email {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  errorMessage: string | null;
  previewUrl: string | null;
  sender: Sender | null;
  createdAt: string;
  isStarred?: boolean;
  metadata?: EmailMetadata | null;
  attachments?: Array<{ filename: string; size: number; mimetype: string; path: string; preview?: string }> | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ScheduleEmailRequest {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  senderId?: string;
}

export interface EmailStats {
  scheduled: number;
  processing: number;
  sent: number;
  failed: number;
  rateLimited: number;
  total: number;
}

// UI Types
export interface ScheduleFormData {
  subject: string;
  body: string;
  recipients: string[];
  selectedSenderId?: string;
  startTime: Date;
  delayBetweenEmails: number;
  hourlyLimit: number;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}
