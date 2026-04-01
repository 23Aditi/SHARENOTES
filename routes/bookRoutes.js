import express from "express";
import {
    getUploadUrl,
    saveBook,
    getBooks,
    getBookById,
    getDownloadUrl,
    deleteBook,
    updateBook
} from "../controllers/bookController.js";


const router = express.Router();

router.post("/upload-url", getUploadUrl);
router.get("/:id/download-url", getDownloadUrl);

router.get("/", getBooks);
router.get("/:id", getBookById);
router.post("/", saveBook);
router.put("/:id", updateBook);
router.delete("/:id", deleteBook);
export default router;