$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  //var $gitUsernameInput = $('.gitUsernameInput')
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box
  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();
  //var $currentGitUsernameInput = $gitUsernameInput.focus();

  var socket = io();

  function addParticipantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    log(message);
  }

  // Sets the client's username
  function setUsername () {
    username = cleanInput($('.usernameInput').val().trim());
    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);
    }
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    $messages = $('.messages');
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events
  $window.keydown(function (event) {
    if ($("input.inputMessage").is(":focus") || $("input.usernameInput").is(":focus")) {
      // Auto-focus the current input when a key is typed
      if (!(event.ctrlKey || event.metaKey || event.altKey)) {
        $currentInput.focus();
      }
      // When the client hits ENTER on their keyboard
      if (event.which === 13) {
        if (username) {
          sendMessage();
          socket.emit('stop typing');
          typing = false;
        } else {
          setUsername();
        }
      }
    }
  });

  $( "#editor" ).on( "keyup",sendCode);
  
  function sendCode() {
    var code = editor.getValue();
    //console.log("getting input");
    if (connected) {
        //console.log("emitting input");
        socket.emit('new code', code);
    }
  } 

var object = {
   //pulling a list of repos from selected user and appending to a dropdown
   userRepo : function (data) {
    var gitUsername = data;
    function request() {  
      return $.ajax({
        type : 'GET',
        dataType : 'jsonp',
        cache : 'false',
        url: "https://api.github.com/users/"+gitUsername+"/repos",
        success: function(response) {
          var dropdown = '&nbsp;&nbsp;<select id="selection">';
          // console.log(response);
          $.each(response.data, function(key, value){
            dropdown += '<option value="' + value.name + '">' + value.name + '</option>';
          });
          dropdown += '</select>';
          $('#list').append(dropdown);     
        }
      });
    }
    $(document).ready(request);
  },
  repoContents : function (gitUsername, repoSelected) {
    var repoName = repoSelected;
    //console.log(repoName);
    //console.log(gitUsername);
    function request2() {
      return $.ajax({
        type : 'GET',
        dataType : 'jsonp',
        cache : 'false',
        url : "https://api.github.com/repos/"+gitUsername+"/"+repoName+"/contents",
        success: function(response) {
          var fileDropdown = '&nbsp;&nbsp;<select id="fileSelect">';
          $.each(response.data, function(key, value){
            fileDropdown += '<option value="' + value.path + '">' + value.name + '</option>';
          });
          fileDropdown += '</select>';
          $('#fileList').append(fileDropdown);
        }
      });
    }
    $(document).ready(request2);
  //return gitUsername;
  },
  pullFile : function(gitUsername, repoSelected, fileSelected) {
   console.log("editor/"+gitUsername+"/"+repoSelected+"/master/"+fileSelected);
    // editor.setValue("https://raw.githubusercontent.com/"+gitUsername+"/"+repoSelected+"/master/"+fileSelected);
    function request3() {
      return $.ajax({
        url : "https://raw.githubusercontent.com/"+gitUsername+"/"+repoSelected+"/master/"+fileSelected,
        success: function(response) {
          editor.setValue(response);
          document.getElementById('file').innerHTML() = fileSelected;
        }
      });
    }
    $(document).ready(request3);
  }
}

  //search for github user button command
  $( "#search").on( "click", function() {
    var text = $("#gitUserRepo").val();
    object.userRepo(text);
  });

  //select user's repo from dropdown button command
  $("#selectRepository").on("click", function() {
    var repoSelected = $('#selection').val();
    var gitUsername = $("#gitUserRepo").val();
    object.repoContents(gitUsername, repoSelected);
  });

  //select file from selected repository dropdown button command
  $( "#selectFile" ).on("click", function(){
    var repoSelected = $('#selection').val();
    var gitUsername = $("#gitUserRepo").val();
    var file = $('#fileSelect').val();
    //console.log(file);
    //emitting unique url to backend
    var fileUrl = "/#/editor/"+gitUsername+"/"+repoSelected+"/"+ file;
    window.location.assign(fileUrl);
    object.pullFile(gitUsername, repoSelected, file);
  });

  //triggers 'write file' to the server
  $( "#pushFile" ).on("click", function(){
    var repoSelected = document.getElementById('userRepo').innerText;
    var gitUsername = document.getElementById('gitUsername').innerText;
    var file = document.getElementById('file').innerText;
    console.log("file=" + file);
    console.log("repoSelected " + repoSelected);
    var content = editor.getValue();
    var commitMessage = prompt("Please enter commit message:");
    var personalGithubUsername = prompt("Please enter your Github username:");
    var githubEmail = prompt("Please enter the email address associated with your Github account:");
    socket.emit('write file', repoSelected, gitUsername, file, content, commitMessage, personalGithubUsername, githubEmail);
  });


  $('#repoOptions').change(function() {
      console.log('changed');
      alert($(this).val());
  });

  //handle oauth login
  $( "#oauth" ).on("click", oauth);

  function oauth() {
    console.log('emitting');
    socket.emit('get url',{});
    
  }

  socket.on('oauth token',function(data){
    console.log("oauth data " + data);
  });

  socket.on('pass url', function (data) {
    console.log(data + "front ends");
    var strUrl = data.oauth;
    window.location.assign(strUrl);
    // $( "#oauthUrl" ).append(strUrl); 
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events
  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Socket events
  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    var message = "Welcome to Socket.IO Chat ñ ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  socket.on('new code', function (data) {
    //console.log("receiving code");
    editor.setValue(data.code);
  });

  //pulls file from git when server emits 'pull file'
  socket.on('new git', function (file) {
    //console.log(file);
    //console.log("pulling file from server");
    //console.log(data.file);
    editor.setValue(file.data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  socket.on('new push', function () {
    alert("Success! Your file has been pushed to Github!");
  })
});

//Controllers ---------------------------------------------->

    // create the module and named it kodeKiwiApp
    // also include ngRoute for all our routing needs
var kodeKiwiApp = angular.module('kodeKiwiApp', ['ngRoute']);
    // create the module and name it scotchApp
    // configure our routes
    kodeKiwiApp.config(function($routeProvider) {
        $routeProvider
              // route for the home page
            .when('/', {
                templateUrl : 'pages/login.html',
                controller  : 'mainController'
            })
            //grab token from url
            // .when('/:token', {
            //     templateUrl : 'pages/login.html',
            //     controller : 'mainController'
            // })
            // route for the editor and chat page

            .when('/editor/:username/:repo/:file', {
                templateUrl : 'pages/editor.html',
                controller  : 'pagesController'
            })
            // route for the stats page
            .when('/stats', {
                templateUrl : 'pages/stats.html',
                controller  : 'statController'
            });
    });


    // Using these controllers for testing purposed atm.
    // create the controller and inject Angular's $scope
    kodeKiwiApp.controller('mainController', function($scope) {
        // create a message to display in our view
        $scope.message = 'awesome login page...someday';
    });

    kodeKiwiApp.controller('pagesController', function($scope, $route, $routeParams) {
        $scope.message = 'dope chat/code editor page.';
        $scope.file = $route.current.params.file;
        $scope.userRepo = $route.current.params.repo;
        $scope.gitUsername = $route.current.params.username;
        console.log("in controller " + file);
    });

    kodeKiwiApp.controller('statController', function($scope) {
        $scope.message = 'mint statistics page.';
    });



//End Controllers ----------------------------------------->












