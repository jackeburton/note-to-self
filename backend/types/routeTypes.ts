type APISuccessResponse = {
    success: true;
    responseString: string;
};

type APIErrorResponse = {
    success: false;
    responseString: string;
};

type APIResponseWithData = {
    success: true;
    responseData: any;
};

type APIResponse = APISuccessResponse | APIErrorResponse;
type APIDataResponse = APIResponseWithData | APIErrorResponse;

type JournalEntryModelType = {
    dateOfEntry: Date;
    journalEntry: string;
    s3Link: string;
    textractJobId: string;
};


export { APIResponse, APIDataResponse,  JournalEntryModelType }