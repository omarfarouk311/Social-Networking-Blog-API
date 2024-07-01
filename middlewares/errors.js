exports.notAllowed = (req, res, next) => {
    const err = new Error('Method not allowed');
    err.statusCode = 405;
    return next(err);
}