import { S3Client } from '@aws-sdk/client-s3';
import { uploadToS3 } from '../backend/routes/journalEntry';
import { Readable } from 'stream';

const mS3Instance = {
    upload: jest.fn().mockReturnThis(),
    promise: jest.fn(),
};

jest.mock('aws-sdk', () => {
    return { 
        config: {
            update: jest.fn(), // Mock the AWS SDK configuration update
        },
        S3: jest.fn(() => mS3Instance)
     };
});

describe('uploadToS3', () => {
    it('should succesfully upload a file to s3', async () => {
        // Mock S3Client and its send method
        const mockSend = jest.fn();
        S3Client.prototype.send = mockSend;

        // Set up a successful response
        mockSend.mockResolvedValue({
            ResponseMetadata: {
                HTTPStatusCode: 200,
            },
        });

        const mockS3Service = new S3Client(); // Create a mock S3 service
        const mockS3Params = createTestEntryData();
        const s3Result = await uploadToS3(mockS3Params, mockS3Service); // Pass the mock S3 service

        expect(s3Result.success).toBe(true);
        expect(s3Result.responseString).toBe('Entry uploaded to s3');
    });
    it('should fail to upload a file to s3', async () => {
            // Mock S3Client and its send method
            const mockSend = jest.fn();
            S3Client.prototype.send = mockSend;
    
            // Set up a successful response

            const errorResponse = new Error('S3 upload failed');
            mockSend.mockRejectedValue(errorResponse);
                
            const mockS3Service = new S3Client(); // Create a mock S3 service
            const mockS3Params = createTestEntryData();
            const s3Result = await uploadToS3(mockS3Params, mockS3Service); // Pass the mock S3 service
    
            expect(s3Result.success).toBe(false);
            expect(s3Result.responseString).toBe('Error uploading to s3');
    });
});

function createTestEntryData(){
    const file: Express.Multer.File = {
        originalname: 'file.csv',
        mimetype: 'text/csv',
        path: 'something',
        buffer: Buffer.from('one,two,three'),
        fieldname: '',
        encoding: '',
        size: 0,
        stream: new Readable,
        destination: '',
        filename: ''
    }; 

    return {
        Bucket: 'mock_s3Bucket',
        Key: 'mock_s3_key',
        body: file,
    }
}