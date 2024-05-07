const express = require('express');
const route = express.Router();
const { User } = require('../models/user');
const { validate } = require('../models/user');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const generateAuthToken = (id) => {
  return jwt.sign({ _id: id }, process.env.JWT_SECRET);
};
// Set storage engine
const storage = multer.diskStorage({
  destination: 'assets/images',
  filename: function (req, file, cb) {
    const fileName =
      'image-' + req.body.studentNumber + path.extname(file.originalname);
    cb(null, fileName);
  },
});

// Initialize upload
const upload = multer({
  storage: storage,
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

    const existingUser = await User.findOne({
      email: req.body.email,
      studentNumber: req.body.studentNumber,
    });

    if (existingUser) {
      return res.status(400).send({
        message: 'User already exists...',
      });
    }

    const user = new User(req.body);
    if (req.file) {
      const fileName =
        'image-' + req.body.studentNumber + path.extname(req.file.originalname);
      fs.rename(
        req.file.path,
        path.join(req.file.destination, fileName),
        function (err) {
          if (err) throw err;
        }
      );
      user.image = fileName;
    }
    await user.save();
    const token = generateAuthToken(user._id);
    res.header('x-auth-token', token).send(user);
  } catch (error) {
    res.status(500).send({
      message: 'Something went wrong...',
      error: error,
    });
  }
});

route.get('/', async (req, res) => {
  try {
    const users = await User.find();
    const usersWithImages = users.map((user) => {
      const userWithImage = user.toObject();
      userWithImage.image = `${req.protocol}://${req.get(
        'host'
      )}/assets/images/image-${user.studentNumber}.jpg`;
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
    userWithImage.image = `${req.protocol}://${req.get(
      'host'
    )}/assets/images/image-${user.studentNumber}.jpg`;
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
        function (err) {
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
      error: error,
    });
  }
});

module.exports = route;
