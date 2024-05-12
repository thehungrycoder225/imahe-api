const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
    min: 1,
    max: 255,
    default: 'Untitled Post',
  },
  description: {
    type: String,
    required: true,
    min: 1,
    max: 1024,
    default: 'No description provided.',
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  image: {
    type: Buffer,
  },
  url: {
    type: String,
  },
  comments: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
    },
  ],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // new
  views: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now,
    FormData: 'YYYY-MM-DD',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = postSchema;
