const User = require('../models/user');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');
const jwt = require('jsonwebtoken');
const { getDb } = require('../util/database');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const transporter = nodemailer.createTransport(mg({
    auth: {
        api_key: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN
    }
}));

exports.signUp = async (req, res, next) => {
    const { body } = req, { password } = body;

    try {
        if (req.invalidFileType) {
            const err = new Error('Invalid file type');
            err.statusCode = 422;
            throw err;
        }

        body.password = await bcrypt.hash(password, 15);
        const user = new User({
            ...body,
            bookmarksIds: [],
            followersIds: [],
            followingIds: [],
            likedPostsIds: [],
            likedCommentsIds: [],
            followersCount: 0,
            followingCount: 0,
            creationDate: new Date(Date.now()),
            imageUrl: req.file ? req.file.path : null,
            resetToken: null,
            resetTokenExpiry: null
        });

        await user.createUser();
        const { _id, email, name, bio, location, imageUrl } = user;
        res.status(201).json({
            message: 'User signed up successfully',
            _id,
            email,
            name,
            bio,
            location,
            imageUrl
        });

        transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to: body.email,
            subject: 'Welcome to the blog',
            html: `<h2>Thanks for signing up!</h2>`
        }).catch(err => console.error(err));
    }
    catch (err) {
        return next(err);
    }
};

exports.logIn = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const user = await User.getUser({ email }, { email: 1, password: 1 });
        if (!user || !await bcrypt.compare(password, user.password)) {
            const err = new Error('Invalid Email or password');
            err.statusCode = 422;
            throw err;
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        const db = getDb();
        await Promise.all[db.collection('tokens').insertOne({ userId: user._id, token, creationDate: new Date(Date.now()) }),
            db.collection('refresh tokens').insertOne({ userId: user._id, refreshToken, creationDate: new Date(Date.now()) })];

        crypto.randomBytes(64, (err, buf) => {
            if (err) throw err;
            const csrfToken = buf.toString('hex');
            return res
                .status(200)
                .cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    sameSite: 'None',
                    signed: true,
                    secure: true,
                    expires: new Date(Date.now() + 604800 * 1000)
                })
                .cookie('csrfToken', csrfToken, {
                    httpOnly: false,
                    sameSite: 'None',
                    signed: false,
                    secure: true,
                    expires: new Date(Date.now() + 604800 * 1000)
                })
                .json({
                    message: 'User logged in successfully',
                    token,
                    userId: user._id
                });
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.logOut = async (req, res, next) => {
    const { userId } = req;

    try {
        const db = getDb();
        await Promise.all[db.collection('tokens').deleteOne({ userId }), db.collection('refresh tokens').deleteOne({ userId })];
        return res
            .status(200)
            .clearCookie('refreshToken', {
                httpOnly: true,
                sameSite: 'None',
                signed: true,
                secure: true,
            })
            .clearCookie('csrfToken', {
                httpOnly: false,
                sameSite: 'None',
                signed: false,
                secure: true,
            })
            .json({ message: 'User logged out successfully' });
    }
    catch (err) {
        return next(err);
    }
};

exports.refreshToken = async (req, res, next) => {
    const { refreshToken: oldRefreshToken } = req.signedCookies;

    try {
        if (!oldRefreshToken) {
            const err = new Error('invalid token');
            err.statusCode = 401;
            throw err;
        }

        const decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const db = getDb();
        const found = await db.collection('refresh tokens').findOne({ refreshToken: oldRefreshToken }, { _id: 1 });
        if (!found) {
            const err = new Error('invalid token');
            err.statusCode = 401;
            throw err;
        }

        let { userId } = decoded;
        const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        userId = ObjectId.createFromHexString(userId);
        await Promise.all([db.collection('tokens').insertOne({ userId, token, creationDate: new Date(Date.now()) }),
        db.collection('refresh tokens').updateOne(
            { refreshToken: oldRefreshToken },
            { $set: { userId, refreshToken, creationDate: new Date(Date.now()) } },
        )]);

        crypto.randomBytes(64, (err, buf) => {
            if (err) throw err;
            const csrfToken = buf.toString('hex');
            return res
                .status(200)
                .cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    sameSite: 'None',
                    signed: true,
                    secure: true,
                    expires: new Date(Date.now() + 604800 * 1000)
                })
                .cookie('csrfToken', csrfToken, {
                    httpOnly: false,
                    sameSite: 'None',
                    signed: false,
                    secure: true,
                    expires: new Date(Date.now() + 604800 * 1000)
                })
                .json({
                    message: 'Token refreshed successfully',
                    token
                });
        });
    }
    catch (err) {
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            err.statusCode = 401;
        }
        return next(err);
    }
};

exports.authenticateUser = async (req, res, next) => {
    let token = req.get('Authorization');
    if (!token) {
        return res.status(401).json({ message: 'invalid token' });
    }
    token = token.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        //check if the token is in the whitelist (not logged out)
        //TTL indexing
        const db = getDb();
        const found = await db.collection('tokens').findOne({ token }, { _id: 1 });
        if (!found) {
            const err = new Error('Invalid token');
            err.statusCode = 401;
            throw err;
        }

        req.userId = ObjectId.createFromHexString(decoded.userId);
        return next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            err.statusCode = 401;
        }
        return next(err);
    }
};

exports.csrfProtection = (req, res, next) => {
    const { method } = req;
    const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!methods.includes(method)) return next();

    const { csrfToken } = req.cookies;
    const csrfHeader = req.get('CSRF-TOKEN');
    if (csrfHeader && csrfHeader === csrfToken) return next();

    const err = new Error('Invalid csrf token');
    err.statusCode = 403;
    return next(err);
};