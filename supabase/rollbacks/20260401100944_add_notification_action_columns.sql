-- Revert guard trigger to original
CREATE OR REPLACE FUNCTION public.guard_notification_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.recipient_user_id <> OLD.recipient_user_id
     OR NEW.sender_user_id IS DISTINCT FROM OLD.sender_user_id
     OR NEW.type <> OLD.type
     OR NEW.title <> OLD.title
     OR NEW.message <> OLD.message
     OR NEW.metadata <> OLD.metadata
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Only read state can be updated';
  END IF;

  IF NEW.is_read THEN
    NEW.read_at = COALESCE(NEW.read_at, now());
  ELSE
    NEW.read_at = NULL;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Rename table back
ALTER TABLE public.notification_preferences RENAME TO push_notification_preferences;

-- Drop new columns
ALTER TABLE public.notifications
  DROP COLUMN action_taken_at,
  DROP COLUMN action_taken;
