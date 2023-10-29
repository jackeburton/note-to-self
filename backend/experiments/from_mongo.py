import pymongo
from dotenv import load_dotenv
import os


MONGO_URI = os.getenv(
    'URI') or 'URI_DEFAULT'


def main():
    # get the text from mongo since last run
    # upsert
    load_dotenv()
    connect_to_mongo()


def update():
    pass


def batch_insert():
    pass


def connect_to_mongo():
    myclient = pymongo.MongoClient(
        MONGO_URI)

    mydb = myclient["test"]
    mycol = mydb["customers"]
    mydict = {"name": "John", "address": "Highway 37"}
    x = mycol.insert_one(mydict)

    print(mydb.list_collection_names())


if __name__ == "__main__":
    main()
