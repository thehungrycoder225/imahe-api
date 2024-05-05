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
    min: 6,
    max: 1024,
  },
  albums: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Album',
    },
  ],
  isOwner: {
    type: Boolean,
    default: true,
  },
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, email: this.email, studentNumber: this.studentNumber },
    process.env.JWT_SECRET
  );
  return token;
};

userSchema.pre('save', async function (next) {
  const initials = this.name
    .split(' ')
    .map((name) => name.charAt(0))
    .join('');
  const lastThreeDigits = this.studentNumber.slice(-3);
  const password = initials + lastThreeDigits;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password.toLowerCase(), salt);

  this.password = password;
  next();
});

module.exports = userSchema;
