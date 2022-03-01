const fs = require('fs');
const logger = require('../../config/logger');

exports.deleteImage = imagePath => {
  console.log('imagePath : ', imagePath);
  fs.unlink(imagePath, function (err) {
    if (err) throw err;
    logger.info(`Image file is deleted sucessfully`);
  });
};
