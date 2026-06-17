import mongoose from "mongoose";
import config from "../config/config.js";

const connectDb = async () => {
  try {
    await mongoose.connect(config.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    return null;
  }
};

export default connectDb;