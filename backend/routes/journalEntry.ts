import express, { Request, Response } from 'express'
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { TextractClient, StartDocumentTextDetectionRequest, StartDocumentTextDetectionCommand } from '@aws-sdk/client-textract';
import { config } from 'aws-sdk';
import { JournalEntryModel } from '../models/journalEntries'
import multer, { Multer } from 'multer';
import * as dotenv from 'dotenv';

dotenv.config();

const awsAccessKey = process.env.ACCESS_KEY_ID || 'default'
const awsSecretAccessKey = process.env.SECRET_ACCESS_KEY || 'default'
const region = process.env.REGION || 'default'

config.update({
    region: region,
    credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretAccessKey,
    },
});

console.log('AWS Access Key:', awsAccessKey);
console.log('AWS Secret Access Key:', awsSecretAccessKey);
console.log('AWS Region:', region);

const router = express.Router()
const upload: Multer = multer({ storage: multer.memoryStorage() });
const s3Client = new S3Client({ region: process.env.REGION });
const textract = new TextractClient({ region: process.env.REGION });
const LANGUAGE = 'eng'
const { v4: uuidv4 } = require('uuid');

// post 
// Need a UUID
// Need a date
// Need a s3link
// Need a description
// any information that OCR gives us

// get for an ID
// get for a date and list of dates?
// get for a s3 link
// post with s3 link


router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {

    const s3ObjectKey: string = uuidv4();

    const file = req.file;

    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const result = await uploadToS3(file, s3ObjectKey);
        console.log('File uploaded to S3:', result);
    } catch (error) {
        console.error('Error uploading to S3:', error);
        res.status(500).send('Error uploading to S3');
    }

    try {
        const jobId = await uploadToTextract(s3ObjectKey);
        console.log('File uploaded to textract:', jobId);
        res.status(200).send('Success');
    } catch (error) {
        console.error('Error uploading to textract:', error);
        res.status(500).send('Error uploading to textract');
    }

});


async function uploadToTextract(s3ObjectKey: string): Promise<string | undefined> {
    const textractParams: StartDocumentTextDetectionRequest = {
        DocumentLocation: {
            S3Object: {
                Bucket: process.env.BUCKET_NAME || 'default_bucket',
                Name: s3ObjectKey,
            },
        },
    };
    const startDocumentTextDetectionCommand = new StartDocumentTextDetectionCommand(textractParams);

    try {
        const textractResponse = await textract.send(startDocumentTextDetectionCommand);

        if (textractResponse.JobId) {
            return textractResponse.JobId;
        } else {
            console.error('Textract response did not include a JobId.');
            return undefined;
        }
    } catch (error) {
        console.error('Error uploading to Textract:', error);
        throw error;
    }
}

async function uploadToS3(file: Express.Multer.File, objectKey: string): Promise<Upload> {
    const params = {
        Bucket: process.env.BUCKET_NAME || 'default_bucket',
        Key: objectKey,
        Body: file.buffer
    };

    const upload = new Upload({
        client: s3Client,
        params
    });

    await upload.done();
    return upload;
}

export { router as journalEntryRouter }