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
            creationDate: new Date(Date.now()).toISOString()
        });

        if (req.file) {
            user.imageUrl = req.file;
        }

        await user.createUser();
        res.statusCode(201).json({
            message: 'User signed up successfully',
            ...user
        });

        transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to: body.email,
            subject: 'Welcome in the blog',
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

        //save userId in the whitelist with auto deletion after 10m
        const db = getDb();
        await db.collection('tokens').insertOne({ userId: user._id, creationDate: new Date(Date.now()).toISOString() });

        crypto.randomBytes(64, (err, buf) => {
            if (err) throw err;
            const csrfToken = buf.toString('hex');
            return res
                .status(200)
                .cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    sameSite: 'None',
                    signed: true,
                    secure: true
                })
                .cookie('csrfToken', csrfToken, {
                    httpOnly: false,
                    sameSite: 'None',
                    signed: true,
                    secure: true
                })
                .json({
                    message: 'User logged in successfully',
                    token
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
        await db.collection('tokens').deleteOne({ _id: userId });
        return res
            .status(200)
            .clearCookie('refreshToken', {
                httpOnly: true,
                sameSite: 'None',
                signed: true,
                secure: true
            })
            .clearCookie('csrfToken', {
                httpOnly: false,
                sameSite: 'None',
                signed: true,
                secure: true
            })
            .json({ message: 'User logged out successfully' });
    }
    catch (err) {
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
        const found = await db.collection('tokens').findOne({ userId: decoded.userId });
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

    const { csrfToken } = req.signedCookies;
    const csrfHeader = req.headers['CSRF-TOKEN'];
    if (csrfHeader && csrfHeader === csrfToken) return next();

    const err = new Error('Invalid csrf token');
    err.statusCode = 403;
    return next(err);
};