const SENSITIVE_KEYS = [
	"password",
	"token",
	"authorization",
	"secret",
	"api_key",
	"apikey",
	"cookie",
	"set-cookie",
	"accesstoken",
	"refreshtoken",
	"cpf",
	"email",
];

const REDACTED = "[Filtered]";
const MAX_DEPTH = 5;
const MAX_STRING_LENGTH = 1024;

const isSensitiveKey = (key: string): boolean => SENSITIVE_KEYS.includes(key.toLowerCase());

const truncate = (value: string): string =>
	value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]` : value;

export const sanitize = (value: unknown, depth = 0): unknown => {
	if (depth > MAX_DEPTH) return "[MaxDepth]";

	if (value === null || value === undefined) return value;
	if (typeof value === "string") return truncate(value);
	if (typeof value === "number" || typeof value === "boolean") return value;

	if (Array.isArray(value)) {
		return value.map((item) => sanitize(item, depth + 1));
	}

	if (typeof value === "object") {
		const result: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(value)) {
			result[key] = isSensitiveKey(key) ? REDACTED : sanitize(val, depth + 1);
		}
		return result;
	}

	return String(value);
};

export const sanitizeHeaders = (headers: Headers): Record<string, string> => {
	const result: Record<string, string> = {};
	headers.forEach((val, key) => {
		result[key] = isSensitiveKey(key) ? REDACTED : truncate(val);
	});
	return result;
};
