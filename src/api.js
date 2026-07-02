/**
 * api.js — HTTP/SSE helpers for the reasonix serve API.
 */

export function post(path, body) {
  return fetch(path, {method:'POST',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
}

export async function getJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`GET ${path}: ${r.status}`);
  return r.json();
}

export function connectSSE(onEvent, onOpen, onError) {
  const es = new EventSource('/events');
  es.onopen = () => onOpen?.();
  es.onmessage = ev => { try { onEvent(JSON.parse(ev.data)); } catch {} };
  es.onerror = () => onError?.(es.readyState);
  return es;
}
