import app from "./src/app.js";
import connectDB from "./src/db/db.js";
import { connectRedis } from "./src/db/redis.js";

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ message: "Auth service is running" });
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Authentication server running on port ${PORT}`);

  try {
    await connectDB();
    console.log("MongoDB connected after server start");
  } catch (error) {
    console.error("MongoDB failed after server start:", error.message);
  }

   try {
    await connectRedis();
  } catch (error) {
    console.error("Redis failed:", error.message);
  }
});