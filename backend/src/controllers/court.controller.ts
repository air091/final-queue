import type { Request, Response } from "express";

export const createMatchCourt = async (
  request: Request,
  response: Response,
) => {
  try {
  } catch (error) {
    console.error("Error creating match court host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
