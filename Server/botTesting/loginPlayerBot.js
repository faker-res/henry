var dbconfig = require("../modules/dbproperties.js");
var services = require('../modules/services');
var botHelper = require('./botHelper.js');
var callAPI = services.callAPI;
var disconnectAndWait = botHelper.disconnectAndWait;
var noAutoReconnect = {autoReconnect: true};

module.exports = function (config) {
    "use strict";

    function simulatePlayerLogin (config) {
        return dbconfig.collection_platform.findOne({platformId: config.botPlatformId}).then(
            platformDetail => {
                let query = {
                    platform: platformDetail._id,
                    name: new RegExp('.*' + config.botPlayerPrefix + '.*')
                };

                return dbconfig.collection_players.find(query).sort({_id: -1}).limit(100);
            }
        ).then(
            playerDetails => {
                if(playerDetails && playerDetails.length > 0){
                    playerDetails.forEach(
                        player => {
                            if(player && player.name){
                                let loginData = {
                                    name: player.name,
                                    password: config.botPassword,
                                    platformId: config.botPlatformId
                                };

                                callAPIToLoginPlayer(loginData);
                            }
                        }
                    )
                }

                function callAPIToLoginPlayer(loginData){
                    return services.getClientClient(null, noAutoReconnect).then(
                        clientClient => Promise.resolve().then(
                            () => playerLogin(clientClient, loginData)
                        ).then(
                            playerData => {
                                let prom = [];
                                if(playerData && playerData.data && playerData.data.playerId){
                                    let paymentInfo = {
                                        playerId: playerData.data.playerId,
                                        bankName:config.botBankName,
                                        bankAccount: new Date().getTime() + "000",
                                        bankAccountName: config.botBankAccName
                                    };

                                    prom.push(updatePaymentInfo(clientClient, paymentInfo));
                                }

                                return Promise.all(prom);
                            }
                        ).then(
                            () => disconnectAndWait(clientClient)
                        )
                    );
                }
            }
        );
    }

    function playerLogin (clientClient, playerData) {
        return callAPI(clientClient, 'player', 'login', playerData);
    }

    function updatePaymentInfo(clientClient, newPaymentInfo){
        return callAPI(clientClient, 'player', 'updatePaymentInfo', newPaymentInfo);
    }

    return {
        simulatePlayerLogin: simulatePlayerLogin
    }
};