// `pnpm dev` (#170, ADR 0041): the website's dev server on its own Postgres.
// Before `next dev` starts, it starts a `pgvector/pgvector:pg17` container,
// `saaliheen-dev-db`, published on 127.0.0.1:55432 and keeping its data in the
// Docker volume `saaliheen-dev-db`, so an edit made in it outlives a restart,
// and runs `pnpm db:migrate` on it, the Quran import (#172) included, so every
// page serves with no other setup. DEV_DATABASE_NAME renames the container and
// volume and DEV_DATABASE_PORT moves the port (its own tests use both).
//
// A DATABASE_URL, in the environment or in one of the .env files `next dev`
// reads (.env.local above all), overrides it: then no container is started,
// nothing is migrated, and `next dev` serves the database it names as it is
// (a developer's .env.local may name production's).

import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const WEB = fileURLToPath(new URL("..", import.meta.url));
/** The .env files `next dev` reads, which may name a DATABASE_URL. */
const ENV_FILES = [".env.development.local", ".env.local", ".env.development", ".env"];

/** The tests' Postgres 17 with pgvector, for Quran Chat's index (#77). */
const POSTGRES_IMAGE = "pgvector/pgvector:pg17";
const name = process.env.DEV_DATABASE_NAME || "saaliheen-dev-db";
const port = Number(process.env.DEV_DATABASE_PORT || 55432);
const DEV_DATABASE_URL = `postgres://saaliheen:saaliheen-dev@127.0.0.1:${port}/saaliheen_dev`;

const docker = (args: string[]) => execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** Where a DATABASE_URL that overrides the dev Postgres is set, if one is. */
function overridingDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return "the environment";
  return ENV_FILES.find((file) => {
    const at = `${WEB}/${file}`;
    return fs.existsSync(at) && /^\s*(export\s+)?DATABASE_URL\s*=\s*\S/m.test(fs.readFileSync(at, "utf8"));
  });
}

/** The dev Postgres container's state, running, stopped or missing, and the image it runs. */
function container(): { state: "running" | "stopped" | "missing"; image?: string } {
  try {
    const [running, image] = docker(["inspect", "-f", "{{.State.Running}} {{.Config.Image}}", name]).split(" ");
    return { state: running === "true" ? "running" : "stopped", image };
  } catch {
    return { state: "missing" };
  }
}

/**
 * Start the dev Postgres: its container as it is, or a new one on its volume.
 * A container of another image, the `postgres:17` of before #77, which has no
 * pgvector, is replaced by one of this image on the same volume, keeping its
 * data: both are Postgres 17.
 */
function startContainer() {
  const found = container();
  let state = found.state;
  if (state !== "missing" && found.image !== POSTGRES_IMAGE) {
    docker(["rm", "-f", name]);
    state = "missing";
  }
  if (state === "stopped") docker(["start", name]);
  if (state !== "missing") return;
  docker([
    "run", "-d",
    "--name", name,
    "-p", `127.0.0.1:${port}:5432`,
    "-v", `${name}:/var/lib/postgresql/data`,
    "-e", "POSTGRES_USER=saaliheen",
    "-e", "POSTGRES_PASSWORD=saaliheen-dev",
    "-e", "POSTGRES_DB=saaliheen_dev",
    POSTGRES_IMAGE,
  ]);
}

/** Wait until the dev Postgres takes connections over TCP. */
async function untilReady() {
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      // -h 127.0.0.1: the image's first, socket-only start answers pg_isready too early.
      docker(["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "saaliheen", "-d", "saaliheen_dev"]);
      return;
    } catch (error) {
      if (Date.now() > deadline) throw new Error(`dev: ${name} did not take connections in 60s`, { cause: error });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

/** Run `pnpm db:migrate` on the dev Postgres, failing `pnpm dev` when it fails. */
function migrate() {
  const run = spawnSync("pnpm", ["run", "--silent", "db:migrate"], { cwd: WEB, stdio: "inherit", env: { ...process.env, DATABASE_URL: DEV_DATABASE_URL } });
  if (run.status !== 0) throw new Error(`dev: db:migrate failed on ${name}`);
}

/** Start, or reuse, the dev Postgres and migrate it; the DATABASE_URL `next dev` is given. */
async function devDatabase(): Promise<string | undefined> {
  const override = overridingDatabaseUrl();
  if (override) {
    console.log(`dev: DATABASE_URL is set in ${override}; starting no Postgres and migrating nothing`);
    return undefined;
  }
  startContainer();
  await untilReady();
  console.log(`dev: Postgres ${name} on 127.0.0.1:${port}`);
  migrate();
  return DEV_DATABASE_URL;
}

/** Run `next dev` with the arguments `pnpm dev` was given, until it exits or `pnpm dev` is stopped. */
function nextDev(databaseUrl: string | undefined) {
  const env = databaseUrl ? { ...process.env, DATABASE_URL: databaseUrl } : process.env;
  const next = spawn("pnpm", ["exec", "next", "dev", ...process.argv.slice(2)], { cwd: WEB, stdio: "inherit", env });
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => next.kill(signal));
  next.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}

nextDev(await devDatabase());
