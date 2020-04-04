// Require the packages we will use:
var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.
	
	fs.readFile("client.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.
		
		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);


var allRooms = [];
var allUsers = [];
var allRoomsPW = {};
var roomOwner = {};
var userLocation = {};
var allRoomUsers = {};

var io = socketio.listen(app);
io.sockets.on("connection", function (socket) {

    //new user process user info
    socket.on("newUser", function (data) { // process new user's username and send it back to server side
    var userInvalid = false;
    var username = data["username"];
    if (username == null) {
        userInvalid = true;
    }
    if (!userInvalid) {
        for (var u in allUsers) {
            if (allUsers[u] == username) {
                userInvalid = true;
              
            }
        }
        if (!userInvalid) {
            allUsers.push(username);
            socket.currentUser = username;
            socket.currentRoom = "lobby";
            userLocation[socket.currentUser] = "lobby";
            if (allRoomUsers["lobby"] == null) {
                allRoomUsers["lobby"] = [];
            }
            //userPreviousRoom[username] = null;
            allRoomUsers["lobby"].push(username);
            socket.join("lobby");
            //io.sockets.in(socket.currentRoom).emit("joinRoom", { currentUser: socket.currentUser, currentRoom: socket.currentRoom, currentRoomPW: null, currentUsers: allUsers, joinRoom: false });
        }
    }
    socket.emit("getNewUser", { users: allUsers, username: username, invalid: userInvalid });
});



socket.on("updateUser", function (data) { // process update user info and send it back to server side
    io.sockets.emit("getUserList", { users: allUsers, currentUser: socket.currentUser, newUser: data["newUser"] });
});



socket.on("newRoom", function (data) { // process new Room info and send it back to server side
    var roomExist = false;
    var rmName = data["roomName"];
    for (var r in allRooms) {
        if (allRooms[r] == rmName) {
            roomExist = true;
        }
    }
    if (!roomExist) {
        roomOwner[rmName] = socket.currentUser;
        allRooms.push(rmName);
        allRoomsPW[rmName] = null;
        allRoomUsers[rmName] = [];
    }
    io.sockets.emit("getNewRoom", { rooms: allRooms, roomName: rmName, exist: roomExist });
});

socket.on("newRoomPW", function (data) {// process new Private room info and send it back to server side
    var roomExist = false;
    var rmName = data["roomName"];
    var rmPW = data["roomPW"];
    for (var r in allRooms) {
        if (allRooms[r] == rmName) {
            roomExist = true;
        }
    }
    if (!roomExist) {
        roomOwner[rmName] = socket.currentUser;
        allRooms.push(rmName);
        allRoomsPW[rmName] = rmPW;
        allRoomUsers[rmName] = []
    }
    io.sockets.emit("getNewRoom", { rooms: allRooms, roomName: rmName, exist: roomExist });
});

// io.on('connection', socket => {
//   socket.on('new-user', name => {
//     users[socket.id] = name
//     socket.broadcast.emit('user-connected', name)
//   })
//   socket.on('send-chat-message', message => {
//     socket.broadcast.emit('chat-message', { message: message, name: users[socket.id] })
//   })
//   socket.on('disconnect', () => {
//     socket.broadcast.emit('user-disconnected', users[socket.id])
//     delete users[socket.id]
//   })
// })



// // Do the Socket.IO magic:
// var io = socketio.listen(app);
// io.sockets.on("connection", function(socket){
//     // This callback runs when a new Socket.IO connection is established.
//     socket.on("newUser", function (data) { 

	
// 	socket.on('message_to_server', function(data) {
// 		// This callback runs when the server receives a new message from the client.
		
// 		console.log("message: "+data["message"]); // log it to the Node.JS output
// 		io.sockets.emit("message_to_client",{message:data["message"] }) // broadcast the message to other users
// 	});
// });




});