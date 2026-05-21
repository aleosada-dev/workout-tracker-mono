import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import { VideoUploadUrlsRequestSchema, VideoUploadUrlsResponseSchema } from "./schemas";

export const mediasRouter = new Hono<AppBindings>().post(
	"/video-upload-urls",
	describeRoute({
		summary: "Create presigned upload URLs for a video",
		tags: ["Medias"],
		responses: {
			200: {
				description: "OK",
				content: {
					"application/json": {
						schema: resolver(VideoUploadUrlsResponseSchema),
					},
				},
			},
			400: { description: "Invalid input" },
			401: { description: "Unauthorized" },
		},
	}),
	validator("json", VideoUploadUrlsRequestSchema),
	async (c) => {
		const userId = c.get("userId");
		const { variationId, videoContentType } = c.req.valid("json");
		const { buildUploadUrls } = c.get("container").videoUploads;
		const result = await buildUploadUrls({ userId, variationId, videoContentType });
		return c.json(result);
	},
);
