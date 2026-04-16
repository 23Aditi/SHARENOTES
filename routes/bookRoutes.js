import express from "express";
import {
    getUploadUrl,
    saveBook,
    getBooks,
    getMyBooks,
    getBookById,
    getDownloadUrl,
    deleteBook,
    updateBook,
    likeBook,
    dislikeBook,
} from "../controllers/bookController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/upload-url", getUploadUrl);

// /mine must be registered before /:id to avoid Express treating "mine" as an ID param
router.get("/mine", getMyBooks);

router.get("/", getBooks);
router.post("/", saveBook);

router.get("/:id/download-url", getDownloadUrl);
router.post("/:id/like", likeBook);
router.post("/:id/dislike", dislikeBook);
router.get("/:id", getBookById);
router.put("/:id", updateBook);
router.delete("/:id", deleteBook);

export default router;