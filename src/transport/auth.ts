import { timingSafeEqual, createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

/**
 * Express middleware — Bearer token authentication for MCP endpoint.
 *
 * Security:
 * - Uses timingSafeEqual to prevent timing attacks.
 * - Never logs the token value; logs only its hash for audit.
 * - Rejects missing or malformed Authorization headers.
 */
export function bearerAuth(expectedToken: string): (req: Request, res: Response, next: NextFunction) => void {
  const expected = Buffer.from(expectedToken);

  return (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid Authorization header. Expected: Bearer <token>" });
      return;
    }

    const provided = authHeader.slice(7); // strip "Bearer "
    const providedBuf = Buffer.from(provided);

    // Constant-time compare — pad to same length to avoid length leak
    const a = Buffer.alloc(Math.max(expected.length, providedBuf.length));
    const b = Buffer.alloc(Math.max(expected.length, providedBuf.length));
    expected.copy(a);
    providedBuf.copy(b);

    if (!timingSafeEqual(a, b) || expected.length !== providedBuf.length) {
      // Log hash of provided token for audit (never log raw value)
      const hash = createHash("sha256").update(provided).digest("hex").slice(0, 8);
      console.error(`[auth] Rejected bearer token (sha256 prefix: ${hash})`);
      res.status(401).json({ error: "Invalid bearer token" });
      return;
    }

    next();
  };
}

/**
 * Extracts the Canvas token from X-Canvas-Token header.
 * Returns undefined if not present.
 * NEVER logs the token value.
 */
export function extractCanvasToken(req: Request): string | undefined {
  const token = req.headers["x-canvas-token"];
  if (Array.isArray(token)) return token[0];
  return token;
}

/**
 * Extracts Canvas domain from X-Canvas-Domain header.
 * Falls back to default if not provided.
 */
export function extractCanvasDomain(req: Request, defaultDomain: string): string {
  const domain = req.headers["x-canvas-domain"];
  const value = Array.isArray(domain) ? domain[0] : domain;
  return value ?? defaultDomain;
}
