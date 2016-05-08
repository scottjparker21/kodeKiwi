//Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var port = process.env.PORT || 3000;
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

var url     = require('url'),
    http    = require('http'),
    https   = require('https'),
    fs      = require('fs'),
    qs      = require('querystring'),
    express = require('express'),
    app     = express();

// Load config defaults from JSON file.
// Environment variables override defaults.
function loadConfig() {
  var config = JSON.parse(fs.readFileSync(__dirname+ '/config.json', 'utf-8'));
  for (var i in config) {
    config[i] = process.env[i.toUpperCase()] || config[i];
  }
  console.log('Configuration');
  console.log(config);
  return config;
}

var config = loadConfig();

function authenticate(code, cb) {
  var data = qs.stringify({
    client_id: config.oauth_client_id,
    client_secret: config.oauth_client_secret,
    code: code
  });

  var reqOptions = {
    host: config.oauth_host,
    port: config.oauth_port,
    path: config.oauth_path,
    method: config.oauth_method,
    headers: { 'content-length': data.length }
  };

  var body = "";
  var req = https.request(reqOptions, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) { body += chunk; });
    res.on('end', function() {
      cb(null, qs.parse(body).access_token);
    });
  });

  req.write(data);
  req.end();
  req.on('error', function(e) { cb(e.message); });
}


// Convenience for allowing CORS on routes - GET only
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS'); 
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});


app.get('/authenticate/:code', function(req, res) {
  console.log('authenticating code:' + req.params.code);
  authenticate(req.params.code, function(err, token) {
    var result = err || !token ? {"error": "bad_code"} : { "token": token };
    console.log(result);
    res.json(result);
  });
});

var port = process.env.PORT || config.port || 9999;

app.listen(port, null, function (err) {
  console.log('Gatekeeper, at your service: http://localhost:' + port);
});

//end troubleshooting code --------------->

app.set('port', (process.env.PORT || 5000));

// Routing
app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');

//not using ejs may need to change view engine
// app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

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

