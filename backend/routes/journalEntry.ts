import { Router, Request, Response } from 'express'
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";
import { TextractClient, StartDocumentTextDetectionRequest, StartDocumentTextDetectionCommand } from '@aws-sdk/client-textract';
import { config } from 'aws-sdk';
import { JournalEntryModel, JournalEntryDoc } from '../models/journalEntries'
import { Model } from 'mongoose';
import { UploadResponse } from '../../types/routeTypes';
import multer from 'multer';
import * as dotenv from 'dotenv';

dotenv.config();

const router = Router();
const awsAccessKey = process.env.ACCESS_KEY_ID || 'default';
const awsSecretAccessKey = process.env.SECRET_ACCESS_KEY || 'default';
const region = process.env.REGION || 'default';
const s3Bucket = process.env.BUCKET_NAME || 'default_bucket';
const storage = multer.memoryStorage();
const upload = multer({ storage });
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
    let jobId: string = '';
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
        const textractResponse = await uploadToTextract(s3ObjectKey);
        console.log('File uploaded to textract');
        if (!textractResponse) {
            console.log('Textract did not return a jobId.');
        }
    } catch (error) {
        console.error('Error uploading to textract:', error);
        res.status(500).send('Error uploading to textract');
    }

    const saveResult = await uploadToDb(dateOfEntry, s3ObjectKey, jobId, JournalEntryModel);

    console.log(jobId);
    console.log(!jobId);

    if (saveResult.success) {
        console.log('Entry saved successfully:', saveResult.responseString);
        res.status(200).send('Success');
    } else {
        console.error('Error saving entry:', saveResult.responseString);
        res.status(500).send('Error saving entry');
    }


});

async function uploadToDb(dateOfEntry: Date, s3ObjectKey: string, jobId: string, journalEntryModel: Model<JournalEntryDoc>): Promise<UploadResponse> {
    const newEntry = new journalEntryModel({
        dateOfEntry: dateOfEntry,
        journalEntry: '',
        s3Link: `${s3Bucket}/${s3ObjectKey}`,
        textractJobId: jobId,
    });

    try {
        await newEntry.save();
        return { success: true, responseString: 'Entry uploaded to db' };
    } catch (err) {
        return { success: false, responseString: 'Error uploading entry to db' };
    }
}

async function uploadToTextract(s3ObjectKey: string): Promise<UploadResponse> {
    const textractParams: StartDocumentTextDetectionRequest = {
        DocumentLocation: {
            S3Object: {
                Bucket: s3Bucket,
                Name: s3ObjectKey,
            },
        },
    };

    try {
        const startDocumentTextDetectionCommand = new StartDocumentTextDetectionCommand(textractParams);
        const textractResponse = await textract.send(startDocumentTextDetectionCommand);

        if (textractResponse.JobId) {
            return { success: true, responseString: textractResponse.JobId };
        } else {
            console.error('Textract response did not include a Job ID.');
            return { success: true, responseString: '' };
        }
    } catch (error) {
        console.error('Error uploading to Textract:', error);
        return { success: false, responseString: 'Error uploading to Textract' };
    }
}

async function uploadToS3(file: Express.Multer.File, objectKey: string): Promise<UploadResponse> {
    const params = {
        Bucket: s3Bucket,
        Key: objectKey,
        Body: file.buffer
    };

    const upload = new Upload({
        client: s3Client,
        params
    });

    try {
        await upload.done();
        return { success: true, responseString: 'Entry uploaded to s3' };
    } catch (err) {
        console.error('Error saving entry:', err);
        return { success: false, responseString: 'Error uploading to s3' };
    }
}

export { router as journalEntryRouter, uploadToDb }