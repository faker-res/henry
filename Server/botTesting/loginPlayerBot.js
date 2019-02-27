var dbconfig = require("../modules/dbproperties.js");
var services = require('../modules/services');
var botHelper = require('./botHelper.js');
var callAPI = services.callAPI;
var disconnectAndWait = botHelper.disconnectAndWait;
var noAutoReconnect = {autoReconnect: true};

module.exports = function (config) {
    "use strict";

    function simulateCreate100BotPlayer (config){
        let platformData = {};

        return dbconfig.collection_platform.findOne({platformId: config.botPlatformId}).then(
            platformDetail => {
                if(platformDetail && platformDetail._id){
                    platformData = platformDetail;
                    return dbconfig.collection_playerLevel.findOne({platform: platformDetail._id, value: 0});
                }
            }
        ).then(
            playerLevel => {
                if(playerLevel && playerLevel._id){
                    let newPlayerData = {
                        password: config.botPassword,
                        platform: platformData._id,
                        playerLevel: playerLevel._id
                    };

                    for(let i = 0; i < 100; i ++){
                        newPlayerData.name = config.botPlayerPrefix + (1000 + i).toString();
                        newPlayerData.phoneNumber = (20800000000 + i).toString();

                        return dbconfig.collection_players(newPlayerData).save()
                    }
                }
            }
        )
    }

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
                }else{
                    simulateCreate100BotPlayer(config);
                }

                function callAPIToLoginPlayer(loginData){
                    return services.getClientClient(null, noAutoReconnect).then(
                        clientClient => Promise.resolve().then(
                            () => playerLogin(clientClient, loginData)
                        ).then(
                            playerData => {
                                let timeStamp = new Date().getTime().toString();
                                let updatePaymentInfoProm = [];
                                let updatePlayerEmailProm = [];
                                let updatePlayerWeChatProm = [];
                                let updatePlayerQQProm = [];
                                let aliPayTopupAndCancelProposalProm = [];
                                if(playerData && playerData.data && playerData.data.playerId){
                                    let paymentInfo = {
                                        playerId: playerData.data.playerId,
                                        bankName:config.botBankName,
                                        bankAccount: timeStamp + "000",
                                        bankAccountName: config.botBankAccName
                                    };

                                    updatePaymentInfoProm.push(updatePaymentInfo(clientClient, paymentInfo));
                                }

                                updatePlayerEmailProm.push(updatePlayerEmail(clientClient, {email: timeStamp + "@bot.com"}));
                                updatePlayerWeChatProm.push(updatePlayerWeChat(clientClient, {wechat: timeStamp + "wechat"}));
                                updatePlayerQQProm.push(updatePlayerQQ(clientClient, {qq: timeStamp}));
                                updatePlayerQQProm.push(updatePlayerQQ(clientClient, {qq: timeStamp}));

                                let aliTopupDetail = {
                                    amount: 100,
                                    alipayName: config.botAlipayName
                                };
                                aliPayTopupAndCancelProposalProm.push(aliPayTopupAndCancelProposal(clientClient, aliTopupDetail));

                                return Promise.all(updatePaymentInfoProm).then(
                                    () => {
                                        return Promise.all(updatePlayerEmailProm);
                                    }
                                ).then(
                                    () => {
                                        return Promise.all(updatePlayerWeChatProm);
                                    }
                                ).then(
                                    () => {
                                        return Promise.all(updatePlayerQQProm);
                                    }
                                ).then(
                                    () => {
                                        return Promise.all(aliPayTopupAndCancelProposalProm);
                                    }
                                );
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

    function updatePlayerEmail(clientClient, newEmail){
        return callAPI(clientClient, 'player', 'updatePlayerEmail', newEmail);
    }

    function updatePlayerWeChat(clientClient, newWechat){
        return callAPI(clientClient, 'player', 'updatePlayerWeChat', newWechat);
    }

    function updatePlayerQQ(clientClient, newQQ){
        return callAPI(clientClient, 'player', 'updatePlayerQQ', newQQ);
    }

    function aliPayTopupAndCancelProposal(clientClient, topupDetail){
        return callAPI(clientClient, 'payment', 'requestAlipayTopup', topupDetail).then(
            result => {
                if(result && result.data && result.data.proposalId){
                    return callAPI(clientClient, 'payment', 'cancelAlipayTopup',{proposalId: result.data.proposalId});
                }
            }
        )
    }

    return {
        simulatePlayerLogin: simulatePlayerLogin
    }
};