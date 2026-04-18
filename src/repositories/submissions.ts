import type { ICanvasClient } from "../services/canvasClient.js";
import type { Result } from "../services/errors.js";
import type { CanvasSubmission, PaginatedResponse } from "../types.js";

export interface ListSubmissionsParams {
  courseId: number;
  per_page?: number;
  page?: number;
  include_assignment?: boolean;
}

export type SubmissionType = "online_text_entry" | "online_url";

export interface SubmitAssignmentParams {
  courseId: number;
  assignmentId: number;
  submissionType: SubmissionType;
  body?: string;
  url?: string;
}

export class SubmissionsRepository {
  constructor(private readonly client: ICanvasClient) {}

  async list(
    params: ListSubmissionsParams
  ): Promise<Result<PaginatedResponse<CanvasSubmission>>> {
    const queryParams: Record<string, unknown> = {
      "student_ids[]": "self",
      per_page: params.per_page ?? 25,
      page: params.page ?? 1,
    };
    if (params.include_assignment) {
      queryParams.include = ["assignment"];
    }
    return this.client.getPaginated<CanvasSubmission>(
      `/courses/${params.courseId}/students/submissions`,
      queryParams
    );
  }

  async get(
    courseId: number,
    assignmentId: number
  ): Promise<Result<CanvasSubmission>> {
    return this.client.get<CanvasSubmission>(
      `/courses/${courseId}/assignments/${assignmentId}/submissions/self`,
      { include: ["submission_comments"] }
    );
  }

  async submit(params: SubmitAssignmentParams): Promise<Result<CanvasSubmission>> {
    const body: Record<string, unknown> = {
      "submission[submission_type]": params.submissionType,
    };

    if (params.submissionType === "online_text_entry") {
      if (!params.body) {
        return {
          ok: false,
          error: {
            code: "INVALID_PARAMS",
            message: "body é obrigatório para online_text_entry.",
          },
        };
      }
      body["submission[body]"] = params.body;
    }

    if (params.submissionType === "online_url") {
      if (!params.url) {
        return {
          ok: false,
          error: {
            code: "INVALID_PARAMS",
            message: "url é obrigatória para online_url.",
          },
        };
      }
      if (!/^https?:\/\//.test(params.url)) {
        return {
          ok: false,
          error: {
            code: "INVALID_PARAMS",
            message: "url deve começar com http:// ou https://.",
          },
        };
      }
      body["submission[url]"] = params.url;
    }

    return this.client.post<CanvasSubmission>(
      `/courses/${params.courseId}/assignments/${params.assignmentId}/submissions`,
      body
    );
  }
}
