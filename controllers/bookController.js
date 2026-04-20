import Book from "../models/Book.js";
import Like from "../models/Like.js";
import Download from "../models/Download.js";
import { getUploadURL, getDownloadURL, deleteFileFromS3 } from "../utils/s3.js";
import User from "../models/User.js";

const VALID_YEARS = ["FIRST YEAR", "SECOND YEAR", "THIRD YEAR", "FOURTH YEAR"];
const VALID_DEPARTMENTS = ["IT", "EnTC", "ECE", "AIDS", "CE", "FY (COMMON)"];



export const getUploadUrl = async (req, res) => {
    try {
        const { name, type } = req.query || req.body;
        if (!name || !type) {
            return res.status(400).json({ message: "File name and type required." });
        }
        const { url, fileKey } = await getUploadURL(name, type);
        res.json({ url, fileKey });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error generating upload url." });
    }
};

export const saveBook = async (req, res) => {
    const { title, description, fileKey, year, department, subject, semester, unitName } = req.body;

    if (!title || !description || !fileKey || !year || !department || !subject || !semester || !unitName) {
        return res.status(400).json({ message: "All fields required." });
    }
    if (!VALID_YEARS.includes(year)) {
        return res.status(400).json({ message: "Invalid year." });
    }
    if (!VALID_DEPARTMENTS.includes(department)) {
        return res.status(400).json({ message: "Invalid department." });
    }
    const sem = Number(semester);
    if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
        return res.status(400).json({ message: "Semester must be between 1 and 8." });
    }

    try {
        const book = new Book({
            title,
            description,
            fileKey,
            userId: req.userId,
            year,
            department,
            subject,
            semester: sem,
            unitName,
        });
        await book.save();
        res.json({ message: "Book saved successfully" });
    } catch (error) {
        console.error("DB Save Error : ", error);
        try {
            await deleteFileFromS3(fileKey);
            console.log("Rollback success : s3 file deleted");
        } catch (error) {
            console.error("RollBack failed : ", error);
        }
        res.status(500).json({ message: "Error saving book." });
    }
};

/**
 * GET /api/books
 * Fetches notes from ALL users.
 * Default filter: logged-in user's department (skipped when ?search= is present).
 * Optional filters: ?department=, ?year=, ?semester=
 * Returns likeCount, dislikeCount, downloadCount, and userReaction per note.
 */
export const getBooks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 5, 20);
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        const filter = {};

        // Department filter: explicit param > default to user's department (only when no search)
        if (req.query.department) {
            if (!VALID_DEPARTMENTS.includes(req.query.department)) {
                return res.status(400).json({ message: "Invalid department." });
            }
            filter.department = req.query.department;
        } else if (!search) {
            // Default to logged-in user's department
            const currentUser = await User.findById(req.userId).select("department");
            if (currentUser?.department) {
                filter.department = currentUser.department;
            }
        }

        // Optional year filter
        if (req.query.year) {
            if (!VALID_YEARS.includes(req.query.year)) {
                return res.status(400).json({ message: "Invalid year." });
            }
            filter.year = req.query.year;
        }

        // Optional semester filter
        if (req.query.semester !== undefined && req.query.semester !== "") {
            const sem = Number(req.query.semester);
            if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
                return res.status(400).json({ message: "Semester must be between 1 and 8." });
            }
            filter.semester = sem;
        }

        // Search across text fields
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { subject: { $regex: search, $options: "i" } },
                { unitName: { $regex: search, $options: "i" } },
            ];
        }

        const books = await Book.find(filter)
            .sort({ likeCount: -1, downloadCount: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await Book.countDocuments(filter);

        // Attach userReaction for each book
        const bookIds = books.map((b) => b._id);
        const reactions = await Like.find({ userId: req.userId, bookId: { $in: bookIds } });
        const reactionMap = {};
        reactions.forEach((r) => {
            reactionMap[r.bookId.toString()] = r.type;
        });

        const data = books.map((book) => ({
            ...book.toObject(),
            userReaction: reactionMap[book._id.toString()] || null,
        }));

        res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching books." });
    }
};

/**
 * GET /api/books/mine
 * Fetches only the logged-in user's notes across all departments.
 * Supports ?search= and pagination.
 * Powers the profile/my-notes page.
 */
export const getMyBooks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 5, 20);
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        const filter = { userId: req.userId };

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { subject: { $regex: search, $options: "i" } },
                { unitName: { $regex: search, $options: "i" } },
            ];
        }

        const books = await Book.find(filter)
        .sort({ likeCount: -1, downloadCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);
        const total = await Book.countDocuments(filter);

        res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: books,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching your books." });
    }
};

export const getBookById = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Book.findOne({ _id: id, userId: req.userId });
        if (!book) {
            return res.status(404).json({ message: "Book not found." });
        }
        res.json(book);
    } catch (err) {
        console.error(err);
        if (err.name === "CastError") {
            return res.status(400).json({ message: "Invalid book ID." });
        }
        res.status(500).json({ message: "Error fetching book." });
    }
};

/**
 * GET /api/books/:id/download-url
 * Returns a presigned S3 download URL.
 * Increments downloadCount only on the first download per user per book.
 */
export const getDownloadUrl = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).json({ message: "Book not found." });
        }

        // Check if this user has downloaded before
        const existing = await Download.findOne({ userId: req.userId, bookId: id });
        if (!existing) {
            // First download — record it and increment counter
            await Download.create({ userId: req.userId, bookId: id });
            await Book.findByIdAndUpdate(id, { $inc: { downloadCount: 1 } });
        }

        const url = await getDownloadURL(book.fileKey);
        res.json({ url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error generating download URL." });
    }
};

export const deleteBook = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Book.findOne({ _id: id, userId: req.userId });
        if (!book) {
            return res.status(404).json({ message: "Book not found." });
        }
        await deleteFileFromS3(book.fileKey);
        await Book.findByIdAndDelete(id);
        // Clean up associated likes and downloads
        await Like.deleteMany({ bookId: id });
        await Download.deleteMany({ bookId: id });
        res.json({ message: "Book deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting book." });
    }
};

export const updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, year, department, subject, semester, unitName } = req.body;

        if (!title && !description && !year && !department && !subject && !semester && !unitName) {
            return res.status(400).json({ message: "Nothing to update." });
        }
        if (year && !VALID_YEARS.includes(year)) {
            return res.status(400).json({ message: "Invalid year." });
        }
        if (department && !VALID_DEPARTMENTS.includes(department)) {
            return res.status(400).json({ message: "Invalid department." });
        }
        if (semester !== undefined) {
            const sem = Number(semester);
            if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
                return res.status(400).json({ message: "Semester must be between 1 and 8." });
            }
        }

        const book = await Book.findOne({ _id: id, userId: req.userId });
        if (!book) {
            return res.status(404).json({ message: "Book not found." });
        }

        if (title) book.title = title;
        if (description) book.description = description;
        if (year) book.year = year;
        if (department) book.department = department;
        if (subject) book.subject = subject;
        if (semester !== undefined) book.semester = Number(semester);
        if (unitName) book.unitName = unitName;

        await book.save();
        res.json({ message: "Book updated successfully.", book });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating book." });
    }
};

/**
 * POST /api/books/:id/like
 * 3-way toggle:
 *   No record        → insert like,   +1 likeCount
 *   Same type (like) → delete record, -1 likeCount
 *   Opposite (dislike) → update type, -1 dislikeCount, +1 likeCount
 */
export const likeBook = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).json({ message: "Book not found." });
        }

        const existing = await Like.findOne({ userId: req.userId, bookId: id });

        if (!existing) {
            // Case 1: No record — insert like
            await Like.create({ userId: req.userId, bookId: id, type: "like" });
            await Book.findByIdAndUpdate(id, { $inc: { likeCount: 1 } });
            return res.json({ message: "Liked.", action: "liked" });
        }

        if (existing.type === "like") {
            // Case 2: Already liked — un-like
            await existing.deleteOne();
            await Book.findByIdAndUpdate(id, { $inc: { likeCount: -1 } });
            return res.json({ message: "Like removed.", action: "unliked" });
        }

        // Case 3: Was disliked — switch to like
        existing.type = "like";
        await existing.save();
        await Book.findByIdAndUpdate(id, { $inc: { dislikeCount: -1, likeCount: 1 } });
        return res.json({ message: "Switched to like.", action: "liked" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error processing like." });
    }
};

/**
 * POST /api/books/:id/dislike
 * 3-way toggle (mirror of likeBook):
 *   No record           → insert dislike, +1 dislikeCount
 *   Same type (dislike) → delete record,  -1 dislikeCount
 *   Opposite (like)     → update type,    -1 likeCount, +1 dislikeCount
 */
export const dislikeBook = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).json({ message: "Book not found." });
        }

        const existing = await Like.findOne({ userId: req.userId, bookId: id });

        if (!existing) {
            // Case 1: No record — insert dislike
            await Like.create({ userId: req.userId, bookId: id, type: "dislike" });
            await Book.findByIdAndUpdate(id, { $inc: { dislikeCount: 1 } });
            return res.json({ message: "Disliked.", action: "disliked" });
        }

        if (existing.type === "dislike") {
            // Case 2: Already disliked — un-dislike
            await existing.deleteOne();
            await Book.findByIdAndUpdate(id, { $inc: { dislikeCount: -1 } });
            return res.json({ message: "Dislike removed.", action: "undisliked" });
        }

        // Case 3: Was liked — switch to dislike
        existing.type = "dislike";
        await existing.save();
        await Book.findByIdAndUpdate(id, { $inc: { likeCount: -1, dislikeCount: 1 } });
        return res.json({ message: "Switched to dislike.", action: "disliked" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error processing dislike." });
    }
};