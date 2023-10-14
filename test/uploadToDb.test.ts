import { uploadToDb } from '../backend/routes/journalEntry';
import { JournalEntryModel } from '../backend/models/journalEntries';
import mongoose, { Model } from 'mongoose';

const uri: string = (process.env.URI || 'default')

beforeAll(async () => {
  console.log(uri)
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('uploadToDb', () => {
    
    it('should upload data to the database and return a success response', async () => {
        JournalEntryModel.prototype.save = jest.fn().mockResolvedValue(new JournalEntryModel({
            dateOfEntry: new Date(),
            journalEntry: 'mock_journal_entry',
            s3Link: 'mock_s3_link',
            textractJobId: 'mock_textract_id',
        }));

        const { dateOfEntry, s3ObjectKey, jobId } = createTestEntryData();

        const dbResult = await uploadToDb(dateOfEntry, s3ObjectKey, jobId, JournalEntryModel);

        expect(JournalEntryModel.prototype.save).toBeCalled(); // Check if 'save' was called
        expect(dbResult.success).toBe(true);
        expect(dbResult.responseString).toBe('Entry uploaded to db');
    });

    it('should try to upload data to the database and return a fail response', async () => {
        JournalEntryModel.prototype.save = jest.fn().mockRejectedValue(new Error('Database error'));

        const { dateOfEntry, s3ObjectKey, jobId } = createTestEntryData();

        const dbResult = await uploadToDb(dateOfEntry, s3ObjectKey, jobId, JournalEntryModel);

        expect(JournalEntryModel.prototype.save).toBeCalled(); // Check if 'save' was called
        expect(dbResult.success).toBe(false);
        expect(dbResult.responseString).toBe('Error uploading entry to db');
    });
})

function createTestEntryData() {
    const dateOfEntry = new Date();
    const s3ObjectKey = 'mock_obj_key';
    const jobId = 'mock_job_id';
    return { dateOfEntry, s3ObjectKey, jobId }
  }