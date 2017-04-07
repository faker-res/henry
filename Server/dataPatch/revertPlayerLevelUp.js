const Q = require("q");
const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");
const constProposalType = require("../const/constProposalType");
const constProposalStatus = require("../const/constProposalStatus");
const dbPlayerTopUpRecord = require("../db_modules/dbPlayerTopUpRecord");

const levelName = "特邀贵宾";
const originalLevelName = "普通会员";

dbconfig.collection_proposalType.find({name: constProposalType.PLAYER_LEVEL_UP}).lean().then(
    types => {
        var typeNames = {};
        var typeIds = types.map(type => {
            typeNames[type._id] = type.name;
            return type._id;
        });
        const cursor = dbconfig.collection_proposal.find({
            type: {$in: typeIds},
            status: constProposalStatus.APPROVED,
            "data.levelName": levelName
        }).cursor();
        var i = 0;
        cursor.eachAsync(
            proposalData => {
                if( proposalData && proposalData.data ){
                    //revert player credit and level
                    var playerProm = dbconfig.collection_players.findOne({_id: proposalData.data.playerObjId}).then(
                        playerObj => {
                            if( playerObj ){
                                return dbconfig.collection_playerLevel.findOne({platform: playerObj.platform, name: originalLevelName}).then(
                                    levelData => {
                                        if(levelData){
                                            playerObj.playerLevel = levelData._id;
                                            playerObj.validCredit = playerObj.validCredit - proposalData.data.rewardAmount;
                                            if( playerObj.validCredit < 0 ){
                                                playerObj.validCredit = 0;
                                            }
                                            return playerObj.save();
                                        }
                                    }
                                );
                            }
                        }
                    );
                    //remove credit change log
                    var logProm = dbconfig.collection_creditChangeLog.remove({playerId: proposalData.data.playerObjId, operationType: constProposalType.PLAYER_LEVEL_UP});
                    // remove reward log
                    var rewardProm = dbconfig.collection_rewardLog.remove({player: proposalData.data.playerObjId, rewardTypeName: constProposalType.PLAYER_LEVEL_UP});
                    //remove proposal
                    var proposalProm = dbconfig.collection_proposal.remove({_id: proposalData._id});

                    Q.all([playerProm, logProm, rewardProm, proposalProm]).then();
                    console.log("Processing: ", proposalData.proposalId);
                    console.log("index", i);
                    i++;
                }
            }
        );
    }
);