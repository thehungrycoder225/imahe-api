const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const serverless = require('serverless-http');
const dotenv = require('dotenv');
const userRoute = require('./routes/user');
const authRoute = require('./routes/auth');
const postRoute = require('./routes/post');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const LOCAL_URI = 'mongodb://localhost:27017/imahe';

mongoose.connection.on(
  'error',
  console.error.bind(console, 'connection error:')
);
mongoose.connection.once('open', () => console.log('Connected to Database...'));
mongoose.connection.on('disconnected', () =>
  console.log('Disconnected from Database...')
);
mongoose.connection.on('reconnected', () =>
  console.log('Reconnected to Database...')
);
mongoose.connection.on('close', () =>
  console.log('Connection to Database Closed...')
);

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

const apiPath =
  process.env.NODE_ENV === 'development'
    ? '/v1/api'
    : '/.netlify/functions/api';
app.use(`${apiPath}/users`, userRoute);
app.use(`${apiPath}/posts`, postRoute);
app.use(`${apiPath}/auth/login`, authRoute);

const imageDir = path.join(__dirname, '/tmp');
app.use('/tmp', express.static(imageDir));

app.listen(process.env.PORT, () =>
  console.log({
    message: `Server running on ${process.env.NODE_ENV}`,
    api: `${apiPath}:${process.env.PORT}`,
  })
);

module.exports.handler = serverless(app);
