import type { Container } from "../../container";
import type { Env } from "../../env";

export type UserClaims = {
	sub: string;
	email?: string;
	[key: string]: unknown;
};

export type AppBindings = {
	Bindings: Env;
	Variables: {
		container: Container;
		accessToken?: string;
		userClaims?: UserClaims;
	};
};
