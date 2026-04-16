import mongoose from "mongoose";

/*
 * One document per (user, book) pair.
 * The `type` field tracks whether the user liked or disliked the note.
 *
 * Toggle logic (handled in bookController):
 *
 *  Case 1 — No existing record:
 *      → Insert { userId, bookId, type: 'like' }
 *      → $inc likeCount: +1 on Book
 *
 *  Case 2 — Record exists with same type (e.g., already liked, clicks like again):
 *      → Delete the record  (un-like)
 *      → $inc likeCount: -1 on Book
 *
 *  Case 3 — Record exists with opposite type (e.g., disliked, now clicks like):
 *      → Update type to 'like'
 *      → $inc dislikeCount: -1, likeCount: +1 on Book
 *
 * The compound unique index on { userId, bookId } enforces
 * that a user can only have ONE reaction record per note at any time.
 */

const likeSchema = new mongoose.Schema(
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
        type: {
            type: String,
            enum: ["like", "dislike"],
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Enforce one reaction per user per book at the DB level
likeSchema.index({ userId: 1, bookId: 1 }, { unique: true });

const Like = mongoose.model("Like", likeSchema);

export default Like;