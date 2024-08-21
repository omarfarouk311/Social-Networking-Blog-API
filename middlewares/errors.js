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
    if (res.headersSent) {
        return next(err)
    }

    console.error(err);

    if (Array.isArray(err)) {
        return res.status(422).send({
            message: 'Invalid data',
            errors: err
        });
    }
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ message: err.message || err.msg });
};