import { createCanvasClient } from "../../src/services/canvasClient.js";
import type { ICanvasClient } from "../../src/services/canvasClient.js";

export function buildTestClient(): ICanvasClient {
  return createCanvasClient({
    token: "test-token",
    domain: "pucminas.instructure.com",
    timeoutMs: 5000,
  });
}
