import * as Sentry from "@sentry/node";

export function initSentry() {
	if (process.env.SENTRY_DSN) {
		Sentry.init({
			dsn: process.env.SENTRY_DSN,
			environment: process.env.NODE_ENV ?? "development",
			tracesSampleRate: 0.1,
			sendDefaultPii: false,
		});
	}
}

export function captureApiException(
	error: unknown,
	tags: Record<string, string | number | undefined> = {},
) {
	Sentry.withScope((scope) => {
		for (const [name, value] of Object.entries(tags)) {
			if (value !== undefined) scope.setTag(name, String(value));
		}
		Sentry.captureException(error);
	});
}

export { Sentry };
