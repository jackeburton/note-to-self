import pinecone_datasets
import os
import pinecone


def main():
    print('importing dataset....')
    dataset = pinecone_datasets.load_dataset(
        'wikipedia-simple-text-embedding-ada-002-100K')
    # we drop sparse_values as they are not needed for this example
    dataset.documents.drop(['metadata'], axis=1, inplace=True)
    dataset.documents.rename(columns={'blob': 'metadata'}, inplace=True)
    # we will use rows of the dataset up to index 30_000
    dataset.documents.drop(dataset.documents.index[30_000:], inplace=True)

    PINECONE_API_KEY = os.getenv('PINECONE_API_KEY') or 'PINECONE_API_KEY'
    PINECONE_ENVIRONMENT = os.getenv(
        'PINECONE_ENVIRONMENT') or 'PINECONE_ENVIRONMENT'

    pinecone.init(
        api_key=PINECONE_API_KEY,
        environment=PINECONE_ENVIRONMENT
    )

    index_name = 'langchain-retrieval-augmentation-fast'

    if index_name not in pinecone.list_indexes():
        # we create a new index
        pinecone.create_index(
            name=index_name,
            metric='cosine',
            dimension=1536,  # 1536 dim of text-embedding-ada-002
        )


if __name__ == "__main__":
    main()
