require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { mongoConnect } = require('./util/database');
const { join } = require('path');
const { notFound, errorHandlingMiddleware } = require('./middlewares/errors');
const feedRouter = require('./routes/feed');
const bookmarksRouter = require('./routes/bookmarks');
const profileRouter = require('./routes/profile');
const authRouter = require('./routes/auth');
const cookieParser = require('cookie-parser');

const app = express();

app.use(cors({
    origin: [process.env.ORIGIN],
    allowedHeaders: ['Content-Type', 'Authorization', 'CSRF-TOKEN'],
    credentials: true
}));

app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(express.json());

app.use(express.static(__dirname, {
    setHeaders: res => res.set('Cache-Control', 'public, max-age=86400')
}));

app.use('/feed', feedRouter);

app.use('/bookmarks', bookmarksRouter);

app.use('/profile/:userId', profileRouter);

app.use(authRouter);

app.all('*', notFound);

app.use(errorHandlingMiddleware);

mongoConnect()
    .then(() => {
        app.listen(process.env.PORT);
    })
    .catch(err => {
        console.error('Failed to connect to the database', err);
        process.exit(1);
    });