import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID")!;
const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID")!;
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
const R2_BUCKET = Deno.env.get("R2_BUCKET_NAME")!;
const MAX_READ_CT = 5;
const BATCH = 10;
const VISIBILITY_TIMEOUT_SECONDS = 30;

type QueueMessage = {
  msg_id: number;
  read_ct: number;
  message: { object_key: string; thumbnail_key: string | null };
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function describeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause ? String(err.cause) : undefined,
    };
  }
  return { value: String(err) };
}

async function deleteOne(key: string) {
  console.log("[reap-r2] delete attempt", { bucket: R2_BUCKET, key });
  const res = await s3.send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }),
  );
  console.log("[reap-r2] delete ok", {
    key,
    statusCode: res.$metadata.httpStatusCode,
    requestId: res.$metadata.requestId,
  });
}

async function drainQueue(): Promise<{
  processed: number;
  failed: number;
  archived: number;
  batches: number;
}> {
  let processed = 0;
  let failed = 0;
  let archived = 0;
  let batches = 0;
  console.log("[reap-r2] env check", {
    SUPABASE_URL: !!SUPABASE_URL,
    SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
    R2_ACCOUNT_ID: !!R2_ACCOUNT_ID,
    R2_BUCKET,
    R2_ACCESS_KEY_ID: !!R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: !!R2_SECRET_ACCESS_KEY,
  });
  for (;;) {
    const { data, error } = await supabase.rpc("pgmq_read", {
      queue_name: "r2_deletions",
      vt: VISIBILITY_TIMEOUT_SECONDS,
      qty: BATCH,
    });
    if (error) {
      console.error("[reap-r2] pgmq_read error", error);
      throw new Error(error.message);
    }
    const msgs = (data ?? []) as QueueMessage[];
    console.log("[reap-r2] batch read", {
      batch: batches,
      count: msgs.length,
      sample: msgs[0] ?? null,
    });
    if (msgs.length === 0) break;
    batches++;

    for (const msg of msgs) {
      console.log("[reap-r2] processing", {
        msg_id: msg.msg_id,
        read_ct: msg.read_ct,
        message: msg.message,
      });
      try {
        if (!msg.message?.object_key) {
          throw new Error("missing object_key in message");
        }
        await deleteOne(msg.message.object_key);
        if (msg.message.thumbnail_key) {
          await deleteOne(msg.message.thumbnail_key);
        }
        const { error: delErr } = await supabase.rpc("pgmq_delete", {
          queue_name: "r2_deletions",
          msg_id: msg.msg_id,
        });
        if (delErr) {
          console.error("[reap-r2] pgmq_delete error", {
            msg_id: msg.msg_id,
            error: delErr,
          });
          throw new Error(delErr.message);
        }
        processed++;
        console.log("[reap-r2] processed", { msg_id: msg.msg_id });
      } catch (err) {
        failed++;
        const errInfo = describeError(err);
        if (msg.read_ct >= MAX_READ_CT) {
          const { error: archErr } = await supabase.rpc("pgmq_archive", {
            queue_name: "r2_deletions",
            msg_id: msg.msg_id,
          });
          if (archErr) {
            console.error("[reap-r2] pgmq_archive error", {
              msg_id: msg.msg_id,
              error: archErr,
            });
          }
          archived++;
          console.error("[reap-r2] archived after retries", {
            msg_id: msg.msg_id,
            key: msg.message?.object_key,
            err: errInfo,
          });
        } else {
          console.warn("[reap-r2] deferred", {
            msg_id: msg.msg_id,
            read_ct: msg.read_ct,
            err: errInfo,
          });
        }
      }
    }
  }
  return { processed, failed, archived, batches };
}

Deno.serve(async () => {
  const start = Date.now();
  console.log("[reap-r2] start");
  try {
    const result = await drainQueue();
    console.log("[reap-r2] done", { ...result, ms: Date.now() - start });
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[reap-r2] fatal", describeError(err));
    return new Response(
      JSON.stringify({ ok: false, error: describeError(err) }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
});
