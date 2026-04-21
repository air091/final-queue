import dotenv from "dotenv";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type ms from "ms";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables.");
}
if (!JWT_EXPIRES_IN) {
  throw new Error("JWT_EXPIRES_IN is not defined in environment variables.");
}

type JwtAccessPayload = JwtPayload & {
  sub: number;
  username: string;
  email: string;
};

const accessOptions: SignOptions = {
  expiresIn: JWT_EXPIRES_IN as ms.StringValue,
  algorithm: "HS256",
};

export function signToken(payload: JwtAccessPayload): string {
  return jwt.sign(payload, JWT_SECRET, accessOptions);
}

export function verifyToken(token: string): JwtAccessPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtAccessPayload;
  return decoded;
}
