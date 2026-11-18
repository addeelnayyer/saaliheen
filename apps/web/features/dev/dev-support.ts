// Shared by features/dev/'s steps (#170, #172): `pnpm dev` started as a
// developer starts it, on PORT, with the dev Postgres's container and volume
// renamed and its port moved for the run (ADR 0041).

import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { Client } from "pg";

export const WEB = path.join(__dirname, "..", "..");

export const sitePort = () => {
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port <= 0) throw new Error("set PORT, e.g. `PORT=3170 pnpm test:dev`");
  return port;
};

/** The run's dev Postgres: its container's and volume's name, its port, and how to reach it (ADR 0041). */
export const devDatabase = () => {
  const port = 55_000 + (sitePort() % 1_000);
  return { name: `saaliheen-dev-db-test-${sitePort()}`, port, url: `postgres://saaliheen:saaliheen-dev@127.0.0.1:${port}/saaliheen_dev` };
};

export const docker = (args: string[]) => execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const quietly = (args: string[]) => {
  try {
    docker(args);
  } catch {
    // nothing to remove
  }
};

/** Remove the run's dev Postgres, container and volume. */
export function removeDevDatabase() {
  quietly(["rm", "-f", devDatabase().name]);
  quietly(["volume", "rm", "-f", devDatabase().name]);
}

/** Whether Docker has a container, or a volume, of the run's dev Postgres's name. */
export const devContainers = () => docker(["ps", "-a", "--filter", `name=^${devDatabase().name}$`, "--format", "{{.Names}}"]).trim();
export const devVolumes = () => docker(["volume", "ls", "--filter", `name=^${devDatabase().name}$`, "--format", "{{.Name}}"]).trim();

/** A `pnpm dev` started here, and all it has written. */
export interface Dev {
  child: ChildProcess;
  output: string;
}

let dev: Dev | undefined;
/** The `pnpm dev` started here, if one is running. */
export const runningDev = () => dev;

/** Start `pnpm dev` on PORT, its DATABASE_URL `databaseUrl` or none, and wait until it serves. */
export async function startDev(databaseUrl?: string) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(sitePort()),
    DEV_DATABASE_NAME: devDatabase().name,
    DEV_DATABASE_PORT: String(devDatabase().port),
  };
  delete env.DATABASE_URL;
  if (databaseUrl) env.DATABASE_URL = databaseUrl;
  const child = spawn("pnpm", ["dev"], { cwd: WEB, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  const started: Dev = { child, output: "" };
  child.stdout!.on("data", (d) => (started.output += d));
  child.stderr!.on("data", (d) => (started.output += d));
  dev = started;
  const deadline = Date.now() + 300_000;
  for (;;) {
    const ok = await fetch(`http://127.0.0.1:${sitePort()}/privacy`).then((res) => res.ok, () => false);
    if (ok) return;
    if (child.exitCode !== null || Date.now() > deadline) throw new Error(`pnpm dev did not serve:\n${started.output.slice(-3000)}`);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}

/** Stop the `pnpm dev` started here, and wait until it is gone. */
export async function stopDev() {
  if (!dev) return;
  const { child } = dev;
  dev = undefined;
  if (child.exitCode !== null) return;
  const gone = new Promise((resolve) => child.on("exit", resolve));
  try {
    process.kill(-child.pid!, "SIGTERM");
  } catch {
    return;
  }
  await gone;
}

/** Run `sql` against `url`, giving its rows. */
export async function query<T extends object>(url: string, sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
  } finally {
    await client.end();
  }
}

