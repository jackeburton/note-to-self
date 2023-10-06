import express, { Application, Request, Response } from 'express';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { journalEntryRouter } from './routes/journalEntry';

dotenv.config();

const app: Application = express();
const port: number = parseInt(process.env.PORT || '3000');
const uri: string = (process.env.URI || 'default')
app.use(journalEntryRouter)

mongoose.connect(uri).then(
    () => { console.log('connected to db') },
    (err) => { console.error('Connection error:', err) }
)

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

