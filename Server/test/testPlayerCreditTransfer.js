/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var Q = require("q");
var should = require('should');
var WebSocketClient = require('../server_common/WebSocketClient');
var GameService = require('../services/client/ClientServices').GameService;
var ClientGameAPITest = require('../testAPI/clientAPITest/ClientGameAPITest');

var PlayerService = require('../services/client/ClientServices').PlayerService;
var ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');

var commonTestFun = require('../test_modules/commonTestFunc');
var env = require("../config/env").config();
var dbConfig = require("../modules/dbproperties");
var dbMigration = require('../db_modules/dbMigration');

describe("Test Client API - Game Service", function () {
    return;

    it('Should create player', function (done) {
        dbConfig.collection_players.findOne({name: "vince"}).then(
            data => {
                data.validCredit = 20;
                return data.save();
            }
        ).then(
            playerData => {
                console.log("Before transfer", playerData.validCredit);
                done();
            }
        );
    });

    it('Should sync player proposal', function (done) {
        dbConfig.collection_players.findOne({name: "vince"}).then(
            data => {
                data.validCredit = 20;
                return data.save();
            }
        ).then(
            playerData => {
                console.log("Before transfer", playerData.validCredit);
                done();
            }
        );
    });

    var client = new WebSocketClient(env.clientAPIServerUrl);

    var gameService = new GameService();
    client.addService(gameService);
    var gameAPITest = new ClientGameAPITest(gameService);

    var playerService = new PlayerService();
    client.addService(playerService);
    var clientPlayerAPITest = new ClientPlayerAPITest(playerService);

    //// Init  Data - Start ///////
    it('Should update player credit', function (done) {
        dbConfig.collection_players.findOne({name: "vince"}).then(
            data => {
                data.validCredit = 20;
                return data.save();
            }
        ).then(
            playerData => {
                console.log("Before transfer", playerData.validCredit);
                done();
            }
        );
    });

    it('Should create a connection', function (done) {
        client.connect();
        client.addEventListener("open", function () {
            done();
        });
    });

    it('Should login apiUser', function (done) {
        const testPlayerLoginData = {
            "platformId": "0",
            "name": "vince",
            "password": "123456"
        };
        clientPlayerAPITest.login(function (data) {
            console.log("login", data.status);
            done();
        }, testPlayerLoginData);
    });

    it('Should test player credit transfer', function (done) {
        var prom = [];
        for( var i = 0; i < 5; i++ ){
            var promTest = gameAPITest.getLoginURL(function (data) {
                    console.log("getLoginURL", data);
                },
                {
                    "gameId": "008006B0-C330-437A-93A1-2F1D70392763",
                    "clientDomainName": "111"
                }
            );
            prom.push(promTest);
        }
        Q.all(prom).then( data => done() );
    });

    it('Should get player credit', function (done) {
        dbConfig.collection_players.findOne({name: "vince"}).then(
            data => {
                console.log("After transfer", data.validCredit);
                done();
            }
        );
    });

});

