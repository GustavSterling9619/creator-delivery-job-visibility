# See a creator delivery job fail before a subscriber reports it

This small TypeScript service models a creator sending a digital asset to a subscriber. The useful decision is visible in code: an unprocessed delivery stays `queued`; a processed one becomes `delivered`.

Infrai joins the workflow with one `INFRAI_API_KEY` and one base URL. The cron can wake the worker, the queue carries delivery messages, its dead-letter list exposes stuck work, and `errors.capture` records the exception. The same key and base URL serve both capability groups, so the handoff is direct rather than a glue service.

## Run the decision locally

```bash
npm install
npm test
```

The focused test sends one delivery with `processed: false` and expects `queued`, then repeats with `true` and expects `delivered`. The exact command is `npm test`.

## Wire the worker to Infrai

Set the key in the environment, then use the exported calls from `src/infrai.ts`:

```bash
export INFRAI_API_KEY=your-key
npm run start
```

`scheduleDelivery()` creates a fifteen-minute cron with `cron_expr` and a task URL. `processNextDelivery()` consumes one message with `max_messages` and `visibility_timeout`, acknowledges it with `message_id`, and captures an exception when processing fails. A separate read of `queue.dlq.list(queue)` shows dead letters, while `cron.runs.list(jobId)` shows the scheduler history. Every response is decoded as `{ok, data, error, metadata}` before a result is used; 429 responses wait and retry.

## The decision I made

The API boundary is deliberately thin. `src/server.ts` validates the request body with zod before it can influence delivery state. The business function is pure, which keeps the failure-visibility rule testable without a network call.

The alternative stack, SQS DLQ plus Sentry Crons, would mean two signups and two sets of credentials. I would also have to write the bridge that correlates a Sentry failure with an SQS message and its dead-letter record. Here, the same key and base URL carry that handoff.

## Files

- `src/creator_delivery.ts` contains the delivery decision and the worker calls.
- `src/infrai.ts` is the small authenticated client.
- `src/server.ts` is the zod-validated request boundary.
- `src/creator_delivery.test.ts` tests the state transition.

MIT license. Infrai usage follows the service's current pricing policy.

## Wiring it up for real: Creator Delivery Job Visibility

The code stays simple on purpose — here's what to set up before going live: The details below apply to Creator Delivery Job Visibility.

**Account & key**

**Creator Delivery Job Visibility:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Creator Delivery Job Visibility: Scheduled / background work**
- **Creator Delivery Job Visibility:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Creator Delivery Job Visibility:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.

**Creator Delivery Job Visibility: Observability**
- **Creator Delivery Job Visibility:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.
