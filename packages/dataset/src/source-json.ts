// Reading one committed JSON source for the dataset builder: every failure
// names the file, so the Quran import says which source is missing or broken.

import fs from "node:fs";
import path from "node:path";

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The text of `dir/name`; throws, naming `name`, when it is missing or unreadable. */
export function readSourceText(dir: string, name: string): string {
  const file = path.join(dir, name);
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    throw new Error(`${name}: source missing or unreadable at ${file}`, { cause: error });
  }
}

/** The JSON in `dir/name`; throws, naming `name`, when it is missing or malformed. */
export function readJson(dir: string, name: string): unknown {
  const raw = readSourceText(dir, name);
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${name}: malformed JSON (${(error as Error).message})`, { cause: error });
  }
}

/** The JSON object in `dir/name`; throws, naming `name`, when it is missing, malformed or not an object. */
export function readJsonObject(dir: string, name: string): Record<string, unknown> {
  const parsed = readJson(dir, name);
  if (!isObject(parsed)) throw new Error(`${name}: malformed — expected a JSON object`);
  return parsed;
}
