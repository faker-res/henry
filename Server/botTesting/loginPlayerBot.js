var dbconfig = require("../modules/dbproperties.js");
var services = require('../modules/services');
var botHelper = require('./botHelper.js');
var Q = require("q");
var callAPI = services.callAPI;
var disconnectAndWait = botHelper.disconnectAndWait;
var noAutoReconnect = {autoReconnect: false};

module.exports = function (config) {
    "use strict";

    function simulatePlayerLogin (config) {
        return dbconfig.collection_platform.findOne({platformId: config.testPlatformId}).then(
            platformDetail => {
                return dbconfig.collection_players.find({platform: platformDetail._id}).sort({_id: -1}).limit(100);
            }
        ).then(
            playerDetails => {
                if(playerDetails && playerDetails.length > 0){
                    playerDetails.forEach(
                        player => {
                            if(player && player.name){
                                let loginData = {
                                    name: player.name,
                                    password: config.testAccountPassword,
                                    platformId: config.testPlatformId
                                };

                                callAPIToLoginPlayer(loginData);
                            }
                        }
                    )
                }

                function callAPIToLoginPlayer(loginData){
                    return services.getClientClient(null, noAutoReconnect).then(
                        clientClient => Q.resolve().then(
                            () => playerLogin(clientClient, loginData)
                        ).then(
                            () => disconnectAndWait(clientClient)
                        )
                    );
                }
            }
        );
    }

    function playerLogin (clientClient, playerData) {
        return callAPI(clientClient, 'player', 'login',playerData ).then(
            returnedObj => {
                console.log("Success");
            }
        );

    }

    return {
        simulatePlayerLogin: simulatePlayerLogin
    }
};