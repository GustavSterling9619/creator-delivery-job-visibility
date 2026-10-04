import assert from "node:assert/strict";
import { decideDelivery } from "./creator_delivery.js";

const input = { subscriberId: "sub_1", assetId: "video_7", downloadUrl: "https://cdn.example/video_7" };
assert.equal(decideDelivery(input, false).status, "queued");
assert.equal(decideDelivery(input, true).status, "delivered");
console.log("delivery decision test passed");
