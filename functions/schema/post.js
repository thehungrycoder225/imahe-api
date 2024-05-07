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
  comments: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
    },
  ],
  likes: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = postSchema;
