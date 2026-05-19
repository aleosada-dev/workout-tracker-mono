import { createClient } from "@supabase/supabase-js";

export type TestProfile = "athlete" | "coach";

export type TestUserAuth = {
	accessToken: string;
	userId: string;
};

const testProfiles = ["athlete", "coach"] as const satisfies readonly TestProfile[];

const credentialsByProfile = {
	athlete: {
		email: "TEST_ATHLETE_USER_EMAIL",
		password: "TEST_ATHLETE_USER_PASSWORD",
	},
	coach: {
		email: "TEST_COACH_USER_EMAIL",
		password: "TEST_COACH_USER_PASSWORD",
	},
} satisfies Record<TestProfile, { email: string; password: string }>;

const authByProfile = new Map<TestProfile, TestUserAuth>();

export async function setupTestAuth(): Promise<void> {
	const authEntries = await Promise.all(
		testProfiles.map(async (profile) => {
			const auth = await signIn(profile);
			return [profile, auth] as const;
		}),
	);

	authByProfile.clear();

	for (const [profile, auth] of authEntries) {
		authByProfile.set(profile, auth);
	}
}

export function getTestUserAuth(profile: TestProfile): TestUserAuth {
	const auth = authByProfile.get(profile);

	if (!auth) {
		throw new Error(
			`Test auth for "${profile}" was not initialized. Check src/test/setup.ts preload.`,
		);
	}

	return auth;
}

export function authHeaders(profile: TestProfile): Record<string, string> {
	const { accessToken } = getTestUserAuth(profile);
	return { Authorization: `Bearer ${accessToken}` };
}

async function signIn(profile: TestProfile): Promise<TestUserAuth> {
	const credentials = credentialsByProfile[profile];
	const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_KEY"), {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	});

	const { data, error } = await supabase.auth.signInWithPassword({
		email: requireEnv(credentials.email),
		password: requireEnv(credentials.password),
	});

	if (error || !data.session || !data.user) {
		throw new Error(
			`Failed to sign in ${profile} test user: ${error?.message ?? "no session returned"}`,
		);
	}

	return {
		accessToken: data.session.access_token,
		userId: data.user.id,
	};
}

function requireEnv(name: string) {
	const env = process.env[name];
	if (!env) throw new Error(`Environment variable ${name} not found.`);
	return env;
}
