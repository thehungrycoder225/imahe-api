const mongoose = require('mongoose');
const Joi = require('joi');
const UserSchema = require('../schema/user');

const User = mongoose.model('User', UserSchema);
const validate = (user) => {
  const schema = Joi.object({
    image: Joi.string().default(''),
    email: Joi.string().min(6).max(255).required().email(),
    studentNumber: Joi.string().min(7).max(8).required(),
    name: Joi.string().min(6).max(255).required(),
  });
  if (user.isOwner) {
    schema.keys({
      albums: Joi.array().items(Joi.objectId()),
    });
  }
  return schema.validate(user);
};

module.exports = { User, validate };
