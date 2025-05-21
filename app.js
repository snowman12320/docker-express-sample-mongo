const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");

const indexRouter = require('./routes/index');
// const sleepDataRouter = require('./routes/sleepDataRouter');
// const pdfRouter = require('./routes/pdfRouter');
// const patientRouter = require('./routes/PatientRouter');
// const doctorRouter = require('./routes/DoctorRouter');
// const ctRouter = require('./routes/ctRouter');
const geminiRouter = require("./routes/geminiRouter");

const app = express();
app.use(cors());

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
// app.use('/sleep', sleepDataRouter);
// app.use('/pdf', pdfRouter);
// app.use('/patients', patientRouter);
// app.use('/doctors', doctorRouter);
// app.use('/ct', ctRouter);
app.use("/gemini", geminiRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));

module.exports = app;
