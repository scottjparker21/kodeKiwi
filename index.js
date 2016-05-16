//Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var port = process.env.PORT || 3000;
// var http  = require('http');
var https = require('https');
var Github = require('github-api');
var request = require('request');
var OAuth2 = require('oauth').OAuth2;
var qs = require('querystring');
var bodyParser = require('body-parser');
var session = require('express-session');

var morgan      = require('morgan');
var mongoose    = require('mongoose');
var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config'); // get our config file
var User   = require('./models/user'); // get our mongoose model

//mongodb -------------------------->

  mongoose.connect(config.database); // connect to database
  app.set('superSecret', config.secret); // secret variable

  // use body parser so we can get info from POST and/or URL parameters
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  // use morgan to log requests to the console
  app.use(morgan('dev'));

//end mongodb ---------------------->
    

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

//mongod routing

// API ROUTES -------------------
// =================================================================
// routes ==========================================================
// =================================================================
app.get('/setup', function(req, res) {

  // create a sample user
  var nick = new User({ 
    name: 'Nick Cerminara', 
    password: 'password',
    admin: true 
  });
  nick.save(function(err) {
    if (err) throw err;

    console.log('User saved successfully');
    res.json({ success: true });
  });
});

// basic route (http://localhost:8080)
app.get('/', function(req, res) {
  res.send('Hello! The API is at http://localhost:' + port + '/api');
});

// ---------------------------------------------------------
// get an instance of the router for api routes
// ---------------------------------------------------------
var apiRoutes = express.Router(); 

// ---------------------------------------------------------
// authentication (no middleware necessary since this isnt authenticated)
// ---------------------------------------------------------
// http://localhost:8080/api/authenticate
apiRoutes.post('/authenticate', function(req, res) {

  // find the user
  User.findOne({
    name: req.body.name
  }, function(err, user) {

    if (err) throw err;

    if (!user) {
      res.json({ success: false, message: 'Authentication failed. User not found.' });
    } else if (user) {

      // check if password matches
      if (user.password != req.body.password) {
        res.json({ success: false, message: 'Authentication failed. Wrong password.' });
      } else {

        // if user is found and password is right
        // create a token
        var token = jwt.sign(user, app.get('superSecret'), {
          // expires in 24 hours
        });

        res.json({
          success: true,
          message: 'Enjoy your token!',
          token: token
        });
        console.log(res.json);
      }   

    }

  });
});

// ---------------------------------------------------------
// route middleware to authenticate and check token
// ---------------------------------------------------------
apiRoutes.use(function(req, res, next) {

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.param('token') || req.headers['x-access-token'];

  // decode token
  if (token) {

    // verifies secret and checks exp
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;  
        next();
      }
    });

  } else {

    // if there is no token
    // return an error
    return res.status(403).send({ 
      success: false, 
      message: 'No token provided.'
    });
    
  }
  
});

// ---------------------------------------------------------
// authenticated routes
// ---------------------------------------------------------
apiRoutes.get('/', function(req, res) {
  res.json({ message: 'Welcome to the coolest API on earth!' });
});

apiRoutes.get('/users', function(req, res) {
  User.find({}, function(err, users) {
    res.json(users);
  });
});

apiRoutes.get('/check', function(req, res) {
  res.json(req.decoded);
});

app.use('/api', apiRoutes);

//--------------------->
//OAuth
var clientID = '92f0b715f8517d5cf638';
var clientSecret = 'c51d4e59c57a399d2e512de3a47688377e88f4ca';
var oauth2 = new OAuth2(clientID,
                        clientSecret,
                        'https://github.com/', 
                        'login/oauth/authorize',
                        'login/oauth/access_token',
                        null); /** Custom headers */
//declaring session variable


app.get('/callback', function(req,res) {
  
  console.log(req);
  var access = req.originalUrl.slice(10);
  var redir = "https://github.com/login/oauth/access_token?client_id="+clientID+"&client_secret="+clientSecret+"redirect_uri=http://localhost:3000/callback&" + access;
  var code = req.originalUrl.slice(15, req.originalUrl.length-11);

  authenticate(code,function(data,token){
    console.log("token " + token);
    //push file call goes here! ----->
    res.redirect('/');
  }); 
});

// app.get('/push_code/:access_token', function(req,res) {

//     var access_token = req.params.access_token;

// });

function authenticate(code, cb) {
  console.log("in authenticate function");
    var data = qs.stringify({
        client_id: clientID, //your GitHub client_id
        client_secret: clientSecret,  //and secret
        code: code,   //the access code we parsed earlier
        state: 'haha'
    });

    var reqOptions = {
        host: 'github.com',
        port: '443',
        path: '/login/oauth/access_token',
        method: 'POST',
        headers: { 'content-length': data.length }
    };

    var body = '';
    var req = https.request(reqOptions, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) { 
          body += chunk; 
        });
        res.on('end', function() {
            cb(null, qs.parse(body).access_token);
        });
    });
    
    req.write(data);
    req.end();
    req.on('error', function(e) { cb(e.message); });
    // window.location.assign('http://localhost:3000/#/');
}

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

  socket.on('new range', function (data) {
    console.log(data);
    socket.broadcast.emit('new range', {
      code : data
    });
  });

  socket.on('new cursor', function (data) {
    console.log(data);
    socket.broadcast.emit('new cursor', {
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

  // whern the client emits write file, this function will push the file to github
  socket.on('write file', function(repoSelected, gitUsername, file, content, commitMessage, personalGithubUsername, githubEmail){
   //console.log("made it to server side");
    var branch = 'master';
    var committer = {
      "name" : personalGithubUsername,
      "email" : githubEmail
    }

    var github = new Github({
      'token' : "de192231adfb273daab77bdb77dfb2c98d4005fb",
      'auth' : "oauth"
    });

    var repo = github.getRepo(gitUsername, repoSelected);

    repo.writeFile(branch, file, content, commitMessage, committer, function(data, err) {
      console.log(branch);
      console.log(file);
      console.log(content);
      console.log(commitMessage);
      console.log(committer);

      io.sockets.emit('new push', {
      });
    });
  });

  //getting url for oauth---------------------------------------- O AUTH --------->
  socket.on('get url', function (req, res) {
    console.log(req);
    console.log(res);
    var authURL = oauth2.getAuthorizeUrl({
        redirect_uri: 'http://localhost:3000/callback',
        scope: ['repo', 'user'],
        state: 'haha'
    });
    var url =  authURL ;
    //broadcasting url to frontend to append.

    socket.emit('pass url', { oauth : url});
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

