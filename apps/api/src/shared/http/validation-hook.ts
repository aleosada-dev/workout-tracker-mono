import { ValidationError, type ValidationIssue } from "@workout-tracker/domain";

type StandardPathSegment = PropertyKey | { readonly key: PropertyKey };

type StandardIssue = {
	readonly message: string;
	readonly path?: ReadonlyArray<StandardPathSegment>;
};

type ValidationHookResult =
	| { readonly success: true }
	| { readonly success: false; readonly error: ReadonlyArray<StandardIssue> };

const segmentKey = (segment: StandardPathSegment): PropertyKey =>
	typeof segment === "object" && segment !== null ? segment.key : segment;

const fieldOf = (issue: StandardIssue): string | undefined =>
	issue.path && issue.path.length > 0
		? issue.path.map((segment) => String(segmentKey(segment))).join(".")
		: undefined;

/**
 * Hook for `validator(...)` that turns a schema failure into a domain
 * `ValidationError`, so it flows through the central error handler as
 * `{ error, issues: [{ code, field }] }` instead of zod's raw issue array.
 *
 * The zod `message` carries the i18n key (e.g. `validation.weight_required`);
 * structural failures with no key fall back to `validation.invalid`. The front
 * translates each `code` to the user's language.
 */
export function validationHook(result: ValidationHookResult): void {
	if (result.success) return;

	const issues: ValidationIssue[] = result.error.map((issue) => ({
		code: issue.message.startsWith("validation.") ? issue.message : "validation.invalid",
		field: fieldOf(issue),
	}));

	throw new ValidationError(issues);
}
