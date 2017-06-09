// Whole-script strict mode syntax
"use strict";

var ws = require("ws");

class WebSocketMessageClient {
    constructor(id, type, socket) {
        this.id = id;
        this.type = type;
        this.socket = socket;
    }
}

class WebSocketMessageServer {
    constructor(port) {
        //port
        this.port = port;
        //connected clients
        this.clients = [];
        //web socket server object
        this.wss = null;
    }

    /*
     * add ws connection to clients array
     */
    addClient(socket) {
        if(!socket)
            return;

        //create id(cur timestamp) for this ws client
        socket.id = new Date();
        //todo::add proper type here
        var type = socket.upgradeReq.url ? socket.upgradeReq.url.slice(1) : "";
        console.log("addClient", type);
        var newClient = new WebSocketMessageClient(socket.id, type, socket);
        this.clients.push(newClient);
    }

    /*
     * remove ws connection when it is disconnected
     */
    removeClient(socket) {
        if(!socket)
            return;

        var clients = this.clients;
        var idx = -1;
        for( var i = 0; i < clients.length; i++ ){
            if( socket.id == clients[i].id ){
                idx = i;
                break;
            }
        }
        if(idx === -1)
            return;
        clients.splice(idx, 1);
    }

    /*
     * run server
     */
    run() {
        if(this.wss){
            console.log("The server is running.");
            return;
        }

        this.wss = new ws.Server({port: this.port});
        var self = this;

        //check if str can be parsed by JSON
        var IsJsonString = function (str) {
            try {
                JSON.parse(str);
            } catch (e) {
                return false;
            }
            return true;
        };

        this.wss.on("connection", function(ws){
            console.log("A new connection is coming.");

            //add ws to client array
            self.addClient(ws);

            ws.on("message", function(message, flags){
                if(!message || !IsJsonString(message))
                    return;
                message = JSON.parse(message);
                self.dispatch(ws, message);
            });

            ws.on("close", function(code, message){
                console.log("Close the connection", code, message);
                self.removeClient(ws);
            });
        });
    }

    /**
     * Handle server received message
     * Dispatch message data to corresponding service and function
     */
    dispatch(socket, message){
        //send to all the clients with corresponding type
        var type = message["type"];
        if(!type){
            console.log("invalid type", type);
            return;
        }

        console.log("Relaying a message to clients of type:", type);
        for( let client of this.clients ){
            if( client.type == type ){
                var sendMsg = JSON.stringify(message);
                client.socket.send(sendMsg);
            }
        }
    }
}

module.exports = WebSocketMessageServer;