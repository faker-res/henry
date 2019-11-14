
var Q = require("q");
var dbconfig = require('./../modules/dbproperties');
var playerBillBoardranking ={

    calculateWinAllRanking: function() {

        var deferred = Q.defer();
        function censoredPlayerName(name) {
            let censoredName, front, censor = "***", rear;
            front = name.substr(0, 2);
            rear = name.substr(5);
            censoredName = front + censor + rear;
            censoredName = censoredName.substr(0, name.length);
            return censoredName;
        }

        let totalRecord = 10;
        let recordDate = new Date();
        recordDate.setHours(recordDate.getHours() - 1);
        let matchQuery = {
            $match: {
                createTime: {$gte: recordDate},
                $and: [{"winRatio": {$ne: null}}, {"winRatio": {$ne: Infinity}}]
            },
        };
        return dbconfig.collection_playerConsumptionRecord.aggregate([
            matchQuery,
            {
                $group: {
                    _id: "$playerId",
                    platformId: {$first: "$platformId"},
                    providerId: {$addToSet: "$providerId"},
                    gameId: {$addToSet: {$cond: [{$not: ["$cpGameType"]}, "$gameId", "$null"]}},
                    cpGameType: {$addToSet: {$ifNull: ['$cpGameType', '$null']}},
                    amount: {$sum: "$bonusAmount"},
                    createTime: {$addToSet: "$createTime"}
                }
            }
        ]).then(
                consumptionRecord => {
                console.log('consumption sort..', consumptionRecord);
                function sortRankingRecord(a,b) {
                    if (a.amount < b.amount)
                        return 1;
                    if (a.amount > b.amount)
                        return -1;
                    if (a.amount == b.amount) {
                        a.createTime = a.createTime.sort(function (a, b) {
                            return b - a
                        });
                        b.createTime = b.createTime.sort(function (a, b) {
                            return b - a
                        });
                        if (a.createTime[0] < b.createTime[0]) {
                            return -1;
                        }
                        if (a.createTime[0] > b.createTime[0]) {
                            return 1;
                        }
                    }
                    return 0;
                }

                let playerRanking;
                let sortedData = consumptionRecord.sort(sortRankingRecord);
                console.log('sortedData..', sortedData);
                for (let i = 0; i < sortedData.length; i++) {
                    if (sortedData[i].amount) {
                        // round to 2 decimal places
                        sortedData[i].amount = Number(sortedData[i].amount.toFixed(2));
                    }
                    sortedData[i].rank = i + 1;
                    if (sortedData[i].createTime) {
                        delete sortedData[i].createTime;
                    }
                }
                if (sortedData.length > totalRecord) {
                    sortedData.length = totalRecord;
                }
                if (playerRanking) {
                    sortedData.push(playerRanking);
                }
                let returnData = {};
                returnData.allWin = {};

                    if (sortedData && sortedData.length) {
                        return dbconfig.collection_players.populate(sortedData, [{
                            path: '_id',
                            model: dbconfig.collection_players,
                            select: "name"
                        }, {
                            path: 'providerId',
                            model: dbconfig.collection_gameProvider,
                            select: "name"
                        }, {
                            path: "gameId",
                            model: dbconfig.collection_game,
                            select: "name"
                        }
                        ]).then(
                            populatedProvider => {
                                for (let i = 0; i < populatedProvider.length; i++) {
                                    // populatedProvider[i].rank = i + 1;
                                    if (populatedProvider[i]._id && populatedProvider[i]._id.name) {
                                        // populatedProvider[i].name = censoredPlayerName(populatedProvider[i]._id.name);
                                        populatedProvider[i].name = populatedProvider[i]._id.name;
                                        populatedProvider[i].playerId = populatedProvider[i]._id;
                                        delete populatedProvider[i]._id;
                                    }

                                    if (!populatedProvider[i].providerName) {
                                        populatedProvider[i].providerName = "";
                                    }
                                    if (!populatedProvider[i].gameName) {
                                        populatedProvider[i].gameName = "";
                                    }
                                    if (populatedProvider[i].cpGameType) {
                                        for (let z = 0; z < populatedProvider[i].cpGameType.length; z++) {
                                            if (populatedProvider[i].gameName) {
                                                populatedProvider[i].gameName += ", ";
                                            }
                                            populatedProvider[i].gameName += populatedProvider[i].cpGameType[z];
                                        }
                                        delete populatedProvider[i].cpGameType;
                                    }

                                    if (populatedProvider[i].gameId) {
                                        for (let k = 0; k < populatedProvider[i].gameId.length; k++) {
                                            if (populatedProvider[i].gameName) {
                                                populatedProvider[i].gameName += ", ";
                                            }
                                            if (populatedProvider[i].gameId[k].name) {
                                                populatedProvider[i].gameName += populatedProvider[i].gameId[k].name;
                                            }
                                        }
                                        delete populatedProvider[i].gameId;
                                    }
                                    if (populatedProvider[i].providerId && populatedProvider[i].providerId.length) {
                                        for (let j = 0; j < populatedProvider[i].providerId.length; j++) {

                                            if (populatedProvider[i].providerName) {
                                                populatedProvider[i].providerName += ", ";
                                            }
                                            if (populatedProvider[i].providerId[j].name) {
                                                populatedProvider[i].providerName += populatedProvider[i].providerId[j].name;
                                            }
                                        }
                                        delete populatedProvider[i].providerId;
                                    }
                                }

                                returnData.allWin.boardRanking = populatedProvider;
                                var proms = [];
                                for (var key in returnData.allWin.boardRanking) {
                                    var obj = returnData.allWin.boardRanking[key];
                                    // save to topuphoursummary
                                    let updateTime = new Date();
                                    updateTime.setHours(recordDate.getHours());
                                    console.log('LK checking cal rank updateTime', updateTime);
                                    // type = ranking mode
                                    obj.type = "5";
                                    obj.updateTime = updateTime;
                                    proms.push(playerBillBoardranking.saveToTopUpHourSummary(obj));
                                }
                                Q.all(proms).then(
                                    function(data) {
                                        deferred.resolve(data);
                                    },
                                    function(error) {
                                        deferred.reject(error);
                                    }
                                ).catch(
                                    function(error) {
                                        deferred.reject(error);
                                    }
                                );
                                return deferred.promise;
                            }
                        );
                    } else {
                    returnData.allWin.boardRanking = [];
                    return returnData;
                }
            }
        );
    },

    saveToTopUpHourSummary: function(saveObj) {
        var deferred = Q.defer();
        let query = {
            playerId: saveObj.playerId
        }
        dbconfig.collection_playerTopUpHourSummary.findOneAndUpdate(query, saveObj, {upsert: true}).then(
            saveRecord => {
                console.log('save rc..', saveRecord);
            }, error => {
                deferred.reject({name: "DBError", message: "Error save top up summary", error: error});
            }
        );
    },
};


module.exports = playerBillBoardranking;