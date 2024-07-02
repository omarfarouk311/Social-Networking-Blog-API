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

exports.errorHandlingMiddleware = (err, req, res, next) => {
    console.error(err);
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ message: err.message });
};