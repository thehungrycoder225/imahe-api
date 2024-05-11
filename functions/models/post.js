const postSchema = require('../schema/post');
const mongoose = require('mongoose');
const Joi = require('joi');

const Post = mongoose.model('Post', postSchema);

const validatePost = (post) => {
  const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
  });

  return schema.validate(post);
};

module.exports = { Post, validatePost };
