const WebSocket = require('ws')
const EventEmitter = require('events').EventEmitter;
var events = new EventEmitter();
const constServerCode = require('./../const/constServerCode');
const dbGame = require('./../db_modules/dbGame');
const env = require('./../config/env').config();

var ebetRTNFunc = function () {
};
module.exports = new ebetRTNFunc();

// var dbconfig = require('./dbproperties');

var socket;

// let holder = {};


var ebetRTN = {
    connect: function (reconnecTimes) {

        return new Promise((resolve, reject) => {
            try {
                socket = new WebSocket(env.ebetRTNUrl);

                let isOpen = false;

                socket.on('error', function(err) {
                    console.log('handle ws err', err)
                });

                socket.on('open', function () {
                    isOpen = true;
                    let sendData = {
                        command: "subscribe",
                        requestId: "LZsubscribe", // hard code
                        data: {
                            tableType: 1 // 8 for testing purpose
                        }
                    };
                    let json = JSON.stringify(sendData);

                    socket.send(json);
                    resolve(true);
                })

                setTimeout(() => {
                    if (!isOpen) {
                        if (reconnecTimes) {
                            console.log("luzhu api reconnecting " + reconnecTimes);
                            resolve(ebetRTN.connect(--reconnecTimes));
                        } else {
                            reject({message: "luzhu api connection failed"})
                        }
                    }
                }, 5000);


                socket.on('message', function (data) {

                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                    }

                    if (data && data.command && data.command == "listen") {
                        dbGame.notifyLiveGameStatus(data);
                    } else if (data && data.command && data.command == "query" && data.requestId) {
                        // data is sort by time
                        events.emit(data.requestId, data);
                    }
                });
            } catch (e) {
                reject({message: "luzhu api connection failed"})
            }
        })

    },

    // checkWSStatus: function() {
    //     // 0 - connection, 1 - open, 2 - closing, 3 - closed
    //     return socket && socket.readyState || 0;
    // },

    query: function (tableType, size) {
        if (!(socket && socket.readyState && socket.readyState == socket.OPEN)) {
            console.log("luzhu API not connected")
            return ebetRTN.connect().then(
                () => {
                    return sendQueryCommand(tableType, size);
                }
            );
        }

        return sendQueryCommand(tableType, size);

    },

    socket: () => socket,

};

function sendQueryCommand(tableType, size) {
    let requestId = "LZ" + new Date().getTime() + Math.random().toString(36).substr(2,4);
    let sendData = {
        command: "query",
        requestId: requestId,
        data: {
            tableType: tableType || 1,
            // table: "B2",
            // size: 30 // size refer to notification size
        }
    };
    if (size) {
        // sendData.data.size = size;
        sendData.data.numberOfTable = size;
    }
    var json = JSON.stringify(sendData);

    socket.send(json);

    return new Promise((resolve, reject) => {
        let handled = false;
        events.once(requestId, function (data) {
            handled = true;
            resolve(data)
        });

        setTimeout(function() {
            if (!handled) {
                events.removeAllListeners([requestId]);
                reject({code: constServerCode.EXTERNAL_API_TIMEOUT, message: "luzhu not available"});
            }
        }, 60000);
    });
};



var proto = ebetRTNFunc.prototype;
proto = Object.assign(proto, ebetRTN);

// This make WebStorm navigation work
module.exports = ebetRTN;