/******************************************************************
 *        Fantasy Player Management System
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

"use strict";

var WebSocket = require("ws");
var serverInstance = require('../modules/serverInstance');

class WebSocketMessageClient {

    /*
     * constructor
     * @param {String} url
     * @param {Object} wss
     */
    constructor(url, wss) {
        this.conn = null;
        this.url = url;
        //web socket server that this client will send message to
        this.wss = wss;
        //create connection
        this.connect();

        serverInstance.setServerType(url.split('/').pop());
        serverInstance.setWebSocketMessageClient(this);
    }

    /*
     * Get web socket server of this message client
     */
    getWebSocketServer(){
        return this.wss;
    }

    /*
     * connect client to server
     */
    connect(){
        if(this.conn)
            return;

        var self = this;
        this.conn = new WebSocket(this.url);
        this.conn.onmessage = this.messageHandler.bind(this);
        
        this.conn.on("error", function(error){
            console.log("Web socket message client error", error);
            self.conn = null;
            self.reconnect.bind(self)();
        });

        this.conn.on("close", function(error){
            console.log("Web socket message client connection closed!");
            self.conn = null;
            self.reconnect.bind(self)();
        });
    }

    /*
     * reconnect to message server
     */
    reconnect(){
        var self = this;
        setTimeout(
            function(){
                if( !self.conn || self.conn.readyState != WebSocket.OPEN ){
                    self.connect();
                }
            }, 1000
        );

    }

    /*
     * connect client to server
     */
    messageHandler(message, flags){
        if(!message || !message.data)
            return;
        var data = JSON.parse(message.data);
        this.dispatch(data);
    }

    /*
     * dispatch message to service
     * @param {Object} dataObj
     */
    dispatch(dataObj){
        var serviceName = dataObj["service"], funcName = dataObj["functionName"];
        if(!serviceName|| !funcName){
            console.log("invalid function");
            return;
        }
        if( this.wss.getService ){
            //ws client
            var service = this.wss.getService(serviceName);
            if(service){
                var wsFunc = service.getFunction(funcName);
                if(wsFunc) //async function
                    wsFunc.dispatchResponse(dataObj["data"]);
            }
        }
        else{
            //socket io client
            this.wss.messageHandler(dataObj);
        }
    }

    /**
     * Send a message to message server
     * @param {String} type
     * @param {String} service
     * @param {String} functionName
     * @param {JSON} data
     */
    sendMessage(type, service, functionName, data) {
        var message = JSON.stringify(
            {
                type : type,
                service : service,
                functionName : functionName,
                data: data
            }
        );
        this.sendMessageString(message);
    }

    /*
     * send message to message server
     * @param {String|Object} message
     */
    sendMessageString(message){
        if( this.conn && this.conn.readyState == WebSocket.OPEN ){
            this.conn.send(message);
        }
    }

}

module.exports = WebSocketMessageClient;