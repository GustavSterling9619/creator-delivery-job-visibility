import { infrai } from "./infrai.js";

export type DeliveryRequest = { subscriberId: string; assetId: string; downloadUrl: string };
export type DeliveryResult = { status: "delivered" | "queued"; subscriberId: string; assetId: string };
const deliveryQueue = "creator-deliveries";

export function decideDelivery(request: DeliveryRequest, processed: boolean): DeliveryResult {
  return { status: processed ? "delivered" : "queued", subscriberId: request.subscriberId, assetId: request.assetId };
}

export async function scheduleDelivery(taskUrl: string) {
  return infrai.cron.create({ cron_expr: "*/15 * * * *", task: taskUrl });
}

export async function processNextDelivery() {
  const messages = await infrai.queue.consume(deliveryQueue, 1, 60);
  const message = messages[0];
  if (!message) return { status: "idle" as const };
  try {
    await infrai.queue.ack(deliveryQueue, message.message_id);
    return { status: "processed" as const, messageId: message.message_id };
  } catch (exception) {
    await infrai.errors.capture(exception);
    throw exception;
  }
}
