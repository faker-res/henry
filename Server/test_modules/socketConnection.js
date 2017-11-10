var env = require('./../config/env');
var io = require('socket.io-client');
var http = require('http');
var querystring = require('querystring');
var Q = require("q");

// set env mode to qa
//env.mode = "qa";
var socketURL = 'http://' + env.config().socketServerUrl + ':9000';
var loginToken;
var options = {
    transports: ['websocket'],
    'force new connection': true
};

var socketConnection = {

    adminName: null,

    adminLogin: function () {
        var deferred = Q.defer();
        if (loginToken) {
            deferred.resolve();
            return deferred.promise;
        }

        var post_data = querystring.stringify({
            username: "admin",
            // password: "sinonet"
            password: "Snsoft@930816"
        });

        // An object of options to indicate where to post to
        var post_options = {
            host: env.config().socketServerUrl,
            port: '9000',
            path: '/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(post_data)
            }
        };

        // Set up the request
        var post_req = http.request(post_options, function (res) {
            res.setEncoding('utf8');
            // To avoid handling de-chunking manually, we could use `require('request')` which is higher level.
            var chunks = [];
            res.on('data', function (data) {
                chunks.push(data);
            });
            res.on('end', function () {
                var resData = chunks.join('');
                try {
                    var data = JSON.parse(resData);
                    if (data.success) {
                        loginToken = data.token;
                        socketConnection.adminName = data.adminName;
                        deferred.resolve();
                    } else {
                        deferred.reject(Error(resData));
                    }
                } catch (e) {
                    deferred.reject(Error('"' + e + '" while parsing: ' + resData));
                }
            });
        });

        // post the data
        post_req.write(post_data);
        post_req.end();

        return deferred.promise;
    },

    connectSocket: function () {
        var deferred = Q.defer();
        options.query = 'token=' + loginToken;
        var client = io.connect(socketURL, options);

        client.on('connect', function (data) {
            deferred.resolve(client);
        });

        client.on('error', function(error){
            console.log("error", error);
        });

        return deferred.promise;
    },

    createConnection: function () {
        var self = this;
        if (loginToken) {
            return self.connectSocket();
        }
        else {
            return self.adminLogin().then(self.connectSocket);
        }
    }
}

module.exports = socketConnection;
