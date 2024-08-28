const { promises: fsPromises } = require('fs');

exports.deleteImages = (imagesUrls) => {
    imagesUrls.forEach(imageUrl => fsPromises.unlink(imageUrl).catch(err => console.error(err)));
};