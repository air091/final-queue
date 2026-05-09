import { request, type Request, type Response } from "express";
import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";
import { setRefreshTokenCookie } from "../lib/cookies.js";

export const register = async (request: Request, response: Response) => {
  try {
    const { username, email, password } = request.body;
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

    const accessToken = signAccessToken({
      sub: account.id,
      username: account.username,
      email: account.email,
    });

    const refreshToken = signRefreshToken({ sub: account.id });
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await prisma.refreshToken.create({
      data: {
        accountId: account.id,
        hashedToken: hashedRefreshToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    setRefreshTokenCookie(response, refreshToken);

    return response.json({
      success: true,
      message: "Login successful.",
      accessToken,
      user: {
        id: account.id,
        username: account.username,
        email: account.email,
      },
    });
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
    response.clearCookie("refreshToken", {
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

export const refresh = async (request: Request, response: Response) => {
  try {
    // get refresh token from cookie
    const refreshToken = request.cookies?.refreshToken;
    if (!refreshToken)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    // verify jwt
    const decoded = verifyRefreshToken(refreshToken);

    // find account
    const account = await prisma.account.findUnique({
      where: { id: decoded.sub },
    });

    if (!account)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    // get valid refresh token
    const storedTokens = await prisma.refreshToken.findMany({
      where: {
        accountId: account.id,
        revokedAt: null,
      },
    });

    let matchedToken = null;
    for (const token of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, token.hashedToken);
      if (isMatch) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken)
      return response.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });

    if (matchedToken.expiresAt < new Date())
      return response.status(401).json({
        success: false,
        message: "Refresh token expired",
      });

    // token rotation

    // revoke old token
    await prisma.refreshToken.update({
      where: {
        id: matchedToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // create new refresh token
    const newRefreshToken = signRefreshToken({ sub: account.id });
    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

    // store new refresh token
    await prisma.refreshToken.create({
      data: {
        accountId: account.id,
        hashedToken: hashedRefreshToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    const accessToken = signAccessToken({
      sub: account.id,
      username: account.username,
      email: account.email,
    });

    setRefreshTokenCookie(response, refreshToken);
    return response.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    console.error("Error during refresh:", error);
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
