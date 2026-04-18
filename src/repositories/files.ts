import axios from "axios";
import FormData from "form-data";
import type { CanvasFile } from "../types.js";
import { ok, err, mapApiError, type Result } from "../services/errors.js";
import type { ICanvasClient } from "../services/canvasClient.js";

export interface UploadFileParams {
  name: string;
  fileBuffer: Buffer;
  contentType?: string;
  parentFolderPath?: string;
  onDuplicate?: "overwrite" | "rename";
}

export interface UploadSubmissionFileParams extends UploadFileParams {
  courseId: number;
  assignmentId: number;
}

interface UploadStep1Response {
  upload_url: string;
  upload_params: Record<string, string>;
  file_param?: string;
}

/**
 * FilesRepository encapsulates the 3-step Canvas file upload workflow.
 *
 * Step 1: notify Canvas (via ICanvasClient) → get upload_url + upload_params
 * Step 2: POST multipart to external URL (S3) via raw axios — NO Authorization header
 * Step 3: GET confirmation URL with Authorization → receive final CanvasFile
 *
 * Uses axios directly for steps 2+3 because they target URLs outside
 * ICanvasClient's Canvas-specific scope.
 */
export class FilesRepository {
  constructor(
    private readonly client: ICanvasClient,
    private readonly token: string,
    private readonly baseUrl: string
  ) {}

  async uploadUserFile(
    params: UploadFileParams
  ): Promise<Result<CanvasFile>> {
    return this._upload("/users/self/files", params);
  }

  async uploadSubmissionFile(
    params: UploadSubmissionFileParams
  ): Promise<Result<CanvasFile>> {
    const path = `/courses/${params.courseId}/assignments/${params.assignmentId}/submissions/self/files`;
    return this._upload(path, params);
  }

  private async _upload(
    step1Path: string,
    params: UploadFileParams
  ): Promise<Result<CanvasFile>> {
    // Step 1: notify Canvas
    const step1Body: Record<string, unknown> = {
      name: params.name,
      size: params.fileBuffer.byteLength,
    };
    if (params.contentType) step1Body["content_type"] = params.contentType;
    if (params.parentFolderPath)
      step1Body["parent_folder_path"] = params.parentFolderPath;
    if (params.onDuplicate) step1Body["on_duplicate"] = params.onDuplicate;

    const step1Result =
      await this.client.post<UploadStep1Response>(step1Path, step1Body);

    if (!step1Result.ok) return step1Result;

    const { upload_url, upload_params } = step1Result.value;
    const fileParam = step1Result.value.file_param ?? "file";

    // Step 2: upload to external URL via multipart — no Authorization
    let confirmUrl: string;
    try {
      const form = new FormData();
      for (const [key, value] of Object.entries(upload_params)) {
        form.append(key, value);
      }
      form.append(fileParam, params.fileBuffer, {
        filename: params.name,
        contentType: params.contentType ?? "application/octet-stream",
      });

      const step2Response = await axios.post(upload_url, form, {
        headers: form.getHeaders(),
        maxRedirects: 0,
        validateStatus: (s) => s === 301 || s === 302 || s === 303 || (s >= 200 && s < 300),
      });

      confirmUrl =
        step2Response.headers["location"] ??
        (upload_params["success_action_redirect"] as string | undefined) ?? "";
    } catch (error) {
      return err(mapApiError(error));
    }

    // Step 3: confirm with Canvas
    if (!confirmUrl) {
      return err({
        code: "UPLOAD_ERROR",
        message: "Falha ao confirmar upload: URL de confirmação não recebida.",
      });
    }

    try {
      // Strip base URL prefix if confirmUrl is absolute Canvas URL
      // ICanvasClient.get expects relative paths; use raw axios for absolute
      const response = await axios.get<CanvasFile>(confirmUrl, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      return ok(response.data);
    } catch (error) {
      return err(mapApiError(error));
    }
  }
}
