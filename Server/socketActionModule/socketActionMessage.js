"use strict";

class socketActionMessage {

    /*
     * constructor
     * @param {String} url
     * @param {Object} wss
     */
    constructor(ioServer) {
        this.socektIOServer = ioServer;

        this.messageHandlers = {
            "notifyTopUpIntentionUpdate": this.notifyTopUpIntentionUpdate,
            "notifyRegistrationIntentionUpdate": this.notifyRegistrationIntentionUpdate,
            "notifyNewProposal": this.notifyNewProposal
        };
    }

    /*
     * handle message from message server based on "functionName"
     * @param {Object} message
     */
    messageDispatcher(message){
        if( message && message.functionName ){
            if( this.messageHandlers[message.functionName] ){
                this.messageHandlers[message.functionName].bind(this)(message);
            }
            else{
                this.socektIOServer.sockets.emit(message.functionName, message);
            }
        }
    }

    /*
     * notify connected socket clients with related platform
     * @param {Object} message
     */
    notifySocketByPlatform(message){
        if(message && message.data){
            var platform = message.data.platformId;
            var sockets = this.socektIOServer.sockets.sockets;
            if(sockets){
                for (let key of Object.keys(sockets)) {
                    var socket = sockets[key];
                    if(socket.decoded_token && socket.decoded_token.platforms){
                        if(socket.decoded_token.platforms == "admin" || socket.decoded_token.platforms.indexOf(platform) >= 0 ){
                            socket.emit(message.functionName, message);
                        }
                    }
                }
            }
        }
    }

    /*
     * message handlers
     */

    /*
     * notify client to update top up intention info
     * @param {Object} message
     */
    notifyTopUpIntentionUpdate(message){
        this.notifySocketByPlatform.bind(this)(message);
    }

    /*
     * notify client to update registration intention info
     * @param {Object} message
     */
    notifyRegistrationIntentionUpdate(message){
        this.notifySocketByPlatform.bind(this)(message);
    }

    /*
     * notify client to update proposal data
     * @param {Object} message
     */
    notifyNewProposal(message){
        this.notifySocketByPlatform.bind(this)(message);
    }

}

module.exports = socketActionMessage;



