require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { mongoConnect } = require('./util/database');
const { join } = require('path');
const { notFound, errorHandlingMiddleware } = require('./middlewares/errors');
const feedRouter = require('./routes/feed');
const bookmarksRouter = require('./routes/bookmarks');
const userRouter = require('./routes/user');
const { authenticateUser } = require('./middlewares/auth');
const cookieParser = require('cookie-parser');
const { csrfProtection } = require('./controllers/auth');

const app = express();

app.use(cors({
    origin: [process.env.ORIGIN],
    allowedHeaders: ['Content-Type', 'Authorization', 'CSRF-TOKEN'],
    credentials: true
}));

app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(csrfProtection());

app.use(express.json());

app.use('/images', express.static(join(__dirname, 'images')));

app.use('/feed', feedRouter);

app.use('/bookmarks', authenticateUser, bookmarksRouter);

app.use('/profile', authenticateUser, userRouter);

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