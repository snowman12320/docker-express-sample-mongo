var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


let count = 0; // 計數器
router.get('/count', (req, res) => {
  count++; // 增加計數器
  res.render('count', { count }); // 傳遞計數器到 EJS 模板
});

module.exports = router;
