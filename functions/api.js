const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const serverless = require('serverless-http');
const dotenv = require('dotenv');
const userRoute = require('./routes/user');
const photoRoute = require('./routes/photo');
const authRoute = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

const LOCAL_URI = 'mongodb://localhost:27017/imahe';

mongoose
  .connect(process.env.CLOUD_URI || LOCAL_URI, {})
  .then(() => {
    if (process.env.CLOUD_URI) {
      console.log('Connected to MongoDB...');
    } else {
      console.log('Connected to Local MongoDB...');
    }
  })
  .catch((err) =>
    console.error({
      error: err,
      message: 'Could not connect to MongoDB...',
    })
  );

// app.use('/.netlify/functions/api/users', userRoute);
app.use('/v1/api/users', userRoute);
app.use('/v1/api/photos', photoRoute);
app.use('/assets/images', express.static('assets/images'));
app.use('/v1/api/auth/login', authRoute);

app.listen(3000, () => console.log('Server is running on port 3000...'));

module.exports.handler = serverless(app);
