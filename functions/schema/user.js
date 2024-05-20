const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;
const jwt = require('jsonwebtoken');
const userSchema = new Schema({
  image: {
    type: String,
    default: '',
  },
  email: {
    type: String,
    required: true,
    unique: true,
    min: 5,
    max: 255,
  },
  studentNumber: {
    type: String,
    required: true,
    unique: true,
    min: 7,
    max: 8,
  },
  name: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50,
  },
  password: {
    type: String,
    min: 4,
    max: 1024,
  },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  isOwner: {
    type: Boolean,
    default: true,
  },
});

userSchema.methods.generateAuthToken = function () {
  const user = {
    _id: this._id,
    name: this.name,
    email: this.email,
    posts: this.posts,
    studentNumber: this.studentNumber,
    isOwner: this.isOwner,
  };
  const token = jwt.sign(user, process.env.JWT_SECRET);
  return token;
};

userSchema.pre('save', async function (next) {
  if (this.isNew) {
    const initials = this.name
      .split(' ')
      .map((name) => name.charAt(0))
      .join('');
    const lastThreeDigits = this.studentNumber.slice(-3);
    const password = initials + lastThreeDigits;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    this.password = hashedPassword;

    // Send email
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'go.villidane@mscmarinduque.edu.ph',
        pass: 'zzrw uudm reoq rksu',
      },
    });

    let mailOptions = {
      from: 'go.villidane@mscmarinduque.edu.ph',
      to: this.email,
      subject: 'Welcome to Imahe Portal',
      text: `Hello ${this.name},\n\nWelcome to Imahe Portal. Your username is your student number ${this.studentNumber} and your password is ${password}. \n\nRegards,\nImahe Portal Team\n login at https://project-imahe.vercel.app//login`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    transporter.verify(function (error, success) {
      if (error) {
        console.log(error);
      } else {
        console.log('Server is ready to take our messages');
      }
    });
  }
  next();
});

module.exports = userSchema;
