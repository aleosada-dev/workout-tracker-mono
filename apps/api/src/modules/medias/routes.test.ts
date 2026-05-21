import { describe, expect, test } from "bun:test";
import { authHeaders } from "@/test/test-auth";
import { getTestClient } from "@/test/test-client";

describe("POST /api/v1/medias/video-upload-urls", () => {
	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.medias["video-upload-urls"].$post({
			json: { variationId: crypto.randomUUID(), videoContentType: "video/mp4" },
		});

		// The auth middleware's 401 is a runtime response not modeled in the client type.
		expect(res.status as number).toBe(401);
	});

	test("returns 400 when variationId is not a UUID", async () => {
		const client = getTestClient();
		const res = await client.api.v1.medias["video-upload-urls"].$post(
			{ json: { variationId: "not-a-uuid", videoContentType: "video/mp4" } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status as number).toBe(400);
	});

	test("returns 400 when videoContentType is unsupported", async () => {
		const client = getTestClient();
		const res = await client.api.v1.medias["video-upload-urls"].$post(
			{
				json: {
					variationId: crypto.randomUUID(),
					// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
					videoContentType: "video/avi" as any,
				},
			},
			{ headers: authHeaders("athlete") },
		);

		expect(res.status as number).toBe(400);
	});
});
