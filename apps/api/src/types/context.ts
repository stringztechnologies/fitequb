export interface TelegramUser {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
}

export type AppVariables = {
	telegramUser: TelegramUser;
};
