const express = require('express');
const app = express();
const port = 7100;
const bodyParser = require('body-parser');
const compression = require('compression');
const env = require('./config/env').config();
const privateRoutes = require('./routes/privateAPI');
const WebSocketMessageClient = require("./server_common/WebSocketMessageClient");
const socketActionMessage = require("./socketActionModule/socketActionMessage");

const constMessageClientTypes = require("./const/constMessageClientTypes");

// app.use(bodyParser());
app.use(compression());
app.use('/', privateRoutes);

// app.listen(port, () => console.log(`Application listening on port ${port}!`));

let http = require('http');
let server = http.createServer(app);
let socketIO = require('socket.io').listen(server);

server.listen(port, () => console.log(`INTERNAL REST app listening on port ${port}!`));

let url = env.messageServerUrl + "/" + constMessageClientTypes.INTERNAL_REST;
let messageClient = new WebSocketMessageClient(url, socketIO);
socketIO.messageClient = messageClient;
let actionMessage = new socketActionMessage(socketIO);
socketIO.messageHandler = actionMessage.messageDispatcher.bind(actionMessage);