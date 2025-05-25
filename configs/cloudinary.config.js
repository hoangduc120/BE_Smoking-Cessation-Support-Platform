const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    allowed_formats: ['jpg', 'png', 'jpeg'],
    params: {
        folder: 'QuitSmoke',
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});

const uploadCloud = multer({ storage });

// Export both cloudinary instance and multer upload
module.exports = {
    cloudinary,
    uploadCloud
};