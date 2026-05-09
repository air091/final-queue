import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";

export const authenticate = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const authorization = request.headers.authorization;

    if (!authorization)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!authorization.startsWith("Bearer ")) {
      return response
        .status(401)
        .json({ success: false, message: "Invalid token" });
    }

    const token = authorization.split(" ")[1];
    if (!token)
      return response
        .status(401)
        .json({ success: false, message: "Token missing" });

    const decoded = verifyAccessToken(token);
    request.user = decoded;
    next();
  } catch (error) {
    console.error("Error during authentication:", error);
    return response.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};
