import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const transporter = nodemailer.createTransport({
            host : "smtp.gmail.com",
            port : 587,
            secure : false,
            auth : {
                user : process.env.SMTP_USER,
                pass : process.env.SMTP_PASS,
            }
        });


export const sendEmail = async(to,subject,text,html)=>{
    try{
        if(!to) throw new Error("Receiver email address is required");
        // const verify = async()=>{
        //     try{
        //         await transporter.verify();
        //         console.log("Server is ready to take our messages.");
        //     }catch(error){
        //         console.error("Verification failed : ",error);
        //     }
        // };
        // await verify();
        const info = await transporter.sendMail({
            from : `"BrainDump DEv Tracker <${process.env.SMTP_USER}>`,
            to,
            subject,
            text,
            html
        });
        console.log("Email sent : ", info.messageId);
    }catch(error){
        console.error("Error sending email : ",error);
        throw new Error("Email could not be sent");
    }
};

