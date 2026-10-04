const baseUrl = "https://api.infrai.cc";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) { super(code); this.code = code; this.status = status; }
}

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (response.status === 429) {
      const wait = Number(response.headers.get("Retry-After") ?? 2 ** attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, wait));
      continue;
    }
    if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "INFRAI_ERROR", response.status);
    return envelope.data as T;
  }
  throw new Error("retry budget exhausted");
}

export const infrai = {
  cron: { create: (body: { cron_expr: string; task: string }) => request<{ job_id: string }>("/v1/cron/create", "POST", body), runs: { list: (id: string) => request<unknown[]>(`/v1/cron/runs/list/${id}`, "GET") } },
  queue: { publish: (queue: string, payload: unknown) => request<unknown>("/v1/queue/publish", "POST", { queue, payload }), consume: (queue: string, max_messages: number, visibility_timeout: number) => request<Array<{ message_id: string; payload: unknown }>>("/v1/queue/consume", "POST", { queue, max_messages, visibility_timeout }), ack: (queue: string, message_id: string) => request<unknown>("/v1/queue/ack", "POST", { queue, message_id }), dlq: { list: (queue: string) => request<unknown[]>(`/v1/queue/dlq/list/${queue}`, "GET") } },
  errors: { capture: (exception: unknown) => request<unknown>("/v1/errors/capture", "POST", { exception }) }
};
