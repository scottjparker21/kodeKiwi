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
    username = cleanInput($usernameInput.val().trim());

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




/*  function setGithubUser () {
    gitUser = cleanInput($gitUsernameInput.val().trim());

    // If the github username is valid
    if (gitUser) {
      $gitUserPage.fadeOut();
      $repoListPage.show();
      $gitUserPage.off('click');
      $currentGitUsernameInput = $inputMessage.focus();

      // Tell the server the github username your accessing
      socket.emit('find gitUser', gitUser);
    }
  }*/





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
    console.log("getting input");
    if (connected) {
        console.log("emitting input");
        socket.emit('new code', code);
    }
  } 


  $( "#search").on( "click", function() {
    var text = $("#gitUserRepo").val();
    //console.log(text);
    //var text = $( "#gitUserRepo" ).text();
    pullUserRepo(text);
  });

  function pullUserRepo(data) {
    var gitUsername = data;
    console.log(gitUsername);

    function request() {  
      return $.ajax({
        type : 'GET',
        dataType : 'jsonp',
        cache : 'false',
        url: "https://api.github.com/users/"+gitUsername+"/repos",
        success: function(response) {
          $('#list').append('<div class="row">');
          console.log(response);
          $.each(response.data, function(key, value){
            console.log(value['name']);
            console.log(value['url']);
            console.log(value['id']);
            $('#list').append('<div class="row"><button class="select" value="'+value['id']+'" type="submit">'+ value['name']+'</button></div>');
          });
          $('#list').append('</div>');
        }
      });
    }
    $(document).ready(request);
    //socket.emit("pull user repo", gitUserName);
  }


  $( "#list" ).on( "click", function() {
    alert($(this).val());
    //var text = $("#list").val();
    //console.log(text);
    //pullfile(text);
  });





  $( "#button" ).on("click", pullFile);

  function pullFile() {
    console.log("pulling file");
    socket.emit('pull file', {});
  }


  //$( "#push" ).on("click", pushFile);

 /* function pushFile() {
    console.log("pushing file");
    socket.emit('push file', {});
  }*/



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



/*  socket.on('repoAccess', function (data) {
    connected = true;
    var message = "Welcome to " + data + "'s Github";
  });*/



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
    console.log("receiving code");
    editor.setValue(data.code);
  });


  //pulls file from git when server emits 'pull file'
  socket.on('new git', function (data) {
    console.log("pulling file from server");
    editor.setValue(data.file);
  });



  // pulls repo names from selected git user
/*  socket.on('display repos', function (gitUsername, data) {
    console.log("pulling repos from server");
    var gitUsername = gitUsername;
    console.log(gitUsername);
    function request() {  
      return $.ajax({
        type : 'GET',
        dataType : 'jsonp',
        cache : 'false',
        url: "https://api.github.com/users/"+gitUsername+"/repos",
        success: function(response) {
          $('#list').append('<div class="row">');
          $.each(response, function(key, value){
            console.log(value);
            $('#list').append('<div class="row"><p>' + value[0] +'<p></a><h3>' + value.collectionName + '</h3><h5>' + value.releaseDate.slice(0,4) + '</h5></div>');
            cover image, name, release year
          });
          $('#app').append('</div>');
        }
      })
    }
    $(document).ready(request);

    console.log(data);
    console.log(data[0]);
    document.getElementById("#list").innerHTML = (data.array[0].);
  });
*/





  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });
});
