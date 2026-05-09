import dotenv from "dotenv";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type ms from "ms";
dotenv.config();

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN;

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN;

if (!REFRESH_SECRET) {
  throw new Error(
    "JWT_REFRESH_SECRET is not defined in environment variables.",
  );
}
if (!REFRESH_EXPIRES_IN) {
  throw new Error(
    "JWT_REFRESH_EXPIRES_IN is not defined in environment variables.",
  );
}

if (!ACCESS_SECRET) {
  throw new Error("JWT_ACCESS_SECRET is not defined in environment variables.");
}
if (!ACCESS_EXPIRES_IN) {
  throw new Error(
    "JWT_ACCESS_EXPIRES_IN is not defined in environment variables.",
  );
}

type JwtAccessPayload = JwtPayload & {
  sub: string;
  username: string;
  email: string;
  profileUrl: string;
};

type JwtRefreshPayload = JwtPayload & {
  sub: string;
};

const refreshOptions: SignOptions = {
  expiresIn: REFRESH_EXPIRES_IN as ms.StringValue,
  algorithm: "HS256",
};

const accessOptions: SignOptions = {
  expiresIn: ACCESS_EXPIRES_IN as ms.StringValue,
  algorithm: "HS256",
};

export function signRefreshToken(payload: JwtRefreshPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, refreshOptions);
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  const decoded = jwt.verify(token, REFRESH_SECRET) as JwtRefreshPayload;
  return decoded;
}

export function signAccessToken(payload: JwtAccessPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, accessOptions);
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  const decoded = jwt.verify(token, ACCESS_SECRET) as JwtAccessPayload;
  return decoded;
}
