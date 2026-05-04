import dotenv from "dotenv";
import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routers/auth.routes.js";
import communityRoutes from "./routers/community.routes.js";
import publicActionRoutes from "./routers/publicAction.routes.js";
import privateActionRoutes from "./routers/privateAction.routes.js";

dotenv.config();

const configuredOrigins = [
  process.env.CORS_ORIGIN,
  process.env.CORS_ORIGINS,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
]
  .flatMap((value) => value?.split(",") ?? [])
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = new Set(["http://localhost:5173", ...configuredOrigins]);

const app: Express = express();

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
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/public/actions", publicActionRoutes);
app.use("/api/private/actions", privateActionRoutes);

export default app;
