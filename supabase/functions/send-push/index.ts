import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface NotificationPayload {
  id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

// Canonical source: packages/schemas/src/notification-urls.ts
// Keep in sync — Deno edge functions cannot import monorepo packages directly.
function resolveNotificationUrl(
  type: string,
  recipientUserId: string,
  metadata: Record<string, unknown>,
): string {
  const sessionId = metadata.relationship_id as string | undefined;
  const athleteId = metadata.athlete_id as string | undefined;

  switch (type) {
    case "session_requested":
    case "session_approved":
    case "session_updated":
    case "session_canceled":
    case "session_late_cancellation":
    case "session_deleted":
    case "session_manual_pending":
      if (sessionId && athleteId) {
        // Coach receives: athlete_id is in metadata and recipient is the coach
        if (recipientUserId !== athleteId) {
          return `/coach/athletes/${athleteId}/sessions/${sessionId}`;
        }
        // Athlete receives
        return `/athlete/sessions/${sessionId}`;
      }
      return "/notifications";
    case "coach_invite_sent":
    case "invite_received":
    case "invite_accepted":
      return "/athlete/coach";
    case "dispute_created":
      return "/coach/billing";
    case "testimonial_received":
    case "testimonial_edited":
      return "/coach/profile?tab=testimonials";
    case "periodization_ending_soon": {
      const periodizationId = metadata.periodization_id as string | undefined;
      const periodizationAthleteId = metadata.athlete_id as string | undefined;
      if (periodizationAthleteId && recipientUserId === periodizationAthleteId) {
        return "/athlete/periodization";
      }
      if (periodizationId) {
        return `/periodizations/${periodizationId}`;
      }
      return "/notifications";
    }
    default:
      return "/notifications";
  }
}

function describeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause ? String(err.cause) : undefined,
      ...(err as unknown as Record<string, unknown>),
    };
  }
  return { value: String(err), type: typeof err };
}

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    console.log("[send-push] Received raw body:", rawBody);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error(
        "[send-push] Failed to parse body JSON:",
        describeError(parseErr),
      );
      return new Response("Invalid JSON", { status: 400 });
    }

    const record: NotificationPayload | undefined =
      (body.record as NotificationPayload | undefined) ??
      (body as unknown as NotificationPayload);

    if (!record?.recipient_user_id) {
      console.log("[send-push] No recipient_user_id in payload");
      return new Response("No recipient", { status: 400 });
    }

    console.log("[send-push] Processing notification for user:", record.recipient_user_id, "type:", record.type);
    console.log("[send-push] ENV check — SUPABASE_URL:", SUPABASE_URL ? "set" : "MISSING", "SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING", "VAPID_PUBLIC_KEY:", VAPID_PUBLIC_KEY ? "set" : "MISSING", "VAPID_PRIVATE_KEY:", VAPID_PRIVATE_KEY ? "set" : "MISSING", "VAPID_SUBJECT:", VAPID_SUBJECT ? "set" : "MISSING");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get push subscriptions for recipient
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh_key, auth_key")
      .eq("user_id", record.recipient_user_id)
      .eq("platform", "web");

    if (subError) {
      console.error("[send-push] Error querying subscriptions:", subError);
      return new Response("DB error", { status: 500 });
    }

    console.log("[send-push] Found", subscriptions?.length ?? 0, "subscriptions");

    if (!subscriptions?.length) {
      return new Response("No subscriptions", { status: 200 });
    }

    // 2. Check user preferences — absence = enabled
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("notification_type, enabled")
      .eq("user_id", record.recipient_user_id)
      .eq("notification_type", record.type);

    if (prefError) {
      console.error("[send-push] Error querying preferences:", prefError);
    }

    const pref = preferences?.[0];
    console.log("[send-push] Preference for type", record.type, ":", pref ? `enabled=${pref.enabled}` : "not set (default enabled)");

    if (pref && !pref.enabled) {
      console.log("[send-push] Type disabled by user, skipping");
      return new Response("Type disabled by user", { status: 200 });
    }

    // 3. Resolve target URL based on notification type and metadata
    const url = resolveNotificationUrl(record.type, record.recipient_user_id, record.metadata ?? {});

    // 4. Send push to each subscription
    const payload = JSON.stringify({
      title: record.title,
      message: record.message,
      url,
    });

    console.log("[send-push] Sending payload:", payload);

    const expiredIds: string[] = [];

    await Promise.allSettled(
      (subscriptions as PushSubscriptionRow[]).map(async (sub) => {
        console.log("[send-push] Sending to endpoint:", sub.endpoint.substring(0, 80) + "...");
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key,
            },
          };

          const result = await webpush.sendNotification(
            pushSubscription,
            payload,
            { TTL: 86400 },
          );
          console.log("[send-push] Push sent successfully to:", sub.id, {
            statusCode: (result as { statusCode?: number } | undefined)
              ?.statusCode,
          });
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          const body = (err as { body?: unknown }).body;
          console.error("[send-push] Push error for", sub.id, {
            statusCode,
            body,
            err: describeError(err),
          });

          if (statusCode === 410 || statusCode === 404) {
            console.log("[send-push] Subscription expired, marking for deletion:", sub.id);
            expiredIds.push(sub.id);
          }
        }
      }),
    );

    // 5. Clean up expired subscriptions
    if (expiredIds.length > 0) {
      console.log("[send-push] Deleting", expiredIds.length, "expired subscriptions");
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredIds);
    }

    console.log("[send-push] Done", { expired: expiredIds.length });
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[send-push] Unhandled error:", describeError(error));
    return new Response(
      JSON.stringify({ error: describeError(error) }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
});
