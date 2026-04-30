import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config();

const app = express();
const PORT: number = Number(process.env.PORT);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

import authRoutes from "./routers/auth.routes.js";
import communityRoutes from "./routers/community.routes.js";
import publicActionRoutes from "./routers/publicAction.routes.js";
import privateActionRoutes from "./routers/privateAction.routes.js";

app.use("/api/auth", authRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/public/actions", publicActionRoutes);
app.use("/api/private/actions", privateActionRoutes);

async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
  }
}

startServer();
