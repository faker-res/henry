var http = require('http');
var socketio = require('socket.io');
var socketplayer = require('./serverAction/socketPlayer.js');

var server = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-type': 'text/html'});
    res.end("ok");
}).listen((process.env.PORT || 8080), function () {
    console.log('Listening at: http://localhost:' + (process.env.PORT || 8080));
});

var socketServer = socketio.listen(server);
var socketPlayer = require('./serverAction/socketPlayer');

socketServer.sockets.on('connection', function (socket) {
    socketplayer.listen(socketPlayer, socket);
});

