import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & {
        sub: number;
        username: string;
        email: string;
      };
    }
  }
}

export {};
