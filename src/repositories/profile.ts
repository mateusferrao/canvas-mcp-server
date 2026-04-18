import type { ICanvasClient } from "../services/canvasClient.js";
import type { Result } from "../services/errors.js";
import type { CanvasUser } from "../types.js";

export class ProfileRepository {
  constructor(private readonly client: ICanvasClient) {}

  async getSelf(): Promise<Result<CanvasUser>> {
    return this.client.get<CanvasUser>("/users/self");
  }
}
