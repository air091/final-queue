import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { signToken } from "../lib/jwt.js";

export const register = async (request: Request, response: Response) => {
  try {
    const { username, skillLevel, email, password } = request.body;
    const cleanedUsername: string = username.trim();
    const cleanedEmail: string = email.trim().toLowerCase();

    if (!cleanedUsername || !cleanedEmail || !password) {
      return response
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const checkAccountExist = await prisma.account.findUnique({
      where: { email: cleanedEmail },
    });
    if (checkAccountExist) {
      return response
        .status(400)
        .json({ success: false, message: "Email already exists." });
    }
    const hashPassword: string = await bcrypt.hash(password, 10);
    await prisma.account.create({
      data: {
        username: cleanedUsername,
        skillLevel,
        email: cleanedEmail,
        password: hashPassword,
      },
    });

    return response
      .status(201)
      .json({ success: true, message: "Account created successfully." });
  } catch (error) {
    console.error("Error during registration:", error);
    return response.status(500).json({
      success: false,
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
        .json({ success: false, message: "Invalid email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, account.password);

    if (!isPasswordValid) {
      return response
        .status(400)
        .json({ success: false, message: "Invalid email or password." });
    }

    const token = signToken({
      sub: account.id,
      username: account.username,
      email: account.email,
    });

    response.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1000 * 60 * 15, // 15 minutes
    });

    return response.json({ success: true, message: "Login successful." });
  } catch (error) {
    console.error("Error during login:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

export const logout = async (request: Request, response: Response) => {
  try {
    response.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/", // important if you set it when creating cookie
    });

    return response.json({ success: true, message: "Logout successful." });
  } catch (error) {
    console.error("Error during logout:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

export const getCurrentUser = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    return response.json({ success: true, user: request.user });
  } catch (error) {
    console.error("Error during get current user:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};
