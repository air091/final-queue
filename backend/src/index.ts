import "dotenv/config";
import app from "./app.js";

const PORT = Number(process.env.PORT || 4000);

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
