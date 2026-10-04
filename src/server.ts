import { createServer } from "node:http";
import { z } from "zod";
import { decideDelivery } from "./creator_delivery.js";

const bodySchema = z.object({ subscriberId: z.string().min(1), assetId: z.string().min(1), downloadUrl: z.string().url(), processed: z.boolean().default(false) });
const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/deliveries") { response.writeHead(404).end(); return; }
  let raw = "";
  for await (const chunk of request) raw += chunk;
  const parsed = bodySchema.safeParse(JSON.parse(raw));
  if (!parsed.success) { response.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: parsed.error.flatten() })); return; }
  const result = decideDelivery({ subscriberId: parsed.data.subscriberId, assetId: parsed.data.assetId, downloadUrl: parsed.data.downloadUrl }, parsed.data.processed);
  response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
});
server.listen(Number(process.env.PORT ?? 3000), () => console.log("creator delivery listening"));
