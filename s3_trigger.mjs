import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export const handler = async (event, context) => {
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    console.log("key: " + key);
    const extPart = key.slice(key.length - 5).toLowerCase();
    if (extPart.endsWith(".jpg") || extPart.endsWith(".jpeg") || extPart.endsWith(".png")) {
        console.log("supported file: " + key);
    }
}