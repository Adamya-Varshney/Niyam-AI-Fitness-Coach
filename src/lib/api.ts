import type {
  ChatRequest,
  ChatResponse,
  OnboardRequest,
  OnboardResponse,
  ProfileRequest,
  StateResponse,
} from "./types";


// Hardcoded for prototyping — move to env vars before going public.
const BASE_URL = "https://info15779.n8n-wsk.com";

const TIMEOUT_MS = 45_000;

export class ApiError extends Error {
  status: number;
  kind: "http" | "network" | "timeout" | "config";
  body?: unknown;
  constructor(message: string, status: number, kind: ApiError["kind"], body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind;
    this.body = body;
  }
}

function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
  };
}

async function request<T>(
  path: string,
  init: RequestInit,
  opts: { timeoutMs?: number; strictJson?: boolean } = {},
): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError("Missing VITE_N8N_BASE_URL", 0, "config");
  }
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: AbortSignal.timeout(opts.timeoutMs ?? TIMEOUT_MS),
      headers: { ...jsonHeaders(), ...(init.headers ?? {}) },
    });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
    throw new ApiError(
      isTimeout ? "Request timed out" : "Network error",
      0,
      isTimeout ? "timeout" : "network",
    );
  }
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    throw new ApiError(`HTTP ${res.status}`, res.status, "http", body);
  }
  // Some webhooks may return empty body
  const text = await res.text();
  if (!text) {
    if (opts.strictJson) {
      throw new ApiError("Empty response body", res.status, "http");
    }
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    if (opts.strictJson) {
      throw new ApiError("Malformed JSON", res.status, "http", text);
    }
    return {} as T;
  }
}

export function postOnboard(payload: OnboardRequest): Promise<OnboardResponse> {
  return request<OnboardResponse>("/webhook/onboard", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function postChat(payload: ChatRequest): Promise<ChatResponse> {
  return request<ChatResponse>("/webhook/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function postProfile(payload: ProfileRequest): Promise<{ ok: true }> {
  return request<{ ok: true }>("/webhook/profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getState(userId: string): Promise<StateResponse> {
  const qs = new URLSearchParams({ user_id: userId }).toString();
  return request<StateResponse>(`/webhook/state?${qs}`, { method: "GET" });
}

export function postNudgeAck(userId: string, nudgeId: string): Promise<{ ok: true }> {
  return request<{ ok: true }>("/webhook/nudge-ack", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, nudge_id: nudgeId }),
  });
}

/**
 * Wrap an API call with graceful fallback. The fallback receives the typed ApiError
 * and returns a substitute value (or rethrows for the caller to handle, e.g. onboard).
 */
export async function withFallback<T>(
  call: () => Promise<T>,
  fallback: (err: ApiError) => T | Promise<T>,
): Promise<T> {
  try {
    return await call();
  } catch (err) {
    const apiErr =
      err instanceof ApiError ? err : new ApiError("Unknown error", 0, "network");
    return await fallback(apiErr);
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
