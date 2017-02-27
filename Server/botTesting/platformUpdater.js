module.exports = function (config) {
    "use strict";

    var dbconfig = require("../modules/dbproperties.js");
    var services = require('../modules/services');
    var botHelper = require('./botHelper.js');
    var streamUtils = require("../modules/streamUtils.js");
    var dbPlayerTopUpIntentRecord = require("../db_modules/dbPlayerTopUpIntentRecord.js");
    var dbPaymentChannel = require("../db_modules/dbPaymentChannel.js");
    var dbAdmin = require("../db_modules/dbAdminInfo.js");
    var dbPlayerInfo = require("../db_modules/dbPlayerInfo.js");
    var dbPlatform = require("../db_modules/dbPlatform.js");
    var promiseUtils = require("../modules/promiseUtils.js");
    var Q = require("q");
    var errorUtils = require("../modules/errorUtils.js");

    var callAPI = services.callAPI;
    var reportError = botHelper.reportError;
    var randomNumberInRange = botHelper.randomNumberInRange;
    var randomItemFromList = botHelper.randomItemFromList;
    var getAllRelevantPlatforms = botHelper.getAllRelevantPlatforms;
    var disconnectAndWait = botHelper.disconnectAndWait;

    var noAutoReconnect = {autoReconnect: false};

    
    function doUpdatesForAllPlatforms () {
        var startTime = Date.now();

        return Q.all(
            [
                services.getProviderClient(config.testApiUserData, noAutoReconnect),
                services.getPaymentClient(config.testApiUserData, noAutoReconnect)
            ]
        ).spread(
            (providerClient, paymentClient) => {
                return Q(
                    updatePlatforms(providerClient, paymentClient)
                ).finally(
                    () => Q.all([disconnectAndWait(providerClient), disconnectAndWait(paymentClient)])
                ).then(
                    () => {
                        var endTime = Date.now();
                        var secondsTaken = (endTime - startTime) / 1000;
                        console.log("Cronjob took %s seconds.", Math.round(secondsTaken));
                    }
                );
            }
        ).catch(reportError);
    }

    function updatePlatforms (providerClient, paymentClient) {
        var totalConsumptionRecordsCreated = 0;

        var platformProms = getAllRelevantPlatforms(config);

        return promiseUtils.each(platformProms,
            (platform) => {
                console.log("platform._id:", platform._id);
                console.log("platform.name:", platform.name);
                return Q.resolve().then(
                    () => addPlayers(providerClient, paymentClient, platform)
                ).then(
                    () => addDataForAllPlayersOnPlatform(providerClient, paymentClient, platform._id)
                ).then(
                    (counts) => {
                        totalConsumptionRecordsCreated += counts[1];
                    }
                );
            }
        ).then(
            () => console.log("Total consumption records created on this run: %s", totalConsumptionRecordsCreated)
        );
    }

    function addPlayers (providerClient, paymentClient, platform) {
        var numPlayers = config.maxPlayersToAdd > 0
            ? randomNumberInRange(1, config.maxPlayersToAdd)
            : 0;

        var singleClientClientProm = !config.separateSocketPerRegistration && services.getClientClient(null, noAutoReconnect);

        var proms = [];
        for (let i = 0; i < numPlayers; i++) {
            let playerName = config.botNamePrefix + Date.now() + ':' + i;
            let playerData = {
                name: playerName,
                platform: platform._id,            // For dbPlayerInfo.createPlayerInfo
                platformId: platform.platformId,   // For API player/create
                password: config.botPassword
            };

            // Create player directly through DB.  Not really testing the API!
            //var prom = dbPlayerInfo.createPlayerInfo(playerData);

            let clientClientProm = config.separateSocketPerRegistration ? services.getClientClient(null, noAutoReconnect) : singleClientClientProm;
            let prom = clientClientProm.then(
                clientClient => Q.resolve().then(
                    () => botHelper.createOnePlayer(clientClient, playerData)
                ).then(
                    () => config.separateSocketPerRegistration && disconnectAndWait(clientClient)
                )
            );

            prom = prom.then(player => console.log("Created new player."));
            proms.push(prom);
        }
        return Q.all(proms).then(
            () => !config.separateSocketPerRegistration && singleClientClientProm.then(clientClient => disconnectAndWait(clientClient))
        );
    }

    function addDataForAllPlayersOnPlatform (providerClient, paymentClient, platformObjId) {
        return dbPlatform.getPlatform({_id: platformObjId}).then(
            (platform) => {
                if (!platform) {
                    throw Error("Platform " + platformObjId + " not found.");
                }
                var platformId = platform.platformId;
                var gameProviderObjIdsForPlatform = platform.gameProviders.map(gp => gp._id);
                return dbconfig.collection_gameProvider.find({_id: {$in: gameProviderObjIdsForPlatform}}).then(
                    (providerList) => {
                        if (providerList.length === 0) {
                            console.log("No providers listed for this platform!");
                        }
                        var provider = randomItemFromList(providerList);

                        var allGamesProm = callAPI(providerClient, 'game', 'getGameList', {providerId: provider.providerId});
                        var allPaymentChannelsProm = dbPaymentChannel.getAllPaymentChannels();
                        var allAdminsProm = dbAdmin.getFullAdminInfo({});

                        return Q.all([allGamesProm, allPaymentChannelsProm, allAdminsProm]).then(
                            (data) => {
                                var gameList = data[0];
                                var paymentChannels = data[1];
                                var allAdmins = data[2];
                                if (paymentChannels.length === 0) {
                                    console.log("No payment channels found.  Please initialise DB, e.g. by running tests.");
                                }
                                if (allAdmins.length === 0) {
                                    throw Error("No admins found.  Please initialise DB, e.g. by running tests.");
                                }
                                if (gameList.length === 0) {
                                    console.log("Selected provider " + provider._id + " has no games!");
                                }

                                return addDataForAllPlayersOnPlatformResolved(platform, providerClient, paymentClient, provider, gameList, paymentChannels, allAdmins);
                            }
                        );
                    }
                );
            }
        );
    }

    function addDataForAllPlayersOnPlatformResolved (platform, providerClient, paymentClient, provider, gameList, paymentChannels, allAdmins) {
        var playersProcessed = 0;
        var countConsumptionRecords = 0;
        var countTopUpRecords = 0;
        var countFailedTopUps = 0;
        var playerIdStream = dbconfig.collection_players.find({platform: platform._id}).select('_id name providerId playerId').cursor();
        return streamUtils.processStreamInConcurrentBatches(playerIdStream, 1, config.PARALLEL_WORKERS,
            (player) => {
                var proms = [];

                if (Math.random() < config.probabilityOfAddingConsumptionRecord && gameList && gameList.length > 0) {
                    var consumptionsProm = Q.resolve();
                    // If only one consumption record is wanted, or if multiple consumption records were configured, queue them up.
                    for (let i = 0; i < config.probabilityOfAddingConsumptionRecord; i++) {
                        // We leave a small delay before adding the consumption, for slightly more realistic data
                        let sendThisConsumption = () => promiseUtils.delay(config.maxDelayBetweenRecords * Math.random()).then(
                            () => {
                                console.log("Adding consumption record for " + player.name);
                                var game = randomItemFromList(gameList);
                                return addConsumptionForPlayer(providerClient, player, platform, provider, game);
                            }
                        ).then(
                            () => countConsumptionRecords++
                        );
                        if (config.sendPlayersConsumptionsInParallel) {
                            proms.push(sendThisConsumption());
                        } else {
                            consumptionsProm = consumptionsProm.then(sendThisConsumption);
                        }
                    }
                    proms.push(consumptionsProm);
                }

                if (Math.random() < config.probabilityOfAddingTopUpRecord && paymentChannels && paymentChannels.length > 0) {
                    // Does not support more than 1 per user.  User top ups are not that common.
                    proms.push(
                        promiseUtils.delay(config.maxDelayBetweenRecords * Math.random()).then(
                            () => {
                                console.log("Adding topup record for " + player.name);
                                var channel = randomItemFromList(paymentChannels);
                                var admin = randomItemFromList(allAdmins);
                                return addTopUpForPlayer(providerClient, paymentClient, player, platform, provider, channel, admin);
                            }
                        ).then(
                            (response) => {
                                countTopUpRecords++;
                            }
                        ).catch(
                            (error) => {
                                if (error === 'Player is not a bot' || error && error.message === 'User not found OR Invalid Password') {
                                    // This is not an error, it's something we expect sometimes
                                    countFailedTopUps++;
                                    return Q.resolve('Could not give topup to player with unknown password');
                                } else {
                                    console.error("error:", error);
                                    countFailedTopUps++;
                                    // An unexpected error, but keep trying with other players
                                    return Q.resolve();
                                }
                            }
                        )
                    );
                }

                return Q.all(proms).then(
                    () => playersProcessed++
                    //() => console.log("Players processed:", playersProcessed++)
                );
            }
        ).then(
            () => console.log("Added %s consumption records and %s top up records for %s players (%s top ups could not complete).", countConsumptionRecords, countTopUpRecords, playersProcessed, countFailedTopUps)
        ).then(
            () => [playersProcessed, countConsumptionRecords, countTopUpRecords, countFailedTopUps]
        );
    }

    function addConsumptionForPlayer (providerClient, player, platform, provider, game) {
        var amount = randomNumberInRange(500, 1500, 1000);
        var validAmount = amount / 2;
        var addConsumptionRequest = {
            userName: player.name,
            platformId: platform.platformId,
            providerId: provider.providerId,
            gameId: game.gameId,
            amount: amount,
            validAmount: validAmount
        };
        return callAPI(providerClient, 'consumption', 'addConsumption', addConsumptionRequest).then(
            (data) => {
                // When performing multiple requests in parallel, responses do not always correspond to their initiating request
                if (String(data.playerId) !== String(player._id)) {
                    console.warn("Responses returned out-of-order: %s != %s", data.playerId, player._id);
                }
            }
        );
    }

    function addTopUpForPlayer (providerClient, paymentClient, player, platform, provider, channel, admin) {
        // If there are any players on this platform who are not bots, then we won't know their passwords, so we will skip them.
        if (player.name.toLowerCase().indexOf(config.botNamePrefix.toLowerCase()) !== 0) {
            return Q.reject("Player is not a bot");
        }

        var topUpAmount = randomNumberInRange(5, 200, 5);

        var addTopUpRequest = {
            //playerId: player.playerId,
            //topupChannel: channel.channelId,
            topUpAmount: topUpAmount,
            topupType: 1,
            amount: 300,
            merchantUseType: 1,
            clientType: 1,
        };

        // Creates a topup proposal how it would be done in reality, through the client API, by logging in as this player.
        // The topup proposal is then approved through the payment API.
        var playerLoginData = {
            platformId: platform.platformId,
            name: player.name,
            password: config.botPassword
        };
        return services.getClientClient(playerLoginData, noAutoReconnect).then(
            (clientClient) => {
                return Q.resolve().then(
                    () => callAPI(clientClient, 'payment', 'createOnlineTopupProposal', addTopUpRequest)
                ).then(
                    (proposal) => callAPI(paymentClient, 'proposal', 'topupSuccess', {
                        proposalId: proposal.data.proposalId || proposal.data.topupDetail.proposalId,
                        playerId: player.playerId,
                        amount: topUpAmount
                    })
                ).then(
                    // Not strictly necessary here, but used to test logout procedure
                    () => callAPI(clientClient, 'player', 'logout', {playerId: player.playerId})
                ).finally(
                    () => disconnectAndWait(clientClient)
                );
            }
        );
    }

    return {
        doUpdatesForAllPlatforms: doUpdatesForAllPlatforms
    };
};