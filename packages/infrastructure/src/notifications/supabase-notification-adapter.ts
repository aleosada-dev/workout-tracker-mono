import type { NotificationRepository } from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';
import type { Json } from '../supabase/types';

export function makeSupabaseNotificationRepository(supabase: Supabase): NotificationRepository {
  return {
    async create(input) {
      const { error } = await supabase.from('notifications').insert({
        recipient_user_id: input.recipientUserId,
        sender_user_id: input.senderUserId,
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: (input.metadata ?? {}) as Json,
      });

      if (error) {
        throw supabaseError('Failed to create notification', error);
      }
    },
  };
}
