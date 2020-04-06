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
var allUsers={};
var allRooms = [{'roomName':'lobby', 'creator': ' '},{'roomName':'sampleroom', 'creator': ' '}];
var socketIDs = {};//IDs of sockets must be stored so one specific socket can be target for private message, kick, and ban
var Owner = {};
//var allRoomspwd = [{'roomName':'private room lobby'},{'roomName':'sampleroom'}];

// Do the Socket.IO magic:
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
                // This callback runs when a new Socket.IO connection is established.

                //some of the code this newUser blockwas inspired by this link:  
                //http://psitsmike.com/2011/10/node-js-and-socket-io-multiroom-chat-tutorial/
        socket.on('newUser', function(username){
                //every time a new user is added, store their relevant information and update who is in the room
                var userInvalid = false;
                if (username == null || username == "") {
                        userInvalid = true;
                }

                if (!userInvalid){
                        var newUser={}; //want to store current room and username inside one variable, and then store that one into a json of usernames
                        socketIDs[username] = socket.id;
                        socket.currentUser = username;
                        socket.bans = '';
                        newUser.name = username;
                        socket.currentRoom = 'lobby';
                        socket.join('lobby');
                        socket.broadcast.to('lobby').emit('update', username + ' has connected');
                        socket.emit('updateRoom', allRooms, 'lobby');
                        newUser.room= socket.currentRoom;
                        allUsers[username] = newUser;

                }
        });

        socket.on('message_to_server', function(data) {
                // This callback runs when the server receives a new message from the client.
                        console.log(socket.currentUser+": "+data.message); // log it to the Node.JS output
                        io.sockets.in(socket.currentRoom).emit("message_to_client", socket.currentUser, {message:data.message }); // broadcast the message to other users

        });

        socket.on("switchRoom", function(newRoom){
                                //switchRoom code was also inspired by http://psitsmike.com/2011/10/node-js-and-socket-io-multiroom-chat-tutorial/
                //this is for switching in and out of rooms. Update all the relevant user information
                //and update who is in the room you just entered and broadcast to everyone in the previous room you left

                if (socket.bans.includes(", " + newRoom)){
                        //failure because banned
                        socket.emit('update', 'You are banned from this room!');
                }

                else{
                socket.leave(socket.room);
                socket.join(newRoom);
                allUsers[socket.currentUser].room = newRoom;
                console.log("now a user has switched to" + allUsers[socket.currentUser].room);
                socket.emit('update', 'you have connected to ' +newRoom);
                socket.broadcast.to(socket.currentRoom).emit('update', socket.currentUser + ' has left this room');
                socket.currentRoom = newRoom;
                socket.broadcast.to(newRoom).emit('update', socket.currentUser + ' has joined this room');
                socket.emit('updateRoom', allRooms, newRoom);
                }
        });

/*
        socket.on("newRoomPW", function (data) {// process new Private room info and send it back to server side
                var roomExist = false;
                //allRooms.push({roomName:newRoomPW});
                var rmName = data["roomName"];
                var rmPWD = data["roomPW"];
                for (var r in allRooms) {
                        if (allRooms[r] == rmName) {
                                roomExist = true;
                        }
                }
                if (!roomExist) {
                        Owner[rmName] = socket.currentUser;
                        allRooms.push(rmName);
                        allRoomspwd[rmName] = rmPWD;
                        allUsers[rmName] = []
                }
                io.emit('updateRoomPWD',allRooms, socket.currentRoom, );
        });*/


        socket.on("addRoom", function(addRoom){
                allRooms.push({roomName:addRoom , creator:socket.currentUser});
                console.log(allRooms);
                io.emit('updateRoom', allRooms, socket.currentRoom);
                });

        socket.on("pm", function(receiver, data){
                //private message
                console.log(socket.currentUser+": "+data.message + "private"); // log it to the Node.JS output
                var sender = socket.currentUser;
                socket.broadcast.to(socketIDs[receiver]).emit('pm2', sender, {message:data.message});
        });

        socket.on("kickuser", function(username){
                //temporarily kick a user to the lobby

        for(var i=0; i<allRooms.length; i++){
            if(allRooms[i].roomName == socket.currentRoom && allRooms[i].creator == socket.currentUser){
                let socket = io.sockets.connected[socketIDs[username]];
                socket.leave(allUsers[username].room);
                socket.join("lobby");
                socket.currentRoom = 'lobby';
                socket.emit('updateRoom', allRooms, "lobby");

                io.sockets.connected[socketIDs[username]].emit('update', 'you were kicked to the lobby');
                socket.broadcast.to(allUsers[username].room).emit('update', socket.currentUser + ' has left this room');
                socket.broadcast.to("lobby").emit('update', socket.currentUser + ' has joined this room');
                socket.emit('updateRoom', allRooms, "lobby");
                console.log("kicked a user. " + allUsers[username].room);
                        }
                }
        });

        socket.on("banuser", function(username){
                //same as kickuser initally, but also imposes a ban

        for(var i=0; i<allRooms.length; i++){
            if(allRooms[i].roomName == socket.currentRoom && allRooms[i].creator == socket.currentUser){
                let socket = io.sockets.connected[socketIDs[username]];
                socket.leave(allUsers[username].room);
                socket.join("lobby");
                socket.currentRoom = 'lobby';
                socket.emit('updateRoom', allRooms, "lobby");
                io.sockets.connected[socketIDs[username]].emit('update', 'you were kicked to the lobby');
                socket.broadcast.to(allUsers[username].room).emit('update', socket.currentUser + ' has left this room');
                socket.broadcast.to("lobby").emit('update', socket.currentUser + ' has joined this room');
                socket.bans = socket.bans + ", " + allUsers[username].room;
                socket.emit('updateRoom', allRooms, "lobby");
                console.log("banned a user. " + allUsers[username].room);
                console.log("current bans of " + socket.currentUser + " " + socket.bans);
                        }
                }
        });



                //disconnect code was also inspired by http://psitsmike.com/2011/10/node-js-and-socket-io-multiroom-chat-tutorial/
        socket.on('disconnect', function(){
                        delete allUsers[socket.username];
                        socket.broadcast.emit('update', socket.username + ' has disconnected');
                        socket.leave(socket.room);
        });
});

