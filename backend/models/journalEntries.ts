import mongoose from "mongoose";

interface IJournalEntry {
    dateOfEntry: Date;
    journalEntry: string;
}

interface journalEntryModelInterface extends mongoose.Model<JournalEntryDoc> {
    build(attr: IJournalEntry): JournalEntryDoc
}

interface JournalEntryDoc extends mongoose.Document {
    dateOfEntry: Date;
    journalEntry: string;
}

const JournalEntrySchema = new mongoose.Schema({
    dateOfEntry: {
        type: Date,
        required: false,
        default: Date.now,
    },
    journalEntry: {
        type: String,
        required: false
    },
})

JournalEntrySchema.statics.build = (mongodbData: IJournalEntry) => {
    return new JournalEntryModel(mongodbData)
}

const JournalEntryModel = mongoose.model<JournalEntryDoc, journalEntryModelInterface>('Service', JournalEntrySchema)

export { JournalEntryModel, JournalEntryDoc }