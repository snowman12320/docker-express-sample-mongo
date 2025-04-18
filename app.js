var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('./service/db');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const textRouter = require('./routes/textRouter');
const mySqlRouter = require('./routes/mySqlRouter');
const sleepDataRouter = require('./routes/sleepDataRouter');
const mailRoutes = require('./routes/mailRoutes');
const pdfRouter = require('./routes/pdfRouter');
const patientRouter = require('./routes/PatientRouter');
const doctorRouter = require('./routes/DoctorRouter');
const ctRouter = require('./routes/ctRouter');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/text', textRouter);
app.use('/mySql', mySqlRouter);
app.use('/sleep', sleepDataRouter);
app.use('/mail', mailRoutes);
app.use('/pdf', pdfRouter);
app.use('/patients', patientRouter);
app.use('/doctors', doctorRouter);
app.use('/ct', ctRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));

module.exports = app;
