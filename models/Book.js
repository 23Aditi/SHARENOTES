import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    fileKey: {
        type: String,
        required: true,
        unique: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    year: {
        type: String,
        required: true,
        enum: ["FIRST YEAR", "SECOND YEAR", "THIRD YEAR", "FOURTH YEAR"],
    },
    department: {
        type: String,
        required: true,
        enum: ["IT", "EnTC", "ECE", "AIDS", "CE", "FY (COMMON)"],
    },
    subject: {
        type: String,
        required: true,
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 8,
    },
    unitName: {
        type: String,
        required: true,
    },
    likeCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    dislikeCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    downloadCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Book = mongoose.model("Book", bookSchema);

export default Book;