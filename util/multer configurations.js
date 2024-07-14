const { promises: fsPromises } = require('fs');
const { v4: uuidv4 } = require('uuid');
const { diskStorage } = require('multer');
const multer = require('multer');

const storageEngine = diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fsPromises.mkdir('images', { recursive: true });
            cb(null, 'images');
        }
        catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null, true);
    }
    else {
        cb(null, false);
        req.invalidFileType = true;
    }
}

module.exports =  multer({ storage: storageEngine, fileFilter: fileFilter });