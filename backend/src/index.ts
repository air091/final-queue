import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const PORT: number = Number(process.env.PORT);

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
