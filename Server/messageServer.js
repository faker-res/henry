var env = require("./config/env").config();
var WebSocketMessageServer = require("./server_common/WebSocketMessageServer");

var server = new WebSocketMessageServer(process.env.PORT || 9580);

server.run();
console.log("Message Server is running...");



