// The small in-memory caches the browser keeps while the site runs: the Root
// dialog's Root files, and for a page opened in parts (#24, #131) its part files and
// where each visit was left. Nothing here outlives the page.

/** Puts `value` at `key` as the most recently used, keeping only the `max` most recently used. */
export function remember<K, V>(map: Map<K, V>, key: K, value: V, max: number) {
  map.delete(key);
  map.set(key, value);
  // A Map keeps insertion order, so its first key is the least recently used.
  while (map.size > max) map.delete(map.keys().next().value as K);
}

/** The JSON at `url`, fetched once into `fetched` under `key`; a fetch that fails is forgotten, so asking again fetches it again. */
export function fetchJsonOnce<K, T>(fetched: Map<K, Promise<T>>, key: K, url: string): Promise<T> {
  let json = fetched.get(key);
  if (!json) {
    json = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      return res.json() as Promise<T>;
    });
    json.catch(() => fetched.delete(key));
    fetched.set(key, json);
  }
  return json;
}
