/**
 * api.ts — HTTP/SSE helpers for the reasonix serve API.
 */

export async function post<T = void>(path: string, body?: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`GET ${path}: ${r.status}`);
  return r.json() as Promise<T>;
}

export function connectSSE(
  onEvent: (data: unknown) => void,
  onOpen?: () => void,
  onError?: (readyState: number) => void,
): EventSource {
  const es = new EventSource("/events");
  es.onopen = () => onOpen?.();
  es.onmessage = (ev: MessageEvent) => {
    try { onEvent(JSON.parse(ev.data)); } catch { /* ignore malformed frames */ }
  };
  es.onerror = () => onError?.(es.readyState);
  return es;
}
