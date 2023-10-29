import time
import pinecone_datasets
import os
from dotenv import load_dotenv
import pinecone
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import Pinecone


def main():

    print('importing dataset....')
    dataset = pinecone_datasets.load_dataset(
        'wikipedia-simple-text-embedding-ada-002-100K')
    # we drop sparse_values as they are not needed for this example
    dataset.documents.drop(['metadata'], axis=1, inplace=True)
    dataset.documents.rename(columns={'blob': 'metadata'}, inplace=True)
    # we will use rows of the dataset up to index 30_000
    dataset.documents.drop(dataset.documents.index[30_000:], inplace=True)
    print('imported and configured dataset')

    load_dotenv()
    PINECONE_API_KEY = os.getenv(
        'PINECONE_API_KEY') or 'PINECONE_API_KEY_DEFAULT'
    PINECONE_ENVIRONMENT = os.getenv(
        'PINECONE_ENVIRONMENT') or 'PINECONE_ENVIRONMENT_DEFAULT'

    print(PINECONE_API_KEY)
    print(PINECONE_ENVIRONMENT)

    pinecone.init(
        api_key=PINECONE_API_KEY,
        environment=PINECONE_ENVIRONMENT
    )

    print('init-ed pinecone')

    index_name = 'note-to-self0'

    if index_name not in pinecone.list_indexes():
        # we create a new index
        pinecone.create_index(
            name=index_name,
            metric='cosine',
            dimension=1536,  # 1536 dim of text-embedding-ada-002
        )
    index = pinecone.GRPCIndex(index_name)
    # wait a moment for the index to be fully initialized
    time.sleep(1)

    print('before upset')
    print(index.describe_index_stats())

    for idx, batch in enumerate(dataset.iter_documents(batch_size=100)):
        index.upsert(batch)
        print(f'Processed Id: {idx}', end="\r")

    print('after upsert')
    print(index.describe_index_stats())

    # get openai api key from platform.openai.com
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY') or 'OPENAI_API_KEY'
    print(OPENAI_API_KEY)

    model_name = 'text-embedding-ada-002'

    embed = OpenAIEmbeddings(
        model=model_name,
        openai_api_key=OPENAI_API_KEY
    )

    text_field = "text"

    # switch back to normal index for langchain
    index = pinecone.Index(index_name)

    vectorstore = Pinecone(
        index, embed.embed_query, text_field
    )

    query = "who was Benito Mussolini?"

    print(vectorstore.similarity_search(
        query,  # our search query
        k=3  # return 3 most relevant docs
    ))


if __name__ == "__main__":
    main()
