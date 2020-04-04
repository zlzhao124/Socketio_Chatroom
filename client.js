    var socketio = io.connect();

    // get username
    socketio.on("connect", function () {
      var user = prompt("Enter the Username:");
      socketio.emit("newUser", { username: user });
    });


