const mongoose = require('mongoose');
const photoSchema = require('./photo');

const Photo = mongoose.model('Photo', photoSchema);

module.exports = Photo;
