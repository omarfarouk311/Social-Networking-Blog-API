const { deleteImages } = require('../util/images');

exports.notAllowed = (req, res, next) => {
    const err = new Error('Method not allowed');
    err.statusCode = 405;
    return next(err);
};

exports.notFound = (req, res, next) => {
    const err = new Error('Resource not found');
    err.statusCode = 404;
    return next(err);
};

exports.errorHandlingMiddleware = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err)
    }

    console.error(err);

    if (req.file) {
        deleteImages([req.file.path]);
    }
    if (req.files) {
        deleteImages(req.files.map(file => file.path));
    }

    if (Array.isArray(err)) {
        return res.status(422).send({
            message: 'Invalid data',
            errors: err
        });
    }
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ message: err.message || err.msg });
};