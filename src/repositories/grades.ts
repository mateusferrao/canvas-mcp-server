import type { ICanvasClient } from "../services/canvasClient.js";
import type { CanvasEnrollment } from "../types.js";
import { err, type Result } from "../services/errors.js";

export class GradesRepository {
  constructor(private readonly client: ICanvasClient) {}

  async getCourseGrades(courseId: number): Promise<Result<CanvasEnrollment>> {
    const result = await this.client.get<CanvasEnrollment[]>(
      `/courses/${courseId}/enrollments`,
      {
        "user_id": "self",
        "type[]": "StudentEnrollment",
        "include[]": "grades",
      }
    );

    if (!result.ok) return result;

    const enrollment = result.value[0];
    if (!enrollment) {
      return err({
        code: "NOT_FOUND",
        message: "Matrícula de estudante não encontrada para este curso.",
        status: 404,
      });
    }

    return { ok: true, value: enrollment };
  }
}
