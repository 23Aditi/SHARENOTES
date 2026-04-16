import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
await mongoose.connection.collection("users").dropIndex("username_1");
console.log("Index dropped");
await mongoose.disconnect();