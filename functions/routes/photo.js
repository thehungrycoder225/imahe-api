const express = require('express');
const { Photo } = require('../schema/photo');
const fs = require('fs');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const photos = await Photo.find();
    res.json(photos);
  } catch (err) {
    res.json({ message: err });
  }
});

router.post('/', async (req, res) => {
  const photo = new Photo({
    title: req.body.title,
    description: req.body.description,
    image: req.body.image,
  });

  try {
    const savedPhoto = await photo.save();
    // Save the photo to the assets folder
    fs.writeFileSync(
      `./assets/${savedPhoto._id}.jpg`,
      savedPhoto.image,
      'base64'
    );
    res.json(savedPhoto);
  } catch (err) {
    res.json({ message: err });
  }
});

module.exports = router;
