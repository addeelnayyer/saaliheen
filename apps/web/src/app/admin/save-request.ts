// How an editor sends a save (#142, #201, #202): its run's Ayahs as typed, the
// PUT, POST or DELETE, and the sentence it shows when the save never reached
// the server.

/** A typed Ayah number as sent: 0 when it is no whole number, which a save refuses as outside the Surah. */
export const ayahNumber = (typed: string) => (/^\s*\d+\s*$/.test(typed) ? Number(typed) : 0);

export const UNREACHABLE = "The save didn't reach the server. Check the connection and press Save again.";

/** Send `body` to `path` as `method`: the answer's status and JSON body (undefined for none), or undefined when it never arrived. */
export async function sendRequest(method: "PUT" | "POST" | "DELETE", path: string, body: string): Promise<{ status: number; body: unknown } | undefined> {
  try {
    const res = await fetch(path, { method, headers: { "content-type": "application/json" }, body });
    return { status: res.status, body: await res.json().catch(() => undefined) };
  } catch {
    return undefined;
  }
}

/** PUT `body` to `path`, as `sendRequest` sends it. */
export const putSave = (path: string, body: string) => sendRequest("PUT", path, body);
