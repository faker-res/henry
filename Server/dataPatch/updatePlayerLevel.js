/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

const Q = require("q");
const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");
const constProposalType = require("../const/constProposalType");
const constProposalStatus = require("../const/constProposalStatus");
const dbPlayerTopUpRecord = require("../db_modules/dbPlayerTopUpRecord");

const levelName = "特邀贵宾";
const originalLevelName = "普通会员";
const rewardAmount = 3888;

dbconfig.collection_playerLevel.find({name: levelName}).lean().then(
    levels => {
        var levelNames = {};
        var levelIds = levels.map(level => {
            levelNames[level._id] = level.name;
            return level._id;
        });
        const cursor = dbconfig.collection_players.find({
            playerLevel: {$in: levelIds}
        }).cursor();
        var i = 0;
        cursor.eachAsync(
            playerData => {
                //revert player credit and level
                dbconfig.collection_players.findOne({_id: playerData._id}).then(
                    playerObj => {
                        if( playerObj ){
                            return dbconfig.collection_playerLevel.findOne({platform: playerObj.platform, name: originalLevelName}).then(
                                levelData => {
                                    if(levelData){
                                        playerObj.playerLevel = levelData._id;
                                        playerObj.validCredit = playerObj.validCredit - rewardAmount;
                                        if( playerObj.validCredit < 0 ){
                                            playerObj.validCredit = 0;
                                        }
                                        return playerObj.save();
                                    }
                                }
                            );
                        }
                    }
                ).then();
                console.log("index", i, playerData.playerId);
                i++;
            }
        );
    }
);