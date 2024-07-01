exports.notAllowed = (req, res, next) => {
    const err = new Error('Method not allowed');
    err.statusCode = 405;
    return next(err);
};

exports.notFound = (req, res, next) => {
    const err = new Error('Page not found');
    err.statusCode = 404;
    return next(err);
};

exports.errorHandlingMiddleware = (req, res, next, err) => {
    console.error(err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: err.message });
};