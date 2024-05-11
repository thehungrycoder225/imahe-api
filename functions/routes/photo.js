const express = require('express');
const Photo = require('../models/photo');
const auth = require('../middleware/auth');
const fs = require('fs');
const upload = require('multer');
const User = require('../models/user');

const router = express.Router();

router.delete('/', async (req, res) => {
  const photos = await Photo.deleteMany();
  res.json({ message: 'All photos deleted' });
});

router.get('/', async (req, res) => {
  const photos = await Photo.deleteMany();
  res.json(photos);
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description } = req.body;
    const photo = new Photo({
      title,
      description,
      user: req.user._id,
    });

    const savePhoto = await post.save();
    const user = await User.findById(req.user._id);
    user.photo.push(savePhoto._id);
    await user.save();

    console.log('User document saved:', req.user);
    res.send({
      message: 'Post created successfully',
      post: savePhoto,
    });
  } catch (err) {
    console.error(err);
    res.json({ message: err });
  }
});

module.exports = router;
