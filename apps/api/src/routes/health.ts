import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";

const health = new Hono();

health.get("/", (c) => {
	return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

health.get("/ready", async (c) => {
	const { error } = await supabase
		.from("equb_rooms")
		.select("id", { count: "exact", head: true })
		.limit(1);
	if (error) return c.json({ data: null, error: "Service unavailable" }, 503);
	return c.json({ data: { status: "ready" }, error: null });
});

export { health };
