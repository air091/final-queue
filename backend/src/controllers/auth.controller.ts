import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";

export const register = async (request: Request, response: Response) => {
  try {
    const { username, email, password } = request.body;
    const cleanedUsername = username.trim();
    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedUsername || !cleanedEmail || !password) {
      return response.status(400).json({ message: "All fields are required." });
    }

    const checkAccountExist = await prisma.account.findUnique({
      where: { email: cleanedEmail },
    });
    if (checkAccountExist) {
      return response.status(400).json({ message: "Email already exists." });
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const newAccount = await prisma.account.create({
      data: {
        username: cleanedUsername,
        email: cleanedEmail,
        password: hashPassword,
      },
    });

    return response
      .status(201)
      .json({ message: "Account created successfully.", account: newAccount });
  } catch (error) {
    console.error("Error during registration:", error);
    return response.status(500).json({
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

export const login = async (request: Request, response: Response) => {
  try {
    const { email, password } = request.body;
    const cleanedEmail = email.trim().toLowerCase();

    const account = await prisma.account.findUnique({
      where: { email: cleanedEmail },
    });

    if (!account) {
      return response
        .status(400)
        .json({ message: "Invalid email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, account.password);

    if (!isPasswordValid) {
      return response
        .status(400)
        .json({ message: "Invalid email or password." });
    }

    return response.json({ message: "Login successful.", account });
  } catch (error) {
    console.error("Error during login:", error);
    return response.status(500).json({
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

export const logout = async (request: Request, response: Response) => {
  try {
    // Implement logout logic here (e.g., invalidate session or token)
    return response.json({ message: "Logout successful." });
  } catch (error) {
    console.error("Error during logout:", error);
    return response.status(500).json({
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};
