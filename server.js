const express = require('express')
const mongoose = require('mongoose');
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
var moment = require('moment');

require('dotenv').config()

const User = require('./User');
const Exercise = require('./Exercise');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors())
app.use(express.static('public'))

// mongodb
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  // useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});
mongoose.connection.on("connected", () => {
  console.log("connected to mongodb");
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', (req, res) => {
  User.find({}, (err, users) => {
    res.json(users);
  })
});

app.get("/api/users/:userId/logs", (req, res) => {
  const {userId} = req.params;
  let {from, to, limit} = req.query;
  if(!from)
    from = new Date(-8640000000000000);
  else
    from = new Date(from);
  if(!to)
    to = new Date(8640000000000000);
  else
    to = new Date(to)
  if(!limit)
    limit = 100;
  try{
  Exercise.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          // date: {
          //   $gte: from,
          //   $lte: to,
          // },
        }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $group:{
          _id: "$user",
          count: { $sum: 1 },
          log: { $push: {
            description: "$description",
            duration: "$duration",
            date: "$date"
          }}
        }
      },
      {
        $lookup:{
          from: "exusers",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      }
    ],
    function(err, logs) {
      if(err)
          res.json("Unknown userId")
      if(logs.length===0){
        User.find({_id: userId}, (err, ipUser) => {
          if(err)
            res.json("Unknown userId")
          return res.json({
            _id: ipUser[0]._id,
            username: ipUser[0].username,
            count: 0,
            log: []
          })
        })
        return;
      }
      res.json({
        username: logs[0].user[0].username,
        count: logs[0].count,
        _id: logs[0]._id,
        log: logs[0].log.map((l) => {
          return {
            description: l.description,
            duration: l.duration,
            date: new Date(l.date).toDateString()
          }
        })
      });
    }
  )}
  catch(err){
    res.end("Unknown userId")
  }
})
app.post("/api/users", (req, res) => {
  const {username} = req.body;
  const user = new User({username: username});
  user.save((err, savedUser) => {
    if(err)
      return console.log(err);
    return res.json({
        username: savedUser.username,
      _id: savedUser._id
    });
  })
})

app.post("/api/users/:userId/exercises", (req, res) => {
  const {userId} = req.params;
  let {description, duration, date} = req.body;
  if(!date)
    date = new Date();
  const exercise = new Exercise({
    user: userId,
    description: description,
    date: date,
    duration: duration
  })
  exercise.save((err, savedExercise) => {
    if(err)
      return console.log(err);
    Exercise
      .populate(savedExercise, { path: "user" })
      .then(popEx => {
        res.json({
          _id: popEx.user._id,
          username: popEx.user.username,
          date: new Date(popEx.date).toDateString(),
          duration: popEx.duration,
          description: popEx.description
        });
      })
  })
})
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
