import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { AppVariables } from "../types/context.js";
import { resolveUserId } from "./resolve-user.js";
import { supabase } from "./supabase.js";

export const uuid = z.string().uuid();
export const pilotConfigSchema = z
	.object({
		name: z.string().min(3).max(100),
		gym_id: uuid,
		coach_id: uuid,
		start_date: z.string().datetime({ offset: true }),
		enrollment_deadline: z.string().datetime({ offset: true }).optional(),
		duration_days: z.number().int().min(1).max(90).default(30),
		workout_target: z.number().int().min(1).max(90).default(12),
		completion_pct: z.number().min(0.01).max(1).default(0.8),
		min_members: z.number().int().min(2).max(25).default(20),
		max_members: z.number().int().min(2).max(25).default(20),
		stake_amount: z.number().positive().max(5000).multipleOf(0.01).default(500),
		program_fee: z.number().positive().max(10000).multipleOf(0.01).default(300),
		terms_version: z.literal("pilot-v1").default("pilot-v1"),
	})
	.refine(
		(v) => v.min_members <= v.max_members && v.workout_target <= v.duration_days,
		"Invalid capacity or attendance target",
	)
	.refine(
		(v) => !v.enrollment_deadline || Date.parse(v.enrollment_deadline) <= Date.parse(v.start_date),
		"Enrollment must close before start",
	);

export async function pilotActor(c: Context<{ Variables: AppVariables }>) {
	const actor = await resolveUserId(c);
	if (!actor) throw new HTTPException(401, { message: "Sign in required" });
	return actor;
}
export async function isPilotAdmin(c: Context<{ Variables: AppVariables }>, actor: string) {
	const auth = c.get("authenticatedUser");
	const configuredTelegram = Number(process.env.ADMIN_TELEGRAM_ID);
	const trusted =
		(auth?.authMethod === "telegram" &&
			configuredTelegram > 0 &&
			c.get("telegramUser")?.id === configuredTelegram) ||
		(Boolean(process.env.ADMIN_USER_ID) && actor === process.env.ADMIN_USER_ID);
	if (!trusted) return false;
	const { error } = await supabase.from("pilot_admins").upsert({ user_id: actor });
	if (error) throw new Error(error.message);
	return true;
}
export async function requirePilotStaff(c: Context<{ Variables: AppVariables }>, room: string) {
	const actor = await pilotActor(c);
	const admin = await isPilotAdmin(c, actor);
	if (!admin) {
		const { data, error } = await supabase
			.from("pilot_staff")
			.select("user_id")
			.eq("room_id", room)
			.eq("user_id", actor)
			.maybeSingle();
		if (error || !data) throw new HTTPException(403, { message: "Assigned staff required" });
	}
	return { actor, admin };
}
export async function pilotRpc(name: string, parameters: Record<string, unknown>) {
	const { data, error } = await supabase.rpc(name, parameters);
	if (error) throw new Error(error.message);
	return data;
}
export async function getPilot(room: string) {
	const { data, error } = await supabase
		.from("pilot_configs")
		.select(
			"room_id,gym_id,coach_id,program_fee,terms_version,enrollment_deadline,published,checkout_ready,settlement_hold,frozen_at,next_room_id, equb_rooms!pilot_configs_room_id_fkey(id,name,status,stake_amount,start_date,end_date,duration_days,workout_target,completion_pct,min_members,max_members,house_fee_pct,total_pot), partner_gyms(name,location)",
		)
		.eq("room_id", room)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return data;
}
