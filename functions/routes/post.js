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
const AWS = require('aws-sdk');
const dotenv = require('dotenv');
dotenv.config();

AWS.config.update({
  accessKeyId: process.env.AWS3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS3_SECRET_ACCESS_KEY,
  region: process.env.AWS3_REGION,
  AWS_SDK_LOAD_CONFIG: 1,
});
const s3 = new AWS.S3();

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

    const imageUri = `${req.protocol}://${req.get('host')}/tmp/`;
    console.log(imageUri);

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

      postImage.image = `${imageUri}image-${post.author._id}-${
        post.author.studentNumber
      }-${postNumber + 1}.webp`;

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
    const post = await Post.findById(req.params.id).populate('author');
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

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
      return res.status(404).json({ error: 'No posts found' });
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

// Set storage engine
// const imgDir = '/tmp';
// const imageDir = path.join(__dirname, '..', 'tmp');
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     if (!fs.existsSync(imageDir)) {
//       fs.mkdirSync(imageDir);
//     }
//     cb(null, imageDir);
//   },
// });

// Initialize upload
// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 1024 * 1024 * 5, // 5MB
//   },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
//       cb(null, true); // accept the file
//     } else {
//       cb(null, false); // reject the file
//       cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
//     }
//   },
// }).single('image');

// const processImage = async (file, userId, studentNumber, postNumber) => {
//   const fileName = `image-${userId}-${studentNumber}-${postNumber}.webp`;
//   const image = sharp(file.buffer);
//   const metadata = await image.metadata();

//   if (metadata.width > 1024 || metadata.height > 1024) {
//     image.resize(1024, 1024, { fit: 'inside' });
//   }

//   // await image.webp().toFile(path.join(file.destination, fileName));
//   await image.webp().toBuffer();

//   // fs.unlink(file.path, (err) => {
//   //   if (err) console.error(`Error deleting file: ${err}`);
//   // });

//   return fileName;
// };

// AWS3 S3 storage
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 1024 * 1024 * 5, // 5MB
//   },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
//       cb(null, true); // accept the file
//     } else {
//       cb(null, false); // reject the file
//       cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
//     }
//   },
// }).single('image');

const processImage = async (file, userId, studentNumber, postNumber) => {
  const fileName = `image-${userId}-${studentNumber}-${postNumber}.webp`;
  let image = sharp(file.buffer);
  const metadata = await image.metadata();

  if (metadata.width > 1024 || metadata.height > 1024) {
    image = image.resize(1024, 1024, { fit: 'inside' });
  }

  const outputBuffer = await image.webp().toBuffer();
  return { fileName, outputBuffer };
};

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true); // accept the file
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'), false); // reject the file
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

    const { fileName, outputBuffer } = await processImage(
      req.file,
      user._id,
      user.studentNumber,
      user.posts.length + 1
    );

    // Append a timestamp to the filename
    const uniqueFileName = `${fileName}-${Date.now()}`;

    const params = {
      Bucket: process.env.AWS3_BUCKET_NAME,
      // Add a 'posts/' prefix for post images
      Key: `posts/${uniqueFileName}`,
      Body: outputBuffer,
      ACL: 'public-read',
      ContentType: 'image/webp',
    };

    s3.upload(params, (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }

      // Set post.image after the uniqueFileName is created
      post.image = uniqueFileName;
      post.url = data.Location;

      post
        .save()
        .then((savedPost) => {
          user.posts.push(savedPost._id);
          user
            .save()
            .then(() => {
              console.log(savedPost);
              res.status(201).send({
                message: 'Post created successfully',
                post: savedPost,
              });
            })
            .catch((err) => {
              console.error(err);
              res.status(500).json({ message: err.message });
            });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ message: err.message });
        });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

route.delete('/', async (req, res) => {
  const posts = await Post.deleteMany();
  const users = await User.updateMany({}, { $set: { posts: [] } });
  const params = {
    Bucket: process.env.AWS3_BUCKET_NAME,
    Prefix: 'posts/', // Only delete images in the 'posts/' prefix
  };
  const images = await s3.listObjectsV2(params).promise();
  if (images.Contents.length) {
    const deleteParams = {
      Bucket: process.env.AWS3_BUCKET_NAME,
      Delete: {
        Objects: images.Contents.map((image) => ({ Key: image.Key })),
      },
    };
    await s3.deleteObjects(deleteParams).promise();
  }

  res.json({ message: 'All posts deleted' });
});

route.put('/:id', auth, upload, async (req, res) => {
  const { error } = validatePost(req.body);
  if (error) {
    return res.status(400).send({
      message: error.details[0].message,
    });
  }

  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id) {
      return res.status(403).json({ message: 'You are not authorized' });
    }

    if (req.file) {
      // Extract the file name from the current image URL
      const currentImageKey = post.url.split('/').pop();

      // Delete the current image from the S3 bucket
      const deleteParams = {
        Bucket: process.env.AWS3_BUCKET_NAME,
        Key: currentImageKey,
      };
      await s3.deleteObject(deleteParams).promise();

      // Process and upload the new image
      const { fileName, outputBuffer } = await processImage(
        req.file,
        post._id,
        post.author,
        post.title
      );
      const uniqueFileName = `${fileName}-${Date.now()}`;
      const uploadParams = {
        Bucket: process.env.AWS3_BUCKET_NAME,
        // Add a 'posts/' prefix for post images
        Key: `posts/${uniqueFileName}`,
        Body: outputBuffer,
        ACL: 'public-read',
        ContentType: 'image/webp',
      };
      await s3.upload(uploadParams).promise();

      // Corrected line
      post.url = `https://${process.env.AWS3_BUCKET_NAME}.s3.amazonaws.com/posts/${uniqueFileName}`;
    }

    if (req.body.title) {
      post.title = req.body.title;
    }
    if (req.body.description) {
      post.description = req.body.description;
    }

    await post.save();
    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

route.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id) {
      return res.status(403).json({ message: 'You are not authorized' });
    }

    const deleteParams = {
      Bucket: process.env.AWS3_BUCKET_NAME,
      Key: post.url.split('/').pop(),
    };
    await s3.deleteObject(deleteParams).promise();

    // Remove the post ID from the user's posts array
    const user = await User.findById(req.user._id);
    user.posts.pull(req.params.id);
    await user.save();

    await post.deleteOne();
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = route;
