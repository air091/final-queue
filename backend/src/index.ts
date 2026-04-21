import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const PORT: number = Number(process.env.PORT);

app.use(express.json());
app.use(cookieParser());

import authRoutes from "./routers/auth.routes.js";
import communityRoutes from "./routers/community.routes.js";

app.use("/api/auth", authRoutes);
app.use("/api/community", communityRoutes);

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
