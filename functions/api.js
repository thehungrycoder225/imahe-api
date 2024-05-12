const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const serverless = require('serverless-http');
const dotenv = require('dotenv');
const userRoute = require('./routes/user');
const authRoute = require('./routes/auth');
const postRoute = require('./routes/post');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
bodyParser = require('body-parser');
app.use(bodyParser.json());
dotenv.config();

const LOCAL_URI = 'mongodb://localhost:27017/imahe';

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('Connected to Database...');
});
db.on('disconnected', () => console.log('Disconnected from Database...'));
db.on('reconnected', () => console.log('Reconnected to Database...'));
db.on('close', () => console.log('Connection to Database Closed...'));

mongoose
  .connect(process.env.CLOUD_URI || LOCAL_URI, {})
  .then(() => {
    const connectionType = process.env.CLOUD_URI ? 'Cloud' : 'Local';
    console.log(`Connected to ${connectionType} MongoDB...`);
  })
  .catch((err) =>
    console.error({
      error: err,
      message: 'Could not connect to MongoDB...',
    })
  );

// app.use('/.netlify/functions/api/users', userRoute);
// app.use('/.netlify/functions/api/posts', postRoute);
// app.use('/.netlify/functions/api/auth/login', authRoute);

app.use('/v1/api/users', userRoute);
app.use('/v1/api/posts', postRoute);
app.use('/v1/api/auth/login', authRoute);

// Serve static files from the "assets/images" directory
// app.use(
//   '/assets/images',
//   express.static(path.join(__dirname, '..', 'assets', 'images'))
// );

app.use('tmp', express.static(path.join(__dirname, 'assets', 'images')));

app.listen(3000, () => console.log('Server is running on port 3000...'));

module.exports.handler = serverless(app);
