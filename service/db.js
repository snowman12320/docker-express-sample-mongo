// db.js
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URL);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB 連接錯誤：'));
db.once('open', function () {
  console.log('MongoDB 連接成功');
});
