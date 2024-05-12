const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { User, validate } = require('../models/user');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const tinify = require('tinify');

const route = express.Router();
tinify.key = 'HDHSrH7HScXbxp4gl6sZSWmcjkSBsQDd';
tinify.proxy = 'http://user:pass@192.168.0.1:8080';

const generateAuthToken = (id) => {
  return jwt.sign({ _id: id }, process.env.JWT_SECRET);
};

// Set storage engine
const imgDir = path.join(__dirname, '..', 'tmp');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir);
    cb(null, imgDir);
  },
  filename: function (req, file, cb) {
    const fileName =
      'image-' + req.body.studentNumber + path.extname(file.originalname);
    cb(null, fileName);
  },
});

// Initialize upload
const upload = multer({
  storage,
  limits: { fileSize: 1000000 },
}).single('image');

route.post('/', upload, async (req, res) => {
  try {
    const { error } = validate(req.body);
    if (error) {
      return res.status(400).send({
        message: error.details[0].message,
      });
    }

    const existingEmailUser = await User.findOne({ email: req.body.email });
    const existingStudentNumberUser = await User.findOne({
      studentNumber: req.body.studentNumber,
    });

    if (existingEmailUser) {
      return res.status(400).send({
        message: 'Email already exists. Please choose a different email.',
      });
    }

    if (existingStudentNumberUser) {
      return res.status(400).send({
        message:
          'Student Number is already associated with another user. Please enter a different student number.',
      });
    }

    const user = new User(req.body);
    if (req.file) {
      const fileName =
        'image-' + req.body.studentNumber + path.extname(req.file.originalname);

      await new Promise((resolve, reject) => {
        fs.rename(
          req.file.path,
          path.join(req.file.destination, fileName),
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }).catch((error) => {
        console.error(error);
        return res
          .status(500)
          .send({ message: 'An error occurred while renaming the file.' });
      });
      user.image = fileName;
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
      userWithImage.image = `${req.protocol}://${req.get('host')}/tmp/image-${
        user.studentNumber
      }.jpg`;
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
    userWithImage.image = `${req.protocol}://${req.get('host')}/tmp/image-${
      user.studentNumber
    }.jpg`;
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
  try {
    const { error } = validate(req.body);
    if (error) {
      return res.status(400).send({
        message: error.details[0].message,
      });
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!user) return res.status(404).send('User not found...');
    if (req.file) {
      const fileName =
        'image-' + req.body.studentNumber + path.extname(req.file.originalname);
      fs.rename(
        req.file.path,
        path.join(req.file.destination, fileName),
        (err) => {
          if (err) throw err;
        }
      );
      user.image = fileName;
    }
    await user.save();
    res.send(user);
  } catch (error) {
    res.status(500).send({
      message: 'Something went wrong...',
      error,
    });
  }
});

route.delete('/', async (req, res) => {
  const users = await User.deleteMany();
  res.send({
    message: 'Users deleted',
  });
});

module.exports = route;
