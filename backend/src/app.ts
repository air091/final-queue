import dotenv from "dotenv";
import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import authRoutes from "./routers/auth.routes.js";
import communityRoutes from "./routers/community.routes.js";
import friendRoutes from "./routers/friend.routes.js";
import notificationRoutes from "./routers/notification.routes.js";
import publicActionRoutes from "./routers/publicAction.routes.js";
import privateActionRoutes from "./routers/privateAction.routes.js";

dotenv.config();

const configuredOrigins = [
  process.env.CORS_ORIGIN,
  process.env.CORS_ORIGINS,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.RENDER_EXTERNAL_URL,
]
  .flatMap((value) => value?.split(",") ?? [])
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = new Set(["http://localhost:5173", ...configuredOrigins]);

const app: Express = express();
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const frontendDistPath = path.resolve(currentDirectory, "../../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/public/actions", publicActionRoutes);
app.use("/api/private/actions", privateActionRoutes);

if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get(/^\/assets?\//, (_request, response) => {
    response.status(404).type("text/plain").send("Asset not found");
  });

  app.get(/^\/(?!api(?:\/|$)).*/, (_request, response) => {
    response.sendFile(frontendIndexPath);
  });
}

export default app;
