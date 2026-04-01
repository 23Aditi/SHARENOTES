import { S3Client, PutObjectCommand , GetObjectCommand , DeleteObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {randomUUID} from "crypto";
import dotenv from "dotenv";

dotenv.config();

const s3 = new S3Client({
    region : process.env.AWS_REGION,
    credentials : {
        accessKeyId : process.env.AWS_ACCESS_KEY,
        secretAccessKey : process.env.AWS_SECRET_KEY
    },
});


export const generateFileKey = (originalName) =>{
    const cleanName = originalName.replace(/\s+/g,"-");
    return `${randomUUID()}-${cleanName}`;
};

export const getUploadURL = async(fileName,fileType) =>{
    const fileKey = generateFileKey(fileName);
    const command = new PutObjectCommand({
        Bucket : process.env.AWS_BUCKET_NAME,
        Key : fileKey,
        ContentType : fileType,
    });
    const url = await getSignedUrl(s3,command,{
        expiresIn : 60, // 1 minute
    });
    return {url,fileKey};
};

export const getDownloadURL = async(fileKey)=>{
    const command = new GetObjectCommand({
        Bucket : process.env.AWS_BUCKET_NAME,
        Key : fileKey,
    });
    const url = await getSignedUrl(s3,command, {
        expiresIn : 300, // 5 minutes
    });
    return url;
};

export const deleteFileFromS3 = async(fileKey) =>{
    const command = new DeleteObjectCommand({
        Bucket : process.env.AWS_BUCKET_NAME,
        Key : fileKey,
    });
    await s3.send(command);
};


