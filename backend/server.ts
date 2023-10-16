import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { journalEntryRouter } from './routes/journalEntry';
import { pythonRouter } from './routes/python';
import { exec } from 'child_process';
import path from 'path';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000');
const uri = process.env.URI || 'default';
app.use(journalEntryRouter, pythonRouter);

mongoose.connect(uri).then(
    () => { console.log('connected to db'); },
    (err) => { console.error('Connection error:', err); }
);

const pythonScriptPath = path.join(__dirname, 'experiments', 'python_api.py');

const pythonProcess = exec(`python3 ${pythonScriptPath}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`stderr: ${stderr}`);
    }
    console.log(`stdout: ${stdout}`);
});

pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
