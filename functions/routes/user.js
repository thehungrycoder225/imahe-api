const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { User, validate } = require('../models/user');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const route = express.Router();
const sharp = require('sharp');
const AWS = require('aws-sdk');
const dotenv = require('dotenv');
dotenv.config();

AWS.config.update({
  accessKeyId: process.env.AWS3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS3_SECRET_ACCESS_KEY,
  region: process.env.AWS3_REGION,
  AWS_SDK_LOAD_CONFIG: 1,
});

const s3 = new AWS.S3();

const generateAuthToken = (id) => {
  return jwt.sign({ _id: id }, process.env.JWT_SECRET);
};

// Set storage engine
// const imgDir = '/tmp';
// const imgDir = path.join(__dirname, '..', 'tmp');
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     if (!fs.existsSync(imgDir)) {
//       fs.mkdirSync(imgDir);
//     }
//     cb(null, imgDir);
//   },
//   filename: function (req, file, cb) {
//     const fileName =
//       'image-' + req.body.studentNumber + path.extname(file.originalname);
//     cb(null, fileName);
//   },
// });

// Initialize upload
// const upload = multer({
//   storage,
//   limits: { fileSize: 1000000 },
// }).single('image');

// const processImage = async (file, userId, studentNumber, postNumber) => {
//   const fileName = `image-${userId}-${studentNumber}-${postNumber}.webp`;
//   const image = sharp(file.buffer);
//   const metadata = await image.metadata();

//   if (metadata.width > 1024 || metadata.height > 1024) {
//     image.resize(1024, 1024, { fit: 'inside' });
//   }

//   // await image.webp().toFile(path.join(file.destination, fileName));
//   await image.webp().toBuffer();

//   // fs.unlink(file.path, (err) => {
//   //   if (err) console.error(`Error deleting file: ${err}`);
//   // });

//   return fileName;
// };
// AWS S3 storage
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 1024 * 1024 * 5, // 5MB
//   },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
//       cb(null, true); // accept the file
//     } else {
//       cb(null, false); // reject the file
//       cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
//     }
//   },
// }).single('image');

const processImage = async (file, userId, studentNumber, postNumber) => {
  const fileName = `image-${userId}-${studentNumber}-${postNumber}.webp`;
  let image = sharp(file.buffer);
  const metadata = await image.metadata();

  if (metadata.width > 1024 || metadata.height > 1024) {
    image = image.resize(1024, 1024, { fit: 'inside' });
  }

  const outputBuffer = await image.webp().toBuffer();
  return { fileName, outputBuffer };
};

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true); // accept the file
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'), false); // reject the file
    }
  },
}).single('image');

route.post('/', upload, async (req, res) => {
  try {
    const { error } = validate(req.body);
    if (error) {
      return res.status(400).send({
        message: error.details[0].message,
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: req.body.email },
        { studentNumber: req.body.studentNumber },
      ],
    });

    if (existingUser) {
      const message =
        existingUser.email === req.body.email
          ? 'Email already exists. Please choose a different email.'
          : 'Student Number is already associated with another user. Please enter a different student number.';
      return res.status(400).send({ message });
    }

    const user = new User(req.body);

    if (req.file) {
      const { fileName, outputBuffer } = await processImage(
        req.file,
        user._id,
        user.studentNumber,
        user.posts.length + 1
      );

      const params = {
        Bucket: process.env.AWS3_BUCKET_NAME,
        Key: fileName,
        Body: outputBuffer,
        ACL: 'public-read',
        ContentType: 'image/webp',
      };
      await s3.upload(params).promise();
      user.image = `https://${process.env.AWS3_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
    }

    await user.save();
    const token = generateAuthToken(user._id);
    res.status(201).header('x-auth-token', token).send({
      message: 'User created successfully.',
      user,
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: 'An error occurred.' });
  }
});

route.get('/', async (req, res) => {
  try {
    const users = await User.find();
    const usersWithImages = users.map((user) => {
      const userWithImage = user.toObject();
      // userWithImage.image = `${req.protocol}://${req.get('host')}/tmp/image-${
      //   user.studentNumber
      // }.jpg`;
      userWithImage.image = user.image;
      return userWithImage;
    });
    res.send(usersWithImages);
  } catch (error) {
    res.status(500).send('Something went wrong...');
  }
});

route.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const userWithImage = user.toObject();
    userWithImage.image = user.image;
    // userWithImage.image = `${req.protocol}://${req.get('host')}/tmp/image-${
    //   user.studentNumber
    // }.jpg`;
    res.send(userWithImage);
  } catch (error) {
    res.status(404).send('User not found...');
  }
});

route.delete('/:id', auth, async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).send('User not found...');
  res.send({
    message: 'User deleted',
    user: user.name,
  });
});

route.put('/:id', auth, upload, async (req, res) => {
  const id = req.params.id;
  const { error } = validate(req.body);
  if (error) {
    return res.status(400).send({
      message: error.details[0].message,
    });
  }
  let user = await User.findById(id);
  if (!user) return res.status(404).send('User not found...');

  if (req.file) {
    // Extract the file name from the current image URL
    const currentImageKey = user.image.split('/').pop();

    // Delete the current image from the S3 bucket
    const deleteParams = {
      Bucket: process.env.AWS3_BUCKET_NAME,
      Key: currentImageKey,
    };
    await s3.deleteObject(deleteParams).promise();

    // Process and upload the new image
    const { fileName, outputBuffer } = await processImage(
      req.file,
      user._id,
      user.studentNumber,
      user.posts.length + 1
    );
    const uploadParams = {
      Bucket: process.env.AWS3_BUCKET_NAME,
      Key: fileName,
      Body: outputBuffer,
      ACL: 'public-read',
      ContentType: 'image/webp',
    };
    await s3.upload(uploadParams).promise();
    user.image = `https://${process.env.AWS3_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
  }

  if (req.body.email) {
    user.email = req.body.email;
  }

  if (req.body.password) {
    user.password = req.body.password;
  }

  user = await user.save();

  res.send({
    message: 'User updated successfully',
    user,
  });
});

route.delete('/', async (req, res) => {
  const users = await User.deleteMany();
  res.send({
    message: 'Users deleted',
  });
});

module.exports = route;
