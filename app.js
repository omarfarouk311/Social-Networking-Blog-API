require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { mongoConnect } = require('./util/database');
const multer = require('multer');
const { storageEngine, fileFilter } = require('./util/multer configurations');
const { join } = require('path');
const { notFound, errorHandlingMiddleware } = require('./middlewares/errors');


const app = express();

app.use(express.json());
app.use(multer(storageEngine, fileFilter).single('image'));

app.use('/images', express.static(join(__dirname, 'images')));

app.use(cors({
    origin: [process.env.ORIGIN],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(notFound);

app.use(errorHandlingMiddleware);

mongoConnect()
    .then(() => {
        app.listen(process.env.PORT);
    })
    .catch(err => {
        console.error('Failed to connect to the database', err);
        process.exit(1);
    });