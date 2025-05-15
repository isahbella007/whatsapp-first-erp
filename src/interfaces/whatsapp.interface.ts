import { Types } from 'mongoose';

/**
 * WhatsApp session status enum
 */
export enum WhatsAppSessionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONNECTED = 'disconnected',
}

/**
 * WhatsApp message type enum
 */
export enum WhatsAppMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video',
  LOCATION = 'location',
}

/**
 * WhatsApp webhook event type enum
 */
export enum WhatsAppWebhookEventType {
  MESSAGE_SENT = 'message.sent',
  SESSION_STATUS = 'session.status',
  MESSAGES_UPSERT = 'messages.upsert',
}

/**
 * WhatsApp message interface
 */
export interface IWhatsAppMessage {
  id: string;
  from: string;
  to: string;
  type: WhatsAppMessageType;
  content: string | Buffer;
  timestamp: Date;
  sessionId: string;
  metadata?: Record<string, any>;
}

/**
 * WhatsApp webhook event interface
 */
export interface IWhatsAppWebhookEvent {
  type: WhatsAppWebhookEventType;
  data: any;
}

/**
 * WhatsApp session interface
 */
export interface IWhatsAppSession {
  id: string;
  user: Types.ObjectId;
  phone: string;
  name: string;
  status: WhatsAppSessionStatus;
  webhookUrl?: string;
  messageLogging: boolean;
  accountProtection: boolean;
} 