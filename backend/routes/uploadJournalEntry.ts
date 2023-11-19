import { Router, Request, Response } from 'express'
import https from "https";
import { JournalEntryModel, JournalEntryDoc } from '../models/journalEntries'
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ConfigurationOptions, config } from 'aws-sdk';
import { Model } from 'mongoose';
import { APIResponse } from '../types/routeTypes';
import { GlobalConfigInstance } from 'aws-sdk/lib/config';
import multer from 'multer';
import * as dotenv from 'dotenv';
import OpenAI from "openai";

dotenv.config();

const router = Router();
const storage = multer.memoryStorage();
const awsAccessKey = process.env.ACCESS_KEY_ID || 'default';
const awsSecretAccessKey = process.env.SECRET_ACCESS_KEY || 'default';
const region = process.env.REGION || 'default';
const s3Client = new S3Client({ region: region });
const { v4: uuidv4 } = require('uuid');
const s3Bucket = process.env.BUCKET_NAME || 'default_bucket';
const upload = multer({ storage });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const awsConfig = {
    region: region,
    credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretAccessKey,
    },
}

configureAWS(config, awsConfig)

function configureAWS(config:GlobalConfigInstance, options:ConfigurationOptions){
    config.update(options)
};

router.post('/upload-journal-entry', upload.single('file'), async (req: Request, res: Response) => {
    // query openai with the journal image
    const s3ObjectKey: string =  uuidv4()
    const dateOfEntry: Date = new Date(req.body.dateOfEntry)
    
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const putUrl = await createPresignedPut({
            s3Client: s3Client,
            bucket: s3Bucket,
            key: s3ObjectKey,
        });

    console.log("Calling PUT");
    try{    
        await put(putUrl, req.file.buffer); 
    }
    catch (err) {
        console.log('bin')
        return res.status(400).send('upload no worky');
    }
    console.log('upload worky')

    console.log("Calling GET");
    let getUrl = ''
    try{    
        getUrl = await createPresignedGet({
            s3Client: s3Client,
            bucket: s3Bucket,
            key: s3ObjectKey,
        })
    }
    catch (err) {
        console.log('bin')
        return res.status(400).send('get no worky');
    }
    console.log(getUrl)

    let text = ''
    const getTextFromImageResponse = await getTextFromImage({imageUrl: getUrl})
    if (getTextFromImageResponse.success){
        text = getTextFromImageResponse.responseString
    } else {
        console.log('bin')
    return res.status(400).send('openai no worky');
    }
    console.log(text)

    const saveResult = await uploadToDb(dateOfEntry, text, JournalEntryModel);

    if (saveResult.success) {
        console.log('Entry saved successfully:', saveResult.responseString);
    } else {
        console.error('Error saving entry:', saveResult.responseString);
        return res.status(500).send('Error saving entry');
    }

    const deleteS3Entry = await deleteObject({
        s3Client: s3Client,
        bucket: s3Bucket,
        key: s3ObjectKey,}
    )
    
    if (deleteS3Entry.success) {
        console.log('S3 entry deleted successfully:', deleteS3Entry.responseString);
    } else {
        console.error('Error deleting entry:', deleteS3Entry.responseString);
        return res.status(500).send('Error deleting s3 entry');
    }

    return res.status(200).send(text);

});

function put(url: string, data: Buffer) {
    return new Promise((resolve, reject) => {
        const req = https.request(
            url,
            { method: "PUT", headers: { "Content-Length": Buffer.byteLength(data) } },
            (res) => {
                let responseBody = "";
                res.on("data", (chunk) => {
                    responseBody += chunk;
                });
                res.on("end", () => {
                    resolve(responseBody);
                });
            },
        );
        req.on("error", (err) => {
            reject(err);
        });
        req.write(data);
        req.end();
    });
};

const createPresignedPut = ({ s3Client, bucket, key }: { s3Client: S3Client; bucket: string; key: string }) => {
    const command = new PutObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

const createPresignedGet = ({ s3Client, bucket, key }: { s3Client: S3Client; bucket: string; key: string }) => {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

const deleteObject = async ({ s3Client, bucket, key }: { s3Client: S3Client; bucket: string; key: string }) => {
    const command = new DeleteObjectCommand({Bucket: bucket,Key: key,});
    try {
        const response = await s3Client.send(command);
        console.log("Object deleted", response);
        return { success: true, responseString: 'Obj deleted'};
    } catch (error) {
        return { success: true, responseString: `Error deleting object, ${error}`}
    }
};

const getTextFromImage = async ({imageUrl} : { imageUrl: string}) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "What does the text in this image say? \
                                            Respond with only the text in the image,\
                                            no newline statements, just the raw text itself\
                                            make it syntactically correct and properly punctuated\
                                            with no crossed out words." },
                        {
                            type: "image_url",
                            image_url: {
                                url:  imageUrl
                            }
                        },
                    ],
                },
            ],
            "max_tokens": 300
        });
        if (response.choices[0].message.content){
            return { success: true, responseString:response.choices[0].message.content}
        } else {
            return { success: false, responseString: 'response empty' };
        }
    } catch (err) {
        return { success: false, responseString: `Error processing text : ${err}` };
    }
};

async function uploadToDb(dateOfEntry: Date,journalEntry: string, journalEntryModel: Model<JournalEntryDoc>): Promise<APIResponse> {
    const newEntry = new journalEntryModel({
        dateOfEntry: dateOfEntry,
        journalEntry: journalEntry,
    });

    try {
        await newEntry.save();
        return { success: true, responseString: 'Entry uploaded to db' };
    } catch (err) {
        return { success: false, responseString: 'Error uploading entry to db' };
    }
};


export { router as uploadJournalEntryRouter }
