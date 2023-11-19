import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { uploadJournalEntryRouter } from './routes/uploadJournalEntry';
import { getEntriesRouter } from './routes/getEntries'
import cors from 'cors'; 

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000');
const uri = process.env.URI || 'default';


const allowedOrigins = ['http://localhost:8080/']

const corsOptions: cors.CorsOptions = {
	origin: allowedOrigins
};

app.use(cors());

app.use(uploadJournalEntryRouter, getEntriesRouter);

mongoose.connect(uri).then(
    () => { console.log('connected to db'); },
    (err) => { console.error('Connection error:', err); }
);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
