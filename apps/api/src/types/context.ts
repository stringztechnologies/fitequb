export interface TelegramUser {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
}

export interface AuthenticatedUser {
	/** Internal user ID from the users table */
	userId: string;
	/** Auth method used */
	authMethod: "telegram" | "supabase";
	/** Telegram user data (only for telegram auth) */
	telegramUser?: TelegramUser;
	/** Supabase auth UID (only for supabase auth) */
	supabaseUid?: string;
}

export type AppVariables = {
	telegramUser: TelegramUser;
	authenticatedUser: AuthenticatedUser;
};
