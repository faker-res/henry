var env = require('./../config/env');
var io = require('socket.io-client');
var http = require('http');
var querystring = require('querystring');
var Q = require("q");

// set env mode to qa
env.mode = "qa";
var socketURL = 'http://' + env.config().socketServerUrl + ':8080';
//TODO::add authentication later
var loginToken = true;
var options = {
    transports: ['websocket'],
    'force new connection': true
};

var socketConnection = {

    adminLogin: function () {
        var deferred = Q.defer();
        if (loginToken) {
            deferred.resolve();
            return deferred.promise;
        }

        var post_data = querystring.stringify({
            username: "admin",
            password: "Sinonet@2015"
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
            res.on('data', function (resData) {
                var data = JSON.parse(resData);
                if (data.success) {
                    loginToken = data.token;
                }
                deferred.resolve();
            });
        });

        // post the data
        post_req.write(post_data);
        post_req.end();

        return deferred.promise;
    },

    connectSocket: function () {
        var deferred = Q.defer();
        //options.query = 'token=' + loginToken;
        var client = io.connect(socketURL, options);

        client.on('connect', function (data) {
            deferred.resolve(client);
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
