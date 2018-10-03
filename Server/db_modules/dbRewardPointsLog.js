var Q = require('q');
var errorUtils = require('../modules/errorUtils');

const constRewardPointsLogCategory = require('../const/constRewardPointsLogCategory');
const constRewardPointsLogStatus = require('../const/constRewardPointsLogStatus');

var dbConfig = require('../modules/dbproperties');
var dbLogger = require('../modules/dbLogger');

var dbRewardPointsLog = {

    getRewardPointsLogsQuery: (data) => {
        let rewardPointsLog = dbConfig.collection_rewardPointsLog.find(data.query)
            .populate({path: "rewardPointsTaskObjId", model: dbConfig.collection_rewardTask})
            .sort(data.sort).skip(data.index).limit(data.limit).lean().exec();

        let rewardPointsLogCount = dbConfig.collection_rewardPointsLog.find(data.query).count();

        let rewardPointsPlayerCount = dbConfig.collection_rewardPointsLog.distinct("playerName", data.query);

        return Q.all([rewardPointsLog, rewardPointsLogCount, rewardPointsPlayerCount]).then(result => {
            return {data: result[0], size: result[1], playerCount: result[2].length || 0};
        })
    },

    updateConvertRewardPointsLog: (proposalId, status, rewardPointsTaskObjId) => {
        return dbConfig.collection_rewardPointsLog.update({proposalId: proposalId}, {
            status: status,
            rewardPointsTaskObjId: rewardPointsTaskObjId
        }).exec();
    },

    createRewardPointsLogByProposalData: (proposalData) => {
        let isPeriodPointConversion = proposalData.creator.type == 'system';
        proposalData.data.category = proposalData.data.hasOwnProperty('category')
            ? proposalData.data.category : isPeriodPointConversion
                ? constRewardPointsLogCategory.PERIOD_POINT_CONVERSION : constRewardPointsLogCategory.EARLY_POINT_CONVERSION;
        proposalData.data.remark = proposalData.data.remark
            ? proposalData.data.remark + " Proposal No: " + proposalData.proposalId : "Proposal No: " + proposalData.proposalId;
        let amount = proposalData.data.hasOwnProperty("convertedRewardPoints")
            ? isNaN(proposalData.data.convertedRewardPoints) ? 0 : -parseInt(proposalData.data.convertedRewardPoints)
            : isNaN(proposalData.data.updateAmount) ? 0 : parseInt(proposalData.data.updateAmount);

        let logData = {
            rewardPointsObjId: proposalData.data.playerRewardPointsObjId,
            category: proposalData.data.category,
            oldPoints: proposalData.data.beforeRewardPoints,
            newPoints: proposalData.data.afterRewardPoints,
            playerName: proposalData.data.playerName,
            playerLevelName: proposalData.data.playerLevelName,
            amount: amount,
            remark: proposalData.data.remark,
            status: constRewardPointsLogStatus.PENDING,
            userAgent: proposalData.inputDevice,
            currentDayAppliedAmount: proposalData.data.currentDayAppliedAmount,
            maxDayApplyAmount: proposalData.data.maxDayApplyAmount,
            proposalId: proposalData.proposalId,
            creator: proposalData.creator.name,
            platformId: proposalData.data.platformObjId
        };
        dbLogger.createRewardPointsLog(logData);
    },

    getPlayerRewardPointsLog: (playerName, index, limit, sortCol) => {
        index = index || 0;
        sortCol = sortCol || {createTime: -1};

        let query = {
            playerName: playerName,
        };

        let a = dbConfig.collection_rewardPointsLog.find(query).count();
        let b = dbConfig.collection_rewardPointsLog.find(query).sort(sortCol).skip(index).limit(limit).lean();
        return Promise.all([a, b]).then(data => {
            return({total: data[0], data: data[1]});
        });
    },
    getSpendRewardRank:  (platformId, startDate, endDate, currentPage=0, limit=10, sortCol) => {
        limit = parseInt(limit)
        index = currentPage * limit;

        let platform;
        return dbConfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (!platformData || !platformData._id) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
                platform = platformData;
                return
            }
        ).then(() => {
            let query = {
                platformId:platform._id,
                createTime: {$gte: new Date(startDate), $lt: new Date(endDate)},
                category: constRewardPointsLogCategory.GAME_REWARD_POINTS,
                status: constRewardPointsLogStatus.PROCESSED
            }
            let a = dbConfig.collection_rewardPointsLog.aggregate(
                {
                    $match: query
                },
                {
                    $group: {
                        _id: '$playerName',
                        points: {$sum: "$amount"}
                    }
                }
            );
            let b = dbConfig.collection_rewardPointsLog.aggregate(
                {
                    $match: query
                },
                {
                    $group: {
                        _id: '$playerName',
                        points: {$sum: "$amount"},
                        playerLevelName:{ $last: "$playerLevelName" },
                        lastUpdate:{ $last: "$createTime"},
                    },
                },
                { $skip: index },
                { $limit : limit }
            );
            return Promise.all([a, b])
       }).then(data => {
                let rewardPointLogs;
                let spending = data[0];
                let totalPoints = 0
                let resultData = data[1];
                let totalPage = spending.length / limit;

                if(totalPage <1){
                    totalPage = 1;
                }else{
                    totalPage = parseInt(totalPage);
                }

                // calculate all points in statsData
                if(spending && spending.length > 0){
                    spending.map(spendData=>{
                        totalPoints += spendData.points;
                    })
                }

                let statsData = {
                   "totalCount": spending.length,
                   "totalPage": totalPage,
                   "currentPage": currentPage,
                   "totalPoints": totalPoints
                }
                if(data[1] && data[1].length > 0){
                    rewardPointLogs = data[1].map(rewardPointLog=>{

                        let playerIndex = Math.max(Math.floor((rewardPointLog._id.length - 3) / 2), 0);
                        let playerEncoded = rewardPointLog._id.substr(0, playerIndex) + "***" + rewardPointLog._id.substr(playerIndex + 3);
                        let playerSpend = {
                            points: rewardPointLog.points,
                            playerLevelName: rewardPointLog.playerLevelName,
                            lastUpdate: rewardPointLog.lastUpdate,
                            playerAccount: playerEncoded
                        }
                        return playerSpend;
                    })
                }
                return({
                    "stats":statsData,
                    "list":rewardPointLogs
                })
       })
    }
};
module.exports = dbRewardPointsLog;
