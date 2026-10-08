import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDb() {
  await mongoose.connect(config.MONGODB_URI, {
    dbName: config.MONGODB_DB,
    serverSelectionTimeoutMS: 10_000,
  });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
