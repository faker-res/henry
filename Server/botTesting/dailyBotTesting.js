/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

//This script is to add top up and consumption for bot players

var Q = require("q");
var dbconfig = require("../modules/dbproperties");
var dbPlatform = require("../db_modules/dbPlatform.js");
var dbPlayerLevel = require("../db_modules/dbPlayerLevel.js");
var services = require('../modules/services');
var botHelper = require('./botHelper.js');

//basic config
var config = require("./botConfig");

var count = 0;

function playerAddTopUp(clientClient, player) {
    const topUpAmount = botHelper.randomNumberInRange(config.minTopUpAmount, config.maxTopUpAmount);
    var addTopUpRequest = {
        "topupType": "1",
        "amount": topUpAmount,
        "merchantUseType": 1,
        "clientType": 1
    };
    var paymentApi = 'createOnlineTopupProposal';
    //online or manual top up
    if (Math.random() > 0.5) {
        paymentApi = "requestManualTopup";
        addTopUpRequest = {
            "amount": topUpAmount,
            "lastBankcardNo": "1234",
            "bankTypeId": "1",
            "depositMethod": "1",
            "provinceId": "1",
            "cityId": "1",
            "districtId": "1"
        };
    }
    return services.getPaymentClient(config.testApiUserData, {autoReconnect: false}).then(
        paymentClient => {
            return Q.resolve().then(
                () => services.callAPI(clientClient, 'payment', paymentApi, addTopUpRequest)
            ).then(
                proposal => {
                    count++;
                    //console.log("count", count, proposal.data.proposalId);
                    return services.callAPI(paymentClient, 'proposal', 'setTopupProposalStatus', {
                        "proposalId": proposal.data.proposalId,
                        "orderStatus": "1",
                        "depositId": paymentApi == 'createOnlineTopupProposal' ? proposal.data.topupDetail.requestId : proposal.data.result.requestId
                    });
                }
            ).finally(
                () => botHelper.disconnectAndWait(paymentClient)
            );
        }
    );
};

var playerAddConsumption = function(platform, player) {
    var providerClient = null;
    return services.getProviderClient(config.testApiUserData, {autoReconnect: false}).then(
        client => {
            providerClient = client;
            var platformId = platform.platformId;
            var gameProviderObjIdsForPlatform = platform.gameProviders;
            return dbconfig.collection_gameProvider.find({_id: {$in: gameProviderObjIdsForPlatform}}).then(
                providerList => {
                    if (providerList.length === 0) {
                        console.error("No providers listed for this platform!");
                        return;
                    }
                    var provider = botHelper.randomItemFromList(providerList);
                    return services.callAPI(providerClient, 'game', 'getGameList', {providerId: provider.providerId}).then(
                        gameList => {
                            if (gameList && gameList.data && gameList.data.length > 0) {
                                var game = botHelper.randomItemFromList(gameList.data);
                                const amount = botHelper.randomNumberInRange(config.minConsumptionAmount, config.maxConsumptionAmount);
                                const validAmount = amount;
                                const addConsumptionRequest = {
                                    userName: player.name,
                                    platformId: platformId,
                                    providerId: provider.providerId,
                                    gameId: game.gameId,
                                    amount: amount,
                                    validAmount: validAmount,
                                    orderNo: new Date().getTime(),
                                    roundNo: "Bot test play"
                                };
                                return services.callAPI(providerClient, 'consumption', 'addConsumption', addConsumptionRequest);
                            }
                        }
                    );
                }
            );
        }
    ).finally(
        () => botHelper.disconnectAndWait(providerClient)
    );
};

var addDailyBotRecords = function (platform, player) {
    const playerLoginData = {
        platformId: platform.platformId,
        name: player.name,
        password: config.botPassword
    };
    return services.getClientClient(playerLoginData, {autoReconnect: false}).then(
        (clientClient) => {
            //simulate top up
            var proms = [];
            var times = botHelper.randomNumberInRange(config.minTopUpTimes, config.maxTopUpTimes);
            //for( var i = 0; i < times; i++ ){
            proms.push(playerAddTopUp(clientClient, player));
            //}
            return Q.all(proms);
        }
    ).then(
        () => {
            var proms = [];
            var times = botHelper.randomNumberInRange(config.minConsumptionTimes, config.maxConsumptionTimes);
            for( var i = 0; i < times; i++ ){
                proms.push(playerAddConsumption(platform, player));
            }
            return Q.all(proms);
        }
    );
};

var dailyBotTesting = function () {
    var platform = null;
    return dbconfig.collection_platform.findOne({platformId: config.botPlatformId}).then(
        platformData => {
            if (platformData) {
                platform = platformData;
                return dbconfig.collection_players.find({
                    platform: platform._id,
                    name: {$regex: (".*" + config.testPlayerName + "*.")}
                });
            }
            else {
                console.error("Can't find platform");
            }
        }
    ).then(
        players => {
            if (players && players.length > 0) {
                var proms = [];
                players.forEach(
                    player => {
                        proms.push(addDailyBotRecords(platform, player));
                    }
                );
                return Q.all(proms);
            }
        }
    ).catch(
        error => console.error(error)
    );

};

dailyBotTesting().then().catch(console.error);