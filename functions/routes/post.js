const express = require('express');
const route = express.Router();
const Post = require('../models/post');
const { User } = require('../models/user');
const auth = require('../middleware/auth');

route.get('/', async (req, res) => {
  const posts = await Post.find().populate('author', 'studentNumber name');
  res.json(posts);
});

route.delete('/', async (req, res) => {
  const post = await Post.deleteMany();
  res.send({
    message: 'Posts deleted',
  });
});

route.get('/:id', async (req, res) => {
  const post = await Post.findById(req.params.id);
  res.json(post);
});

route.post('/', auth, async (req, res) => {
  try {
    const { title, description } = req.body;
    const post = new Post({
      title,
      description,
      author: req.user._id,
    });

    const savedPost = await post.save();
    const user = await User.findById(req.user._id);
    user.posts.push(savedPost._id);
    await user.save();

    console.log('User document saved:', req.user);
    res.send({
      message: 'Post created successfully',
      post: savedPost,
    });
  } catch (err) {
    console.error(err);
    res.json({ message: err });
  }
});

module.exports = route;
