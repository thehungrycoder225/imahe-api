const express = require('express');
const Photo = require('../models/photo');
const auth = require('../middleware/auth');
const fs = require('fs');

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
  const photo = new Photo({
    title: req.body.title,
    description: req.body.description,
    image: req.body.image,
    user: req.user._id,
  });
  try {
    const savedPhoto = await photo.save();
    res.json(savedPhoto);
  } catch {
    res.json({ message: err });
  }
});

module.exports = router;
