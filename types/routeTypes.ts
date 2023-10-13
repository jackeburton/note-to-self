type UploadSuccessResponse = {
    success: true;
    responseString: string;
};

type UploadErrorResponse = {
    success: false;
    responseString: string;
};

type UploadResponse = UploadSuccessResponse | UploadErrorResponse;

type JournalEntryModelType = {
    dateOfEntry: Date;
    journalEntry: string;
    s3Link: string;
    textractJobId: string;
  };

export { UploadResponse, JournalEntryModelType }