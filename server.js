import app from "./app.js";
import connectDB from "./config/db.js";
import Book from "./models/Book.js";


const PORT = process.env.PORT || 3000;

// const test = async()=>{
//     const b = new Book({
//         title : "Test book",
//         description : "hdsjkdhfsjk",
//         fileKey : "test.pdf",
//     });
//     await b.save();
//     console.log("Saved test book");
// };

// const checkDB = async()=>{
//     try{
//         const books = await Book.find();
//         console.log("Books in DB : ");
//         console.log(books);
//     }catch(error){
//         console.error(error);
//     }
// };

const startServer = async()=>{
    try{
        await connectDB();

        app.listen(PORT,()=>{
            console.log(`Server running at port ${PORT}`);
        });
    }catch(e){
        console.error(e);
    }
};

startServer();







