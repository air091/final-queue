import type { JwtAccessPayload } from "../lib/jwt.ts";

declare global {
  namespace Express {
    interface Request {
      user?: JwtAccessPayload;
    }
  }
}

export {};
