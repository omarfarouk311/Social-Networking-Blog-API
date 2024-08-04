const jwt = require('jsonwebtoken');
const { getDb } = require('../util/database');

exports.authenticateUser = async (req, res, next) => {
    let token = req.get('Authorization');
    if (!token) {
        return res.status(403).json({ message: 'Token not found in Authorization header' });
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

        req.userId = decoded.userId;
        return next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            err.statusCode = 401;
        }
        return next(err);
    }
};