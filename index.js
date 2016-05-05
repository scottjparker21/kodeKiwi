// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var port = process.env.PORT || 3000;
var Github = require('github-api');

var username = "motlj";
var reponame = "ecommerce";
var email = "joshuadamotl@gmail.com";
var author = "Joshua Motl";
var oauthToken = "26cf51edb6aeb476c2f9d59af458823f5b808690";
var options = {
  'author':{'name': author, 'email': email},
  'commmitter':{'name': author, 'email': email}
};

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

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

  //when the client emits 'pull user repo', this listens and executes
/*  socket.on('pull user repo', function (data) {
    console.log(data);
    var gitUsername = data
    var github = new Github({
      'token' : "d6f8a56096c7d1c23cc9e22d8238d1ba44d50d5a",
      'auth' : "oauth"
    });

    var user = github.getUser(data);

    user.getRepos(function(err, repos) {
      console.log(repos);
      io.sockets.emit('display repos', gitUsername, {
        data : repos
      });
    });
  });*/

  socket.on('pull file', function(data) {
    var filePath = data;
    filePath += '?ref=master';
    console.log(filePath);
    var github = new Github({
      'token' : "26cf51edb6aeb476c2f9d59af458823f5b808690",
      'auth' : "oauth"
    });
    var repo = github.getRepo(username, reponame);
    var raw = true;
    repo.getContents('master', filePath, raw, function(err, data) {
      //console.log(data);
      console.log(err);
      io.sockets.emit('new git', {
        file : data
      });
    });
  });

/*  socket.on('push file', function(){
    var branchToModiy = 'master';
    var fileToModify = 'chat/public/dummy.html';
    var fileContents = 'this is an attempt to push to the dummy file';
    var commitMsg = 'attempting to change dummy file';

    var github = new Github({
      'token' : "ba26df95ccddf03e066259d517a44e0763a3f052",
      'auth' : "oauth"
    });

    var repo = github.getRepo(username, reponame);

    repo.write(branchToModiy, fileToModify, fileContents, commitMsg, options, function(err) {
      console.log(data);    
      io.sockets.emit('new push', {
        file : data
      });
    });
  });*/

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
