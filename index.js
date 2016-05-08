Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app).listen(process.env.PORT || 8080);
var io = require('socket.io').listen(server);
// var port = process.env.PORT || 3000;
var Github = require('github-api');

var username = "scottjparker21";
var reponame = "kodeKiwi";
var email = "scottjparker21@gmail.com";
var author = "Scott Parker";
var oauthToken = "e59cbe790a1fffc2ab6de2948b896761ddac443c";
var options = {
  'author':{'name': author, 'email': email},
  'commmitter':{'name': author, 'email': email}
};

// http.listen(process.env.PORT || 3000, function(){
//   console.log('listening on', http.address().port);
// });

//trouble shooting heroku server here ---------->

// app.set('port', (process.env.PORT || 5000));

// Routing
app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


// server.listen(port, function () {
//   console.log('Server listening at port %d', port);
// });



// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;
  //var addedGitUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  //when the client emits 'new code', this listens and executes
  socket.on('new code', function (data) {
    console.log(data);
    socket.broadcast.emit('new code', {
      code : data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  socket.on('pull file', function() {
    var github = new Github({
      'token' : "e59cbe790a1fffc2ab6de2948b896761ddac443c",
      'auth' : "oauth"
    });
    var repo = github.getRepo(username, reponame);
    var raw = true;
    repo.getContents('master', 'public/index.html', raw, function(err, data) {
      console.log(data);
      console.log(err);
      io.sockets.emit('new git', {
        file : data
      });
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});

