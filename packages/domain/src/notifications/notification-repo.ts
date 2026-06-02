export type CreateNotificationInput = {
  recipientUserId: string;
  senderUserId: string | null;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<void>;
}
