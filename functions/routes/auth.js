const { User } = require('../models/user');
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const Joi = require('joi');

router.post('/', async (req, res) => {
  const { error } = validate(req.body);
  if (error) {
    return res.status(400).send({
      message: error.details[0].message,
    });
  }

  let user = await User.findOne({ studentNumber: req.body.studentNumber });
  if (!user) {
    return res.status(400).send({
      message: 'Invalid Student Id or password.',
    });
  }
  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) {
    return res.status(400).send({
      message: 'Invalid Student Id or password.',
    });
  }
  const token = user.generateAuthToken();
  res.send({
    message: 'Login successful...',
    user: user,
    token: token,
  });
});

function validate(req) {
  const schema = Joi.object({
    studentNumber: Joi.string().min(7).max(8).required(),
    password: Joi.string().min(6).max(1024).required(),
  });
  return schema.validate(req);
}

module.exports = router;
