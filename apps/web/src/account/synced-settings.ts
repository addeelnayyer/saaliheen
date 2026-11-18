// An Account's synced settings (#70, ADR 0008): the Script and the Language
// that follow a person to every device, kept in the Account database's
// "settings" table, one row per Account, removed with the Account. Each is null
// until the Account first chooses it. Arabic size and Meaning size stay on
// each device and are never kept here.

import type { BetterAuthPlugin } from "better-auth";
import { LANGUAGES, SCRIPTS, type Language, type Script } from "@saaliheen/dataset/types";
import { accountDatabase } from "./database.ts";

/** What an Account has chosen: each setting, or null until it first chooses one. */
export interface SyncedSettings {
  script: Script | null;
  language: Language | null;
}

/** A change to the settings: only the settings it names. */
export type SettingsChange = Partial<{ script: Script; language: Language }>;

/**
 * The "settings" table, through Better Auth's schema so `pnpm db:migrate`
 * applies it with the Account tables: one row per Account ("userId", unique),
 * deleted with its "user" row.
 */
export const syncedSettingsSchema = () =>
  ({
    id: "synced-settings",
    schema: {
      settings: {
        fields: {
          userId: { type: "string", required: true, unique: true, references: { model: "user", field: "id", onDelete: "cascade" } },
          script: { type: "string", required: false },
          language: { type: "string", required: false },
        },
      },
    },
  }) satisfies BetterAuthPlugin;

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T => (values as readonly unknown[]).includes(value);

/** Whether `body` names `key` with a value outside `values`. */
const badValue = (body: Record<string, unknown>, key: string, values: readonly string[]) =>
  key in body && !isOneOf(values, body[key]);

const isObject = (body: unknown): body is Record<string, unknown> =>
  typeof body === "object" && body !== null && !Array.isArray(body);

/**
 * The change a PATCH body asks for, or undefined when it is not a JSON object
 * or names a Script or a Language that is not one. Any other field, such as
 * arabicSize or meaningSize, is ignored.
 */
export function settingsChange(body: unknown): SettingsChange | undefined {
  if (!isObject(body) || badValue(body, "script", SCRIPTS) || badValue(body, "language", LANGUAGES)) return undefined;
  const { script, language } = body as SettingsChange;
  return { ...(script ? { script } : {}), ...(language ? { language } : {}) };
}

const NONE: SyncedSettings = { script: null, language: null };

/** The Account `userId`'s settings. */
export async function readSettings(userId: string): Promise<SyncedSettings> {
  const { rows } = await accountDatabase().query<SyncedSettings>(
    `select script, language from settings where "userId" = $1`,
    [userId],
  );
  return rows[0] ?? NONE;
}

/** Apply `change` to the Account `userId`'s settings, keeping what it does not name, and answer them all. */
export async function saveSettings(userId: string, change: SettingsChange): Promise<SyncedSettings> {
  const { rows } = await accountDatabase().query<SyncedSettings>(
    `insert into settings (id, "userId", script, language) values ($1, $2, $3, $4)
     on conflict ("userId") do update set
       script = coalesce(excluded.script, settings.script),
       language = coalesce(excluded.language, settings.language)
     returning script, language`,
    [crypto.randomUUID(), userId, change.script ?? null, change.language ?? null],
  );
  return rows[0];
}
