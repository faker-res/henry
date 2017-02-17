/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

//This script is to create bot player for each player level
var Q = require("q");
var dbconfig = require("../modules/dbproperties");
var dbPlatform = require("../db_modules/dbPlatform.js");
var dbPlayerLevel = require("../db_modules/dbPlayerLevel.js");
var services = require('../modules/services');
var botHelper = require('./botHelper.js');

//basic config
var config = require("./botConfig");

//create one bot player
var createBotPlayer = function (playerData, levelObjId) {
    return services.getClientClient(null, {autoReconnect: false}).then(
        clientClient => Q.resolve().then(
            () => botHelper.createOnePlayer(clientClient, playerData)
        ).then(
            (data) => {
                //console.log("new player:", data);
                botHelper.disconnectAndWait(clientClient);
                //update player level
                return dbconfig.collection_players.findOneAndUpdate(
                    {_id: data.data._id, platform: data.data.platform},
                    {
                        playerLevel: levelObjId,
                        "bankBranch": "singapore",
                        "bankAddress": "singapore",
                        "bankAccountCity": "singapore",
                        "bankAccountType": "1",
                        "bankAccountName": data.data.name,
                        "bankAccount": "1232321234232123",
                        "bankName": "DBS",
                    }
                );
            },
            error => {
                console.error(error);
            }
        )
    );
};

//create daily bot players for each level
var createDailyBotPlayers = function () {
    var platform = null;
    var playerLevels = [];
    return dbconfig.collection_platform.findOne({platformId: config.botPlatformId}).then(
        platformData => {
            if (platformData) {
                platform = platformData;
                return dbconfig.collection_playerLevel.find({platform: platform._id});
            }
            else {
                console.error("Can't find platform");
            }
        }
    ).then(
        levels => {
            if (levels && levels.length > 0) {
                playerLevels = levels;
                return dbconfig.collection_players.find({
                    platform: platform._id,
                    name: {$regex: (".*" + config.testPlayerName + "*.")}
                }).count();
            }
            else {
                console.error("Can't find player levels");
            }
        }
    ).then(
        count => {
            var proms = [];
            var playerCount = count;
            playerLevels.forEach(
                level => {
                    for( var i = 0; i < config.botPlayerNum; i++ ){
                        var playerName = config.testPlayerName + (playerCount++);// + "_" + level.name;
                        var playerData = {
                            name: playerName,
                            realName: playerName,
                            platform: platform._id,
                            platformId: platform.platformId,
                            password: config.botPassword,
                            phoneNumber: Math.floor(Math.random()*(13999999999-13000000000)+13000000000)
                        };
                        proms.push( createBotPlayer(playerData, level._id));
                    }
                }
            );
            return Q.all(proms);
        }
    );
};

createDailyBotPlayers().then().catch(console.error);






