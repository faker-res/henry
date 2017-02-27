var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var dbconfig = require('./../modules/dbproperties');
var playerschema = require('./../schema/player');
var mongoose = require('mongoose');
var io = require('socket.io-client');

describe("Test login", function () {

    /* Test 1 - Admin user login and socket connection */
    it('Should login and create socket connection', function (done) {
        socketConnection.createConnection().then(function (client) {
            client.connected.should.equal(true);
            done();
        }).done();
    });

    //TODO::fix test and move it to player test
    //it('Should create socket connection', function (done) {
    //
    //    var token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcGlVc2VyIjoidGVzdDAyIiwiaWF0IjoxNDQ5NTY3NDc4LCJleHAiOjE0NDk1ODU0Nzh9.35ZaTlmLq_NwFxCqePK7nUd7JEhN_Dl3_6aErdphQ_w";
    //    //var token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..35ZaTlmLq_NwFxCqePK7nUd7JEhN_Dl3_6aErdphQ_w";
    //    var socketURL = 'http://localhost:9000';
    //    var options = {
    //        transports: ['websocket'],
    //        'force new connection': true
    //    };
    //
    //    options.query = 'token=' + token;
    //    var client = io.connect(socketURL, options);
    //
    //    client.on('connect', function () {
    //        var queryUser = {
    //            "playerId": "test02"
    //        };
    //        client.emit('findPlayer', queryUser);
    //
    //        client.on('_findPlayer', function (data) {
    //            client.removeAllListeners('_findPlayer');
    //            client.close();
    //            if (data.success && data.data && data.data.length > 0) {
    //                done();
    //            }
    //        });
    //    });
    //
    //});
});


