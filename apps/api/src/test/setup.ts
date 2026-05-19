import { beforeAll } from "bun:test";
import { setupTestAuth } from "./test-auth";

beforeAll(async () => {
	await setupTestAuth();
});
