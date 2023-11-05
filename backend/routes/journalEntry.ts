import { Router, Request, Response } from 'express'
import { PutObjectCommand, PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { TextractClient, StartDocumentTextDetectionRequest, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand, GetDocumentTextDetectionRequest } from '@aws-sdk/client-textract';
import { ConfigurationOptions, config } from 'aws-sdk';
import { JournalEntryModel, JournalEntryDoc } from '../models/journalEntries'
import { Model } from 'mongoose';
import { Upload } from "@aws-sdk/lib-storage";
import { APIResponse, APIDataResponse } from '../../types/routeTypes';
import multer from 'multer';
import * as dotenv from 'dotenv';
import { GlobalConfigInstance } from 'aws-sdk/lib/config';
import OpenAI from "openai";

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
}

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    console.log('recieved /upload post request')
    let jobId: string = '';
    const s3ObjectKey: string =  uuidv4()
    const dateOfEntry: Date = new Date(req.body.dateOfEntry)

    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const s3UploadParams = {
            Bucket: s3Bucket,
            Key: s3ObjectKey,
            Body: req.file.buffer,
        }
        const s3result = await uploadToS3new(s3UploadParams, s3Client);
        console.log('File uploaded to S3 :', s3result);
    } catch (error) {
        console.error('Error uploading to S3:', error);
        return res.status(500).send('Error uploading to S3');
    }

    try {
        const textractJobId = await uploadToTextract(s3ObjectKey);
        if (!textractJobId) {
            console.log('Textract did not return a jobId.');
        } else {
            console.log('File uploaded to textract:', textractJobId);
            jobId = textractJobId.responseString;
        }
    } catch (error) {
        console.error('Error uploading to textract:', error);
        return res.status(500).send('Error uploading to textract');
    }

    const saveResult = await uploadToDb(dateOfEntry,'', s3ObjectKey, jobId, JournalEntryModel);

    if (saveResult.success) {
        console.log('Entry saved successfully:', saveResult.responseString);
        res.status(200).send('Success');
    } else {
        console.error('Error saving entry:', saveResult.responseString);
        return res.status(500).send('Error saving entry');
    }

});

router.get('/check-textract-status-and-process-entries', async (req: Request, res: Response) => {
    // get the jobid for all mongo entries with blank text fields
    const getEntriesResponse = await getEntriesWithNoText(JournalEntryModel)
    
    if (!getEntriesResponse.success) {
        console.error('Error getting entries:', getEntriesResponse.responseString);
        return res.status(500).send('Error getting entries');
    }
    
    // check the jobids to see if they have finished processing - store the number in a count
    const countOfEntries = getEntriesResponse.responseData.length
    console.log(`Found ${countOfEntries} entries with no text. Processing jobIds`)
    const entriesWithJobId = getEntriesResponse.responseData.filter((item: JournalEntryDoc) => item.textractJobId !== '');
    console.log(`Found ${entriesWithJobId.length} entries with jobId. Processing textract jobs`)
    
    // for the ones that have finished - upload the text fields to the mongo db entry
    for (const entry of entriesWithJobId){
	const idToUpdate = entry['_id']

        const textractJobStatus = await checkTextractJobStatus(entry['textractJobId'])
        if (textractJobStatus.success){
            console.log(getTextractData(textractJobStatus.responseData))
	    const originalText = await getTextractData(textractJobStatus.responseData)
	    const correctedText = await getFixedJournalEntry(originalText)
	    const update = {
		    journalEntry: correctedText
	    }
	
	    JournalEntryModel.findByIdAndUpdate(idToUpdate, update, {new: true}, (err, doc) => {
		if (err) {
			console.log('Error during updating the document:', err);
		} else {
			console.log('Document after update:', doc);
		}		
	    });

        } else {
            console.log(`could not find textract job for job with id: ${entry['textractJobId']}`)
        }
    }
    return res.status(200).send('All done bossman')
    
});

router.get('/get-all-populated-entries', async (req: Request, res: Response) => {
    console.log('getting everything')
    const getEntriesResponse = await JournalEntryModel.find({journalEntry: { $ne: '' }}).exec();
    res.status(200).send(getEntriesResponse)
});

router.get('/textract-checking-DEPRECIATE', async (req: Request, res: Response) => {
    //this works so it means something is wrong with the step before it
    try {
        const textractJobId = await uploadToTextract('bc944c6b-5332-467a-b188-78db8aa9b820');
        if (!textractJobId) {
            console.log('Textract did not return a jobId.');
        } else {
            console.log('File uploaded to textract:', textractJobId);
            res.status(200).send('All good bossman');
        }
    } catch (error) {
        console.error('Error uploading to textract:', error);
        res.status(500).send('Error uploading to textract');
    }
});

router.get('/gpttest', async (req: Request, res: Response) => {
	const chatCompletion = await openai.chat.completions.create({
    		messages: [{ role: "user", content: "Say this is a test" }],
		model: "gpt-3.5-turbo",
	});
	res.status(200).send(chatCompletion.choices[0].message.content);
});

async function getFixedJournalEntry(badText: string): Promise<string> {
	const query = `Make this text syntacticallty correct : ${badText}`
	const chatCompletion = await openai.chat.completions.create({
    		messages: [{ role: "user", content: query}],
		model: "gpt-3.5-turbo",
	});
	const goodText = chatCompletion.choices[0].message.content || 'gpt failure'
	return goodText
}

async function uploadToDb(dateOfEntry: Date,journalEntry: string, s3ObjectKey: string, jobId: string, journalEntryModel: Model<JournalEntryDoc>): Promise<APIResponse> {
    const newEntry = new journalEntryModel({
        dateOfEntry: dateOfEntry,
        journalEntry: journalEntry,
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

async function getEntriesWithNoText(journalEntryModel: Model<JournalEntryDoc>): Promise<APIDataResponse>{
    try{
        const journalEntries = await journalEntryModel.find({journalEntry: ''}).exec();
        return { success: true, responseData: journalEntries };
    } catch (error){
        return { success: false, responseString: 'Error querying MongoDB'};
    }
    
}

async function checkTextractJobStatus(textractJobId: string): Promise<APIDataResponse>{
    const textractParams: GetDocumentTextDetectionRequest = {
        JobId: textractJobId,
      };
    try{
        const getDocumentTextDetectionCommand = new GetDocumentTextDetectionCommand(textractParams);
        const textractResponse = await textract.send(getDocumentTextDetectionCommand);
        return { success: true, responseData: textractResponse};
    }catch(error){
        console.log(error)
        return { success: false, responseString: 'Error querying Textract'};
    }
}

async function uploadToTextract(s3ObjectKey: string): Promise<APIResponse> {
    const textractParams: StartDocumentTextDetectionRequest = {
        DocumentLocation: {
            S3Object: {
                Bucket: s3Bucket,
                Name: s3ObjectKey,
            },
        },
    };

    try {
        console.log('Uploading to textract s3 object key :', s3ObjectKey)
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

async function uploadToS3(s3UploadParams:PutObjectCommandInput, s3Client:S3Client): Promise<APIResponse> {
    // files are becoming empty when uploaded
    const command = new PutObjectCommand(
        s3UploadParams
    );

    try {
        await s3Client.send(command);
        return { success: true, responseString: `Entry uploaded to s3 : ${s3UploadParams.Key}`};
    } catch (err) {
        return { success: false, responseString: 'Error uploading to s3' };
    }
}

async function uploadToS3new(s3UploadParams: PutObjectCommandInput, s3Client: S3Client): Promise<APIResponse> {
    try {
        const uploader = new Upload({
            client: s3Client,
            params: s3UploadParams
        });

        await uploader.done();

        return { success: true, responseString: `Entry uploaded to s3 : ${s3UploadParams.Key}`};
    } catch (err) {
        return { success: false, responseString: `Error uploading to s3 : ${err}` };
    }
}

function getTextractData(responseData: any): string {
    let block_lines = ""
    for (const block of responseData.Blocks) {
        if (block.BlockType == "LINE") {
            block_lines = block_lines.concat("\n", block.Text);
        }
    }
    return block_lines
}

export { router as journalEntryRouter, uploadToDb, uploadToS3, configureAWS }


