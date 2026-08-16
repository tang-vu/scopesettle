import "server-only";

import { after } from "next/server";

import { processWebhookOutbox } from "./webhook-outbox";

export function scheduleWebhookProcessing(): void {
  after(async () => {
    await processWebhookOutbox(10).catch((error: unknown) => {
      console.error("ScopeSettle webhook worker failed after response", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    });
  });
}
