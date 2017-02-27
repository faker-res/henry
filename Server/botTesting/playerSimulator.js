var env = require("../config/env").config();
var dbconfig = require("../modules/dbproperties.js");
var services = require('../modules/services');
var botHelper = require('./botHelper.js');
var dbPlayerTopUpIntentRecord = require("../db_modules/dbPlayerTopUpIntentRecord.js");
var dbPaymentChannel = require("../db_modules/dbPaymentChannel.js");
var dbPlayerInfo = require("../db_modules/dbPlayerInfo.js");
var dbPlatform = require("../db_modules/dbPlatform.js");
var promiseUtils = require("../modules/promiseUtils.js");
var Q = require("q");
var chance = new require('chance')();

var callAPI = services.callAPI;
var reportError = botHelper.reportError;
var randomNumberInRange = botHelper.randomNumberInRange;
var randomItemFromList = botHelper.randomItemFromList;
var getAllRelevantPlatforms = botHelper.getAllRelevantPlatforms;
var disconnectAndWait = botHelper.disconnectAndWait;

var constRegistrationIntentRecordStatus = require("../const/constRegistrationIntentRecordStatus.js");

module.exports = function (config) {
    "use strict";

    /**
     * Note that 'probability' here actually means the probability of performing this action when it gets chosen from the list.
     */
    const possiblePlayerActions = [
        {
            fn: playerLogout,
            probability: 0.5,
            lastAction: true
        },
        {
            fn: playerQuitWithoutLogout,
            probability: 0.1,
            lastAction: true
        },
        //{
        //    fn: playerAddRegistrationIntention,
        //    probability: 1.0
        //},
        {
            fn: playerAddConsumption,
            probability: 0.3
        },
        {
            fn: playerAddTopUp,
            probability: 0.1
        }
    ];



    // Actions

    const allPaymentChannelsProm = dbPaymentChannel.getAllPaymentChannels();

    const noAutoReconnect = {autoReconnect: false};

    function playerLogout (clientClient, player) {
        return Q.resolve().then(
            // Not strictly necessary here, but used to test logout procedure
            () => callAPI(clientClient, 'player', 'logout', {playerId: player.playerId})
        ).then(
            () => console.log(new Date(), `[${player.playerId}] Logged out player`)
        );
    }

    function playerQuitWithoutLogout (clientClient, player) {
        console.log(new Date(), `[${player.playerId}] Player quit without logging out`);
        return Q.resolve();
    }

    function playerAddRegistrationIntention (clientClient, player) {
        return doRegistrationIntentionWithClient(clientClient, player.platform.platformId);
    }

    function playerAddConsumption (clientClient, player) {
        const platformObjId = player.platform._id;
        const platformId = player.platform.platformId;

        return services.getProviderClient(config.testApiUserData, noAutoReconnect).then(
            providerClient => {
                // We already have the platform, but actually we need its provider list
                return Q(dbPlatform.getPlatform({_id: platformObjId})).then(
                    platform => {
                        if (!platform) {
                            throw Error("Platform " + platformObjId + " not found.");
                        }
                        var platformId = platform.platformId;
                        var platformCode = platform.code;
                        var gameProviderObjIdsForPlatform = platform.gameProviders.map(gp => gp._id);
                        return dbconfig.collection_gameProvider.find({_id: {$in: gameProviderObjIdsForPlatform}}).then(
                            providerList => {
                                if (providerList.length === 0) {
                                    throw Error("No providers listed for this platform!");
                                }
                                var provider = randomItemFromList(providerList);

                                return callAPI(providerClient, 'game', 'getGameList', {providerId: provider.providerId}).then(
                                    gameList => {
                                        if( gameList && gameList.length > 0 ){
                                            var game = randomItemFromList(gameList);

                                            const amount = randomNumberInRange(500, 1500, 1000);
                                            const validAmount = amount / 2;
                                            const addConsumptionRequest = {
                                                userName: player.name,
                                                platformId: platformId,
                                                providerId: provider.providerId,
                                                gameId: game.gameId,
                                                amount: amount,
                                                validAmount: validAmount
                                            };
                                            return callAPI(providerClient, 'consumption', 'addConsumption', addConsumptionRequest);
                                        }
                                    }
                                );
                            }
                        );
                    }
                ).finally(
                    () => disconnectAndWait(providerClient)
                );
            }
        );
    }

    function playerAddTopUp (clientClient, player) {
        return allPaymentChannelsProm.then(
            paymentChannels => {
                const channel = randomItemFromList(paymentChannels);
                const topUpAmount = randomNumberInRange(5, 200, 5);

                const addTopUpRequest = {
                    playerId: player.playerId,
                    topupChannel: channel.channelId,
                    topUpAmount: topUpAmount
                };

                return services.getPaymentClient(config.testApiUserData, noAutoReconnect).then(
                    paymentClient => {
                        return Q.resolve().then(
                            () => callAPI(clientClient, 'payment', 'createOnlineTopupProposal', addTopUpRequest)
                        ).then(
                            proposal => callAPI(paymentClient, 'proposal', 'topupSuccess', {
                                proposalId: proposal.proposalId,
                                playerId: player.playerId,
                                amount: topUpAmount
                            })
                        ).finally(
                            () => disconnectAndWait(paymentClient)
                        );
                    }
                );

            }
        );
    }

    function createNewPlayer (platform) {
        const playerName = config.botNamePrefix + chance.name().replace(/\s+/g, '').toLowerCase();//+ Date.now() + ':' + Math.floor(Math.random() * 10000);
        const playerData = {
            name: playerName,
            platform: platform._id,            // For dbPlayerInfo.createPlayerInfo
            platformId: platform.platformId,   // For API player/create
            password: config.botPassword
        };

        return services.getClientClient(null, noAutoReconnect).then(
            clientClient => Q.resolve().then(
                () => botHelper.createOnePlayer(clientClient, playerData)
            ).then(
                () => disconnectAndWait(clientClient)
            )
        );
    }


    function doRegistrationIntention (platform) {
        return services.getClientClient(null, noAutoReconnect).then(
            clientClient => doRegistrationIntentionWithClient(clientClient, platform.platformId).then(
                () => disconnectAndWait(clientClient)
            )
        );
    }

    function doRegistrationIntentionWithClient (clientClient, platformId) {
        return Q.resolve().then(
            () => {
                const playerData = {
                    name: "testRegistrationIntentionPlayer",
                    mobile: "72834569283",
                    status: constRegistrationIntentRecordStatus.INTENT,
                    platformId: platformId
                };

                return callAPI(clientClient, 'registrationIntention', 'add', playerData);
            }
        ).then(
            data => promiseUtils.delay(1000 + 9000 * Math.random()).then( () => data )
        ).then(
            registrationIntention => {
                // Sometimes the player updates the registrationIntention, but sometimes they don't!
                if (Math.random() < 0.2) {
                    return;
                }

                const testRegistrationIntentionId = registrationIntention._id;

                const registrationIntentionUpdate = {
                    id: testRegistrationIntentionId ,
                    status: constRegistrationIntentRecordStatus.SUCCESS
                };

                return callAPI(clientClient, 'registrationIntention', 'update', registrationIntentionUpdate);
            }
        );
    }



    // Player simulation engine

    function collectAllPlayers () {
        return getAllRelevantPlatforms(config).then(
            platforms => {
                let allPlayers = [];

                return promiseUtils.each(platforms, platform => {
                    return dbconfig.collection_players.find({platform: {$in: platforms}})
                        .select('_id name providerId playerId platform')
                        .populate({path: 'platform', model: dbconfig.collection_platform})
                        .then(
                            platformPlayers => {
                                // This returns true: That means it's fairly space efficient, mongoose doesn't create a separate platform object for each player object.
                                //console.log("platformPlayers[0].platform === platformPlayers[1].platform:", players[0].platform === players[1].platform);
                                allPlayers = allPlayers.concat(platformPlayers);
                            }
                        );
                }).then(
                    () => console.log("Collected %s players over %s platforms.", allPlayers.length, platforms.length)
                ).then(
                    () => {return { allPlayers: allPlayers, platforms: platforms }; }
                );
            }
        );
    }

    function simulatePlayers (config) {
        let playersInAction = 0;

        return collectAllPlayers(config).then(
            (data) => {
                var allPlayers = data.allPlayers;
                var platforms = data.platforms;
                const timer = setInterval(considerPlatformAction, config.timeBetweenSpawns);

                function considerPlatformAction () {
                    if (Math.random() < config.newPlayerProbability && platforms.length > 0) {
                        // Yes it's a bit of a silly way to select a platform, unless you assume most new signups are invited via friends.
                        const platform = randomItemFromList(platforms);
                        console.log(new Date(), `Registering a new player on platform ${platform.platformId}`);
                        createNewPlayer(platform).catch(reportError);
                    }

                    if (Math.random() < config.registrationIntentionProbability && allPlayers.length > 0) {
                        // Yes it's a bit of a silly way to select a platform, unless you assume most new signups are invited via friends.
                        const platform = randomItemFromList(allPlayers).platform;
                        console.log(new Date(), `Registering a new player via registrationIntention on platform ${platform.platformId}`);
                        doRegistrationIntention(platform).catch(reportError);
                    }

                    if (Math.random() < config.spawnProbability && playersInAction < config.maxActivePlayers && allPlayers.length > 0) {
                        const i = Math.floor(Math.random() * allPlayers.length);
                        const player = allPlayers.splice(i, 1)[0];
                        playersInAction++;
                        console.log(new Date(), `[${player.playerId}] + Active simulated players: ${playersInAction}`);
                        simulatePlayer(player.platform, player)
                            .then(() => {
                                playersInAction--;
                                allPlayers.push(player);
                                console.log(new Date(), `[${player.playerId}] - Active simulated players: ${playersInAction}`);
                            })
                            .catch(reportError);
                    }
                }

                return promiseUtils.delay(1000 * 60 * config.minutes).then(
                    () => clearInterval(timer)
                );

            }
        );
    }

    function simulatePlayer (platform, player) {
        console.log(new Date(), `[${player.playerId}] Starting simulation of player '${player.name}'`);

        const playerLoginData = {
            platformId: platform.platformId,
            name: player.name,
            password: config.botPassword
        };
        return services.getClientClient(playerLoginData, noAutoReconnect).then(
            (clientClient) => {
                function doNextAction () {
                    const chosenAction = possiblePlayerActions[Math.floor(possiblePlayerActions.length * Math.random())];
                    const doAction = Math.random() < chosenAction.probability;
                    if (doAction) {
                        console.log(new Date(), `[${player.playerId}] Performing action: ${chosenAction.fn.name}`);
                        return chosenAction.fn(clientClient, player).then(
                            () => chosenAction.lastAction ? null : promiseUtils.delay(config.timeBetweenActions).then(doNextAction)
                        );
                    } else {
                        return promiseUtils.delay(config.timeBetweenActions).then(doNextAction);
                    }
                }

                return Q(doNextAction()).then(
                    () => {
                    }
                ).finally(
                    () => disconnectAndWait(clientClient)
                );
            }
        );
    }

    return {
        simulatePlayers: simulatePlayers,
        simulatePlayer: simulatePlayer
    }
};