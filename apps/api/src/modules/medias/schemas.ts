import { VIDEO_CONTENT_TYPES } from "@workout-tracker/domain";
import { z } from "zod";

export const VideoContentTypeSchema = z.enum(VIDEO_CONTENT_TYPES);

export const VideoUploadUrlsRequestSchema = z.object({
	variationId: z.uuid(),
	videoContentType: VideoContentTypeSchema,
});

export type VideoUploadUrlsRequest = z.infer<typeof VideoUploadUrlsRequestSchema>;

const VideoUploadTargetSchema = z.object({
	objectKey: z.string(),
	uploadUrl: z.url(),
});

export const VideoUploadUrlsResponseSchema = z.object({
	uploadId: z.uuid(),
	video: VideoUploadTargetSchema,
	thumbnail: VideoUploadTargetSchema,
});

export type VideoUploadUrlsResponse = z.infer<typeof VideoUploadUrlsResponseSchema>;
