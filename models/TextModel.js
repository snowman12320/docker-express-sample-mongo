// models/TextData.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const textDataSchema = new Schema({
  text: { type: String, required: true },
});

module.exports = mongoose.model('TextData', textDataSchema);
