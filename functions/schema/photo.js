const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const photoSchema = new Schema({
  title: {
    type: String,
    required: true,
    min: 1,
    max: 255,
  },
  description: {
    type: String,
    required: true,
    min: 1,
    max: 1024,
  },
  image: {
    type: String,
    required: true,
  },
  album: {
    type: Schema.Types.ObjectId,
    ref: 'Album',
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = photoSchema;
