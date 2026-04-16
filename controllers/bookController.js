import Book from "../models/Book.js";
import { getUploadURL, getDownloadURL, deleteFileFromS3 } from "../utils/s3.js";

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

export const getBooks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 5, 20);
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        const filter = {
            userId: req.userId,
            $or: [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { subject: { $regex: search, $options: "i" } },
                { unitName: { $regex: search, $options: "i" } },
            ],
        };

        const books = await Book.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
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
        res.status(500).json({ message: "Error fetching books." });
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

export const getDownloadUrl = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Book.findOne({ _id: id, userId: req.userId });
        if (!book) {
            return res.status(404).json({ message: "Book not found." });
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