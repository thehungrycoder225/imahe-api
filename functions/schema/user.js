const mongoose = require('mongoose');
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
  const initials = this.name
    .split(' ')
    .map((name) => name.charAt(0))
    .join('');
  const lastThreeDigits = this.studentNumber.slice(-3);
  const password = initials + lastThreeDigits;
  console.log(password);

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password.toLowerCase(), salt);

  this.password = hashedPassword;
  next();
});

module.exports = userSchema;
