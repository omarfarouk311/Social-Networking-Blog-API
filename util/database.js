const { MongoClient } = require('mongodb');
let db, client;

exports.mongoConnect = async () => {
    client = await MongoClient.connect(process.env.DB_URI);
    db = client.db('blog');
}

exports.getDb = () => {
    if (db) return db;
    throw new Error('Database connection not established');
}

exports.getClient = () => {
    return client;
}