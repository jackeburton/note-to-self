import express, { Request, Response } from 'express'
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";
import { TextractClient, StartDocumentTextDetectionRequest, StartDocumentTextDetectionCommand } from '@aws-sdk/client-textract';
import { config } from 'aws-sdk';
import { JournalEntryModel } from '../models/journalEntries'
import multer, { Multer } from 'multer';
import * as dotenv from 'dotenv';

dotenv.config();

const awsAccessKey = process.env.ACCESS_KEY_ID || 'default'
const awsSecretAccessKey = process.env.SECRET_ACCESS_KEY || 'default'
const region = process.env.REGION || 'default'
const s3Bucket = process.env.BUCKET_NAME || 'default_bucket'
const router = express.Router()
const upload: Multer = multer({ storage: multer.memoryStorage() });
const s3Client = new S3Client({ region: process.env.REGION });
const textract = new TextractClient({ region: process.env.REGION });
const { v4: uuidv4 } = require('uuid');

config.update({
    region: region,
    credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretAccessKey,
    },
});

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    console.log('recieved /upload post request')
    const s3ObjectKey: string = uuidv4();
    let jobId: string | undefined;
    const file = req.file;
    const dateOfEntry: Date = new Date(req.body.dateOfEntry)

    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const s3result = await uploadToS3(file, s3ObjectKey);
        console.log('File uploaded to S3');
    } catch (error) {
        console.error('Error uploading to S3:', error);
        res.status(500).send('Error uploading to S3');
    }

    try {
        jobId = await uploadToTextract(s3ObjectKey);
        console.log('File uploaded to textract');
        if (!jobId) {
            return res.status(500).send('Textract did not return a jobId.');
        }
    } catch (error) {
        console.error('Error uploading to textract:', error);
        res.status(500).send('Error uploading to textract');
    }

    console.log(jobId);
    console.log(!jobId);

    const newEntry = new JournalEntryModel({
        dateOfEntry: dateOfEntry,
        journalEntry: '',
        s3Link: `${s3Bucket}/${s3ObjectKey}`,
        textractJobId: jobId,
    });

    newEntry.save()
        .then((savedEntry) => {
            console.log('Entry saved successfully');
            res.status(200).send('Success');
        })
        .catch((err) => {
            console.error('Error saving entry:', err);
            res.status(500).send('Error saving entry');
        });

});

async function uploadToTextract(s3ObjectKey: string): Promise<string | undefined> {
    const textractParams: StartDocumentTextDetectionRequest = {
        DocumentLocation: {
            S3Object: {
                Bucket: s3Bucket,
                Name: s3ObjectKey,
            },
        },
    };
    const startDocumentTextDetectionCommand = new StartDocumentTextDetectionCommand(textractParams);

    try {
        const textractResponse = await textract.send(startDocumentTextDetectionCommand);

        if (textractResponse.JobId) {
            console.log('jobid', textractResponse.JobId)
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
        Bucket: s3Bucket,
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