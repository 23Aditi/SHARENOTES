import mongoose from "mongoose";

const connectDB = async() => {
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MOngoDB connected");
    }catch(error){
        console.error(error);
        process.exit(1);
    }
};

export default connectDB;


