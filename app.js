import express from "express";
import dotenv from "dotenv";
import bookRoutes from "./routes/bookRoutes.js"
import cors from "cors";

dotenv.config();


const app = express();
app.use(cors({
    origin : "http://127.0.0.1:5500"
}));               

app.use(express.json());
app.use(express.static("public"));  

app.use("/api/books",bookRoutes);

export default app;

