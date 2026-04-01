import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
    title : {
        type : String,
        required : true,
    },
    description : {
        type : String,
        required : true,
    },
    fileKey : {
        type : String,
        required : true,
        unique : true
    },
    createdAt : {
        type : Date,
        default : Date.now,
    },
});

const Book = mongoose.model("Book",bookSchema);

export default Book;


