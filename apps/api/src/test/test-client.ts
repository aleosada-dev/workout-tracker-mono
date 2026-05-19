import { testClient } from "hono/testing";
import app from "@/index";

function createTestClient() {
	return testClient(app, {
		SUPABASE_URL: requireEnv("SUPABASE_URL"),
		SUPABASE_KEY: requireEnv("SUPABASE_KEY"),
		SENTRY_ENVIRONMENT: requireEnv("SENTRY_ENVIRONMENT"),
	});
}

const appClient = createTestClient();

export function getTestClient(): ReturnType<typeof createTestClient> {
	if (!appClient) {
		throw new Error("Test client was not initialized. Check src/test/setup.ts preload.");
	}

	return appClient;
}

function requireEnv(name: string) {
	const env = process.env[name];
	if (!env) throw new Error(`Environment variable ${name} not found.`);
	return env;
}
