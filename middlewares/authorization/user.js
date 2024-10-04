exports.authorizeUser = (req, res, next) => {
    const { userId: userId1 } = req.params, { userId: userId2 } = req;
    if (!userId1.equals(userId2)) {
        return res.status(403).json({ message: 'Unauthorized access' });
    }
    next();
};