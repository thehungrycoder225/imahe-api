const postSchema = require('../schema/post');
const mongoose = require('mongoose');

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
