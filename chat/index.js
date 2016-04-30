// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var port = process.env.PORT || 3000;
var Github = require('github-api');

var options = {
  'author':{'name': author, 'email': email},
  'commmitter':{'name': author, 'email': email}
}

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




  socket.on('pull file', function(data) {
    var github = new Github({
      'token' : "5ceb2ec5187c0f8c8c2cbe321461dbd6964e10c9",
      'auth' : "oauth"
    });

    repo.read('master', 'github/index.html', function(err, data) {
      console.log(data);
      console.log(err);

      io.sockets.on('new git', {
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






//api.js from initial test
//------------------------

//set the information your need to use the github-api
var username = "motlj";
var reponame = "example";
var email = "joshuadamotl@gmail.com";
var author = "Joshua Motl";

// https://github.com/settings/tokens
var oauthToken = "5ceb2ec5187c0f8c8c2cbe321461dbd6964e10c9";

//create instance of wrapper
var github = new Github({
  'token':oauthToken,
  'auth':"oauth"
})

//create rep object
var repo = github.getRepo(username, reponame);

//set the changes you want to make
var branchToModiy = 'master';
var fileToModify = 'github/index.html';
var fileContents = 'asdasdasdasdasdasdasdasdasdasdasdasdasdasd';
var commitMsg = 'attempting to change';

//write the changes to Github
repo.write(branchToModiy, fileToModify, fileContents, commitMsg, options, function(err) {});

//reads file from github
repo.read('master', 'github/index.html', function(err, data) {
  var fileContents = data;
  console.log(data);
  document.getElementById("#editor").innerHTML = fileContents;
  console.log(fileContents);
});