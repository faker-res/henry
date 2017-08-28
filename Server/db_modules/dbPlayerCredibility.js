let dbconfig = require('./../modules/dbproperties');

let dbPlayerCredibility = {
    updateScoreConfig: (platformObjId, data) => {
        let updateData = {};

        if (data.topUpTimes) {
            updateData["playerValueConfig.criteriaScoreRatio.topUpTimes"] = data.topUpTimes;
        }

        if (data.gameTypeCount) {
            updateData["playerValueConfig.criteriaScoreRatio.gameTypeCount"] = data.gameTypeCount;
        }

        if (data.credibilityRemark) {
            updateData["playerValueConfig.criteriaScoreRatio.credibilityRemark"] = data.credibilityRemark;
        }

        if (data.playerLevel) {
            updateData["playerValueConfig.criteriaScoreRatio.playerLevel"] = data.playerLevel;
        }

        if (data.winRatio) {
            updateData["playerValueConfig.criteriaScoreRatio.winRatio"] = data.winRatio;
        }

        if (data.credibilityScoreDefault) {
            updateData["playerValueConfig.credibilityScoreDefault"] = data.credibilityScoreDefault;
        }

        return dbconfig.collection_platform.findOneAndUpdate({_id: platformObjId}, updateData).lean();
    },

    /**
     *
     * @param platformObjId
     * @param {JSON} scores : Combination of key and value
     * @returns {Promise}
     */
    updateTopUpTimesScores: (platformObjId, scores) => {
        return new Promise( (resolve, reject) => {
            let existingName = [];
            for (let i = 0; i < scores.length; i++) {
                if (!isNumber(scores[i].name) && scores[i].name < 0) {
                    reject({
                        name: "DataError",
                        message: "Top up times have to be a positive number."
                    });
                    return;
                }

                if (!isNumber(scores[i].score)) {
                    reject({
                        name: "DataError",
                        message: "Score have to be a number."
                    });
                    return;
                }

                if (existingName.indexOf(scores[i].name) !== -1) {
                    reject({
                        name: "DataError",
                        message: "There are duplicated value of top up times in the setting."
                    });
                    return;
                }

                existingName.push(scores[i].name);
            }

            let updateData = {
                "playerValueConfig.topUpTimesScores": scores
            };

            resolve(dbconfig.collection_platform.findOneAndUpdate({_id: platformObjId}, updateData).lean());
        });
    },

    updateGameTypeCountScores: (platformObjId, scores) => {
        return new Promise( (resolve, reject) => {
            let existingName = [];
            for (let i = 0; i < scores.length; i++) {
                if (!isNumber(scores[i].name) && scores[i].name < 0) {
                    reject({
                        name: "DataError",
                        message: "Game type count have to be a positive number."
                    });
                    return;
                }

                if (!isNumber(scores[i].score)) {
                    reject({
                        name: "DataError",
                        message: "Score have to be a number."
                    });
                    return;
                }

                if (existingName.indexOf(scores[i].name) !== -1) {
                    reject({
                        name: "DataError",
                        message: "There are duplicated value of game type count in the setting."
                    });
                    return;
                }

                existingName.push(scores[i].name);
            }

            let updateData = {
                "playerValueConfig.gameTypeCountScores": scores
            };

            resolve(dbconfig.collection_platform.findOneAndUpdate({_id: platformObjId}, updateData).lean());
        });
    },

    updateWinRatioScores: (platformObjId, scores) => {
        return new Promise( (resolve, reject) => {
            let existingName = [];
            for (let i = 0; i < scores.length; i++) {
                if (!isNumber(scores[i].name && scores[i].name !== "default")) {
                    reject({
                        name: "DataError",
                        message: "Win ratio have to be a number."
                    });
                    return;
                }

                if (!isNumber(scores[i].score)) {
                    reject({
                        name: "DataError",
                        message: "Score have to be a number."
                    });
                    return;
                }

                if (existingName.indexOf(scores[i].name) !== -1) {
                    reject({
                        name: "DataError",
                        message: "There are duplicated value of win ratio in the setting."
                    });
                    return;
                }

                existingName.push(scores[i].name);
            }

            let updateData = {
                "playerValueConfig.winRatioScores": scores
            };

            resolve(dbconfig.collection_platform.findOneAndUpdate({_id: platformObjId}, updateData).lean());
        });
    },

    updatePlayerLevelScores: (platformObjId, scores) => {
        return new Promise( (resolve, reject) => {
            dbconfig.collection_playerLevel.find({platform: platformObjId}).lean().then(
                playerLevels => {
                    let proms = [];
                    for (let i = 0; i < scores.length; i++) {
                        for (let j = 0; j < playerLevels.length; j++) {
                            if (scores[i].name === playerLevels[j].name) {
                                let updateProm = dbconfig.collection_playerLevel.findOneAndUpdate(
                                    {platform: platformObjId, _id: playerLevels[j]._id},
                                    {playerValueScore: scores.score[i]}
                                ).lean();
                                proms.push(updateProm);
                                break;
                            }
                        }
                    }

                    resolve(Promise.all(proms));
                },
                error => {
                    reject({
                        name: "DataError",
                        message: "Platform does not exist",
                        error: error
                    });
                }
            );
        });
    },

    getCredibilityRemarks: platformObjId => {
        return dbconfig.collection_playerCredibilityRemark.find({platform: platformObjId}).lean().exec();
    },

    addCredibilityRemark: (platformObjId, name, score) => {
        let remark = dbconfig.collection_playerCredibilityRemark({
            platform: platformObjId,
            name: name,
            score: score
        });
        return remark.save();
    },

    updateCredibilityRemark: (platformObjId, remarkObjId, name, score) => {
        let query = {
            platform: platformObjId,
            _id: remarkObjId
        };

        let updateData = {
            name: name,
            score: score
        };

        return dbconfig.collection_playerCredibilityRemark.findOneAndUpdate(query, updateData).lean();
    },

    deleteCredibilityRemark: (platformObjId, remarkObjId) => {
        let query = {
            platform: platformObjId,
            _id: remarkObjId
        };

        return dbconfig.collection_playerCredibilityRemark.remove(query);
    },

    calculatePlayerValue: playerObjId => {
        return new Promise((resolve, reject) => {
            let player, platform;
            dbconfig.collection_players.findOne({_id: playerObjId}).lean().then(
                playerData => {
                    if (!playerData) {
                        reject({
                            name: "DataError",
                            message: "Invalid player data"
                        })
                    }

                    player = playerData;

                    let platformProm = dbconfig.collection_platform.findOne({_id: player.platform}).lean();
                    let gameTypeProm = dbconfig.collection_playerConsumptionRecord.distinct("gameId", {playerId: player._id});
                    let playerLevelProm = dbconfig.collection_playerLevel.findOne({_id: player.playerLevel}).lean();
                    let playerRemarksProm = dbconfig.collection_playerCredibilityRemark.find({_id:{$in:player.credibilityRemarks}}).lean();
                    let winRatioProm = dbconfig.collection_playerConsumptionRecord.aggregate([
                        {$match: {playerId: player._id}},
                        {
                            $group: {
                                _id: null,
                                totalConsumption: {$sum: "$validAmount"},
                                totalBonus: {$sum: "$bonusAmount"}
                            }
                        }
                    ]);

                    return Promise.all([platformProm, gameTypeProm, playerLevelProm, playerRemarksProm, winRatioProm]);
                }
            ).then(
                data => {
                    platform = data[0];
                    let gameTypeCount = data[1].length;
                    let playerLevel = data[2];
                    let playerRemarks = data[3];
                    let consumptionSummary = data[4][0];

                    if (!platform.playerValueConfig) {
                        return {};
                    }

                    let topUpTimesScore = calculateTopUpTimesScore(platform.playerValueConfig.topUpTimesScores, player.topUpTimes);//) * platform.playerValueConfig.criteriaScoreRatio.topUpTimes;
                    let gameTypeScore = calculateGameTypeCountScore(platform.playerValueConfig.gameTypeCountScores, gameTypeCount);
                    let remarkScore = calculateRemarksScore(platform.playerValueConfig.credibilityScoreDefault, playerRemarks);
                    let playerLevelScore = playerLevel.playerValueScore || 2;
                    let winRatioScore = consumptionSummary
                        ? calculateWinRatioScore(platform.playerValueConfig.winRatioScores, consumptionSummary.totalConsumption, consumptionSummary.totalBonus)
                        : calculateWinRatioScore(platform.playerValueConfig.winRatioScores, 0, 0);

                    let totalScore = calculateTotalScore(platform.playerValueConfig.criteriaScoreRatio, topUpTimesScore, gameTypeScore, remarkScore, playerLevelScore, winRatioScore);

                    return dbconfig.collection_players.findOneAndUpdate(
                        {
                            _id: player._id,
                            platform: player.platform
                        },
                        {
                            valueScore: totalScore
                        }
                    ).lean();
                }
            ).then(
                playerData => {
                    resolve(playerData);
                }
            )
        });

        function calculateTopUpTimesScore (scores, topUpTimes) {
            let validTopUpCount = -1;
            let score = 0;

            for (let i = 0; i < scores.length; i++) {
                if (Number(scores[i].name) > Number(validTopUpCount) && Number(scores[i].name) <= Number(topUpTimes)) {
                    validTopUpCount = scores[i].name;
                    score = scores[i].score;
                }
            }

            return score;
        }

        function calculateGameTypeCountScore (scores, gameTypeCount) {
            let validGameTypes = -1;
            let score = 0;

            for (let i = 0; i < scores.length; i++) {
                if (Number(scores[i].name) > Number(validGameTypes) && Number(scores[i].name) <= Number(gameTypeCount)) {
                    validGameTypes = scores[i].name;
                    score = scores[i].score;
                }
            }

            return score;
        }

        function calculateRemarksScore (defaultScore, remarks) {
            let score = Number(defaultScore) || 0;
            for (let i = 0; i < remarks.length; i++) {
                score += remarks[i].score;
            }
            return score;
        }

        function calculateWinRatioScore (scores, totalConsumption, totalBonus) {
            let ratio;
            delete scores.default;
            if (!Number(totalBonus) || !Number(totalConsumption) || Number(totalConsumption) === 0) {
                ratio = 0;
            } else {
                ratio = Number(totalBonus) / Number(totalConsumption) * 100;
            }

            let defaultScore = 0;
            let score = null;
            let validMinRatio = -Infinity;

            for (let i = 0; i < scores.length; i++) {
                if (Number(scores[i].name) > Number(validMinRatio) && Number(scores[i].name) <= Number(ratio)) {
                    validMinRatio = scores[i].name;
                    score = scores[i].score;
                }
            }

            return score || defaultScore;
        }

        function calculateTotalScore(ratios, topUpTimesScore, gameTypeScore, remarkScore, playerLevelScore, winRatioScore) {
            return ((topUpTimesScore * ratios.topUpTimes)
                + (gameTypeScore * ratios.gameTypeCount)
                + (remarkScore * ratios.credibilityRemark)
                + (playerLevelScore * ratios.playerLevel)
                + (winRatioScore * ratios.winRatio)) / 100;
        }
    }
};

function isNumber(n) {
    return !isNaN(parseFloat(n))
}

module.exports = dbPlayerCredibility;