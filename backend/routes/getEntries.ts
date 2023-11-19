import { Router, Request, Response } from 'express'
import { JournalEntryModel, JournalEntryDoc } from '../models/journalEntries'
import OpenAI from 'openai';

const router = Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.get('/get-all-populated-entries', async (req: Request, res: Response) => {
    console.log('getting everything')
    const getEntriesResponse = await JournalEntryModel.find({journalEntry: { $ne: '' }}).exec();
    return res.status(200).send(getEntriesResponse)
});

router.get('/get-entries-from-today', async (req: Request, res: Response) => {
	const getEntriesResponse = await getTodaysEntries()
	return res.status(200).send(getEntriesResponse)
});

router.get('/analyze-todays-entries', async (req: Request, res: Response) => {
	const entriesResponse = await getTodaysEntries()
	let entriesText = ''
	for (const entry of entriesResponse){
		entriesText += entry.journalEntry
	}
	const entryAnalysis = await analyzeEntry({textEntry : entriesText})
	return res.status(200).send(entryAnalysis)
});

const getTodaysEntries = async () => {
	const startOfToday = new Date();
	const endOfToday = new Date();

	startOfToday.setHours(0, 0, 0, 0);
	endOfToday.setHours(23, 59, 59, 999);

	console.log('getting todays entries')
	const getEntriesResponse = await JournalEntryModel.find({dateOfEntry: { 
		$gte: startOfToday,
		$lte: endOfToday
	}}).exec();
	return getEntriesResponse
};

const analyzeEntry = async ({textEntry} : { textEntry: string}) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
            messages: [
                {
                    role: "system",
                    content: "A user is providing a journal entry from today, reflecting on their personal experiences and feelings. \
							  Analyze the content of the journal entry, and offer thoughtful insights or advice that will help the user \
							  focus on positive elements and what may be important to keep in mind for the rest of the day."
                },
				{
                    role: "user",
                    content: textEntry
                }
            ],
            "max_tokens": 1500
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


export { router as getEntriesRouter }
