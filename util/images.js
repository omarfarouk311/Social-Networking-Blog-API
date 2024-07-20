const { promises: fsPromises } = require('fs');

exports.deleteImages = (imagesUrls) => {
    imagesUrls.forEach(imageUrl => fsPromises.unlink(imageUrl).catch(err => console.error(err)));
};

exports.updateImages = (oldImagesUrls, newImagesUrls) => {
    oldImagesUrls.forEach(imageUrl => {
        if (!newImagesUrls.some(newImageUrl => newImageUrl === imageUrl)) {
            fsPromises.unlink(imageUrl).catch(err => console.error(err));
        }
    });
};