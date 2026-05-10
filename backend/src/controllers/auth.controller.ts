import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";
import { setRefreshTokenCookie } from "../lib/cookies.js";
import { uploadImageToCloudinary } from "../lib/cloudinary.js";

const DEFAULT_PROFILE_URL =
  "https://static.vecteezy.com/system/resources/previews/030/750/807/non_2x/user-icon-in-trendy-outline-style-isolated-on-white-background-user-silhouette-symbol-for-your-website-design-logo-app-ui-illustration-eps10-free-vector.jpg";

const accountSelect = {
  id: true,
  username: true,
  email: true,
  profileUrl: true,
  role: true,
} as const;

const getPublicUserById = async (accountId: string) =>
  prisma.account.findUnique({
    where: { id: accountId },
    select: accountSelect,
  });

const buildAccessToken = (account: {
  id: string;
  username: string;
  email: string;
  profileUrl: string;
  role: string;
}) =>
  signAccessToken({
    sub: account.id,
    username: account.username,
    email: account.email,
    profileUrl: account.profileUrl,
    role: account.role,
  });

type UpdateProfileImageBody = {
  imageData?: string;
  removeImage?: boolean;
};

type UpdateProfileBody = {
  username?: string;
};

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
    const account = await prisma.account.create({
      data: {
        username: cleanedUsername,
        email: cleanedEmail,
        password: hashPassword,
      },
    });

    const accessToken = buildAccessToken(account);

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

    return response.status(201).json({
      success: true,
      message: "Account created successfully.",
      accessToken,
      user: {
        id: account.id,
        username: account.username,
        email: account.email,
        profileUrl: account.profileUrl,
        role: account.role,
      },
    });
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

    const accessToken = buildAccessToken(account);

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
        profileUrl: account.profileUrl,
        role: account.role,
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

    const accessToken = buildAccessToken(account);

    setRefreshTokenCookie(response, newRefreshToken);

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

    const account = await getPublicUserById(request.user.sub);

    if (!account) {
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    return response.json({ success: true, user: account });
  } catch (error) {
    console.error("Error during get current user:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

export const updateProfile = async (
  request: Request<unknown, unknown, UpdateProfileBody>,
  response: Response,
) => {
  try {
    if (!request.user) {
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const cleanedUsername = request.body.username?.trim();

    if (!cleanedUsername) {
      return response.status(400).json({
        success: false,
        message: "Username is required.",
      });
    }

    if (cleanedUsername.length < 3) {
      return response.status(400).json({
        success: false,
        message: "Username must be at least 3 characters.",
      });
    }

    if (cleanedUsername.length > 30) {
      return response.status(400).json({
        success: false,
        message: "Username must be 30 characters or fewer.",
      });
    }

    const account = await prisma.account.update({
      where: { id: request.user.sub },
      data: { username: cleanedUsername },
      select: accountSelect,
    });

    const accessToken = buildAccessToken(account);

    return response.json({
      success: true,
      message: "Profile updated successfully.",
      accessToken,
      user: account,
    });
  } catch (error) {
    console.error("Error during profile update:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

export const updateProfileImage = async (
  request: Request<unknown, unknown, UpdateProfileImageBody>,
  response: Response,
) => {
  try {
    if (!request.user) {
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const { imageData, removeImage } = request.body;
    const cleanedImageData = imageData?.trim();

    if (removeImage && cleanedImageData) {
      return response.status(400).json({
        success: false,
        message: "Choose either image upload or remove action",
      });
    }

    if (!removeImage && !cleanedImageData) {
      return response.status(400).json({
        success: false,
        message: "Image data is required",
      });
    }

    if (
      cleanedImageData &&
      !/^data:image\/(?:png|jpe?g|webp|gif|avif);base64,/i.test(
        cleanedImageData,
      )
    ) {
      return response.status(400).json({
        success: false,
        message: "Only PNG, JPG, WEBP, GIF, and AVIF images are supported",
      });
    }

    const profileUrl = removeImage
      ? DEFAULT_PROFILE_URL
      : await uploadImageToCloudinary({
          dataUri: cleanedImageData as string,
          publicId: `queue-system/profile-images/${request.user.sub}`,
        });

    const account = await prisma.account.update({
      where: { id: request.user.sub },
      data: { profileUrl },
      select: accountSelect,
    });

    const accessToken = buildAccessToken(account);

    return response.json({
      success: true,
      message: removeImage
        ? "Profile image removed successfully."
        : "Profile image updated successfully.",
      accessToken,
      user: account,
    });
  } catch (error) {
    console.error("Error during profile image update:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};
