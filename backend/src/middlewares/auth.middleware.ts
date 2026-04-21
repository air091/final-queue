import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt.js";

export const authenticate = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const token = request.cookies?.token;

    if (!token) {
      return response.status(401).json({ message: "Unauthorized" });
    }

    try {
      const payload = verifyToken(token);
      request.user = payload;
      next();
    } catch (error) {
      return response.status(401).json({ message: "Invalid token" });
    }
  } catch (error) {
    console.error("Error during authentication:", error);
    return response.status(500).json({
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};
