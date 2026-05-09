import type { Response } from "express";

const isProduction = process.env.NODE_ENV === "production";

export function setRefreshTokenCookie(response: Response, token: string) {
  response.cookie("refreshToken", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

export function clearRefreshTokenCookie(response: Response) {
  response.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });
}
