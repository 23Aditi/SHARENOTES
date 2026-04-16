import mongoose from "mongoose";

/*
 * One document per (user, book) pair.
 * Used to track whether a user has already downloaded a note,
 * so we only increment downloadCount once per unique user.
 *
 * Logic (handled in bookController → getDownloadUrl):
 *
 *  If no existing record → insert + $inc downloadCount: +1 on Book
 *  If record exists      → skip increment, just return the URL
 *
 * The compound unique index on { userId, bookId } enforces
 * that only one download record exists per user per book.
 */

const downloadSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        bookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Book",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Enforce one download record per user per book at the DB level
downloadSchema.index({ userId: 1, bookId: 1 }, { unique: true });

const Download = mongoose.model("Download", downloadSchema);

export default Download;