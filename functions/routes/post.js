const express = require('express');
const route = express.Router();
const { Post, validatePost } = require('../models/post');
const { User } = require('../models/user');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const sharp = require('sharp');

route.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortField = 'title',
      sortOrder = 'asc',
      title,
      authorName,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalPosts = await Post.countDocuments();

    // Create filter object
    const filter = {};
    if (title) filter.title = { $regex: title, $options: 'i' };

    // If authorName is provided, find the author and add their id to the filter
    if (authorName) {
      const author = await User.findOne({
        name: { $regex: authorName, $options: 'i' },
      });
      if (author) {
        filter.author = author._id;
      }
    }

    // Define sort object
    const sort = {};
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    const posts = await Post.find(filter)
      .populate('author', 'studentNumber name posts')
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sort);

    const postsImages = posts.map((post) => {
      const totalLikes = posts.reduce(
        (sum, post) => sum + post.likes.length,
        0
      );
      const totalViews = posts.reduce((sum, post) => sum + post.views, 0);
      const postImage = post.toObject();
      const postNumber = post.author.posts.findIndex(
        (postId) => postId.toString() === post._id.toString()
      );

      postImage.image = `${req.protocol}://${req.get('host')}/tmp/image-${
        post.author._id
      }-${post.author.studentNumber}-${postNumber + 1}.webp`;

      return postImage;
    });

    res.json({ totalPosts, postsImages });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: 'An error occurred while fetching posts' });
  }
});

route.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      'author',
      'studentNumber name posts'
    );
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    post.views += 1; // increment views
    await post.save();

    const postImage = post.toObject();
    const postNumber = post.author.posts.findIndex(
      (postId) => postId.toString() === post._id.toString()
    );

    postImage.image = `${req.protocol}://${req.get('host')}/tmp/image-${
      post.author._id
    }-${post.author.studentNumber}-${postNumber + 1}.webp`;

    res.json(postImage);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching post' });
  }
});

route.get('/author/:authorId', async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.authorId }).populate(
      'author',
      'studentNumber name posts'
    );

    if (!posts.length) {
      return res
        .status(404)
        .json({ message: 'No posts found for this author' });
    }

    const postsImages = posts.map((post) => {
      const postImage = post.toObject();
      const postNumber = post.author.posts.findIndex(
        (postId) => postId.toString() === post._id.toString()
      );

      postImage.image = `${req.protocol}://${req.get('host')}/tmp/image-${
        post.author._id
      }-${post.author.studentNumber}-${postNumber + 1}.webp`;

      return postImage;
    });

    res.json(postsImages);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching posts' });
  }
});

route.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if the user has already liked the post
    if (post.likes.includes(req.user._id)) {
      return res
        .status(400)
        .json({ error: 'You have already liked this post' });
    }

    post.likes.push(req.user._id);
    await post.save();

    res.json({ message: 'Post liked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while liking the post' });
  }
});

route.post('/:id/unlike', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if the user has liked the post
    if (!post.likes.includes(req.user._id)) {
      return res.status(400).json({ error: 'You have not liked this post' });
    }

    post.likes = post.likes.filter(
      (like) => like.toString() !== req.user._id.toString()
    );
    await post.save();
    res.json({ message: 'Post unliked successfully' });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while unliking the post' });
  }
});

const processImage = async (file, userId, studentNumber, postNumber) => {
  const fileName = `image-${userId}-${studentNumber}-${postNumber}.webp`;
  const image = sharp(file.path);
  const metadata = await image.metadata();

  if (metadata.width > 1024 || metadata.height > 1024) {
    image.resize(1024, 1024, { fit: 'inside' });
  }

  await image.webp().toFile(path.join(file.destination, fileName));

  fs.unlink(file.path, (err) => {
    if (err) console.error(`Error deleting file: ${err}`);
  });

  return fileName;
};

// Set storage engine
const imgDir = '/tmp';
// const imageDir = path.join(__dirname, '..', 'tmp');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(imgDir)) {
      fs.mkdirSync(imgDir);
    }
    cb(null, imgDir);
  },
});

// Initialize upload
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true); // accept the file
    } else {
      cb(null, false); // reject the file
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
    }
  },
}).single('image');

route.post('/', auth, upload, async (req, res) => {
  const { error } = validatePost(req.body);
  if (error) {
    return res.status(400).send({
      message: error.details[0].message,
    });
  }

  try {
    const { title, description } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const post = new Post({
      title,
      description,
      author: req.user._id,
    });

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'No file provided' });
    }

    const fileName = await processImage(
      req.file,
      user._id,
      user.studentNumber,
      user.posts.length + 1
    );

    post.image = fileName;
    post.url = `${req.protocol}://${req.get('host')}/tmp/${fileName}`;

    const savedPost = await post.save();
    user.posts.push(savedPost._id);
    await user.save();
    console.log(savedPost);
    res.status(201).send({
      message: 'Post created successfully',
      post: savedPost,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

route.delete('/', async (req, res) => {
  const posts = await Post.deleteMany();
  const users = await User.updateMany({}, { $set: { posts: [] } });
  const images = await promisify(fs.readdir)(imageDir);
  images.forEach((image) => {
    fs.unlink(path.join(imageDir, image), (err) => {
      if (err) console.error(`Error deleting file: ${err}`);
    });
  });

  res.json({ message: 'All posts deleted' });
});

module.exports = route;
