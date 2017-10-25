"use strict";

require('../test_modules/improveMochaReporting')();
let should = require('should');
let commonTestFun = require('../test_modules/commonTestFunc');
let dataGenerator = require("./../test_modules/dataGenerator.js");
let dbConfig = require('../modules/dbproperties');

let dbPlayerReward = require('./../db_modules/dbPlayerReward');
let dbRewardEvent = require('./../db_modules/dbRewardEvent');
let dbRewardType = require('./../db_modules/dbRewardType');
let dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
let dbconfig = require('./../modules/dbproperties');



describe("test DBPlayerReward Apply Consecutive Login Reward", function(){

    // Under development
    return true;

    let testPlatformObjId, testPlatformId, rewardTypeObjId, rewardEvent, testPlayerId, playerValidCredit;
    let generatedPlayerId = [];
    let generatedProposals = [];

    it('Should create test API player and platform', function (done) {
        commonTestFun.createTestPlatform({}).then(
            function (data) {
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                return commonTestFun.createTestPlayer(testPlatformObjId);
            },
            function (error) {
                done(error);
            }
        ).then(
            function (data) {
                generatedPlayerId.push(data._id);
                testPlayerId = data.playerId;
                playerValidCredit = data.validCredit;
                done();
            },
            function (error) {
                done(error);
            }
        );
    });

    it('Should create test consecutive login reward event', function (done) {
        dbRewardType.getRewardType({name: "PlayerConsecutiveLoginReward"}).then(
            function (rewardTypeObj) {
                rewardTypeObjId = rewardTypeObj._id;

                let aMonthAgo = new Date();
                let aMonthAfter = new Date();

                aMonthAgo.setDate(aMonthAgo.getDate()-30);
                aMonthAfter.setDate(aMonthAfter.getDate()+30);

                let testRewardEventData = {
                    "name": "日日相息",
                    "code": "RRXX",
                    "needApply": true,
                    "validStartTime": aMonthAgo,
                    "validEndTime": aMonthAfter,
                    "description": "RRXX",
                    "platform": testPlatformObjId,
                    "param": {
                        "reward": [
                            {
                                "dayIndex": 1,
                                "rewardAmount": 8
                            },
                            {
                                "dayIndex": 2,
                                "rewardAmount": 28
                            },
                            {
                                "dayIndex": 3,
                                "rewardAmount": 58
                            },
                            {
                                "dayIndex": 4,
                                "rewardAmount": 98
                            },
                            {
                                "dayIndex": 5,
                                "rewardAmount": 138
                            },
                            {
                                "dayIndex": 6,
                                "rewardAmount": 188
                            },
                            {
                                "dayIndex": 7,
                                "rewardAmount": 258
                            }
                        ],
                        "bonusAmount": 200,
                        "bonusRequiredTimes": 3,
                        "dailyTopUpAmount": 0,
                        "dailyConsumptionAmount": 0
                    },
                    "condition": {},
                    "type": rewardTypeObjId
                };

                return dbRewardEvent.createRewardEvent(testRewardEventData);
            },
            function (err) {
                done(error);
            }
        ).then(
            function (rewardEventObj) {
                rewardEvent = rewardEventObj;
                done();
            },
            function (error) {
                done(error);
            }
        );
    });

    it('should reward player correctly at day 1 when applied', function(done){
        dbPlayerReward.applyConsecutiveLoginReward("",testPlayerId, "RRXX").then(
            function(data) {
                generatedProposals.push({
                    _id: data._id,
                    createTime: data.createTime,
                    "data.applyForDate": data.data.applyForDate
                });
                
                return dbPlayerInfo.getPlayerInfo({_id: generatedPlayerId[0]});
            },
            function(error){
                throw(new Error(JSON.stringify(error, null, 2)));
            }
        ).then(
            function (playerData) {
                let creditIncreased = playerData.validCredit - playerValidCredit;
                creditIncreased.should.be.equal(8);
                playerValidCredit = playerData.validCredit;
                done();
            },
            function(error){
                throw(new Error(JSON.stringify(error, null, 2)));
            }
        ).catch(
            function(error) {
                done(error);
            }
        );
    });

    it('should not be able to reward player again in day 1', function(done){
        dbPlayerReward.applyConsecutiveLoginReward("",testPlayerId, "RRXX").then(
            function(data) {
                let errorMessage = {
                    message: "The player should not be able to get reward twice in a day.",
                    data: data
                }
                done(new Error(JSON.stringify(errorMessage, null, 2)));
            },
            function(error) {
                done();
            }
        );
    });

    it('shift the reward date of proposal to previous day to prepare for next test', function(done){
        let proms = [];
        generatedProposals.forEach(function(proposal) {
            let oneDayEarlierCreatedTime = new Date(proposal.createTime);
            oneDayEarlierCreatedTime.setDate(oneDayEarlierCreatedTime.getDate() - 1);
            
            let oneDayEarlierDateApplyFor = new Date(proposal["data.applyForDate"]);
            oneDayEarlierDateApplyFor.setDate(oneDayEarlierDateApplyFor.getDate() - 1);

            proms.push(
                dbconfig.collection_proposal.findOneAndUpdate({
                    _id: proposal._id
                }, {
                    $set:{
                        createTime: oneDayEarlierCreatedTime,
                        "data.applyForDate": oneDayEarlierDateApplyFor
                    }
                }).exec()
            );
        });

        Promise.all(proms).then(
            function(data) {
                done();
            },
            function (error) {
                done(JSON.stringify(error, null, 2));
            }
        );
    });

    it('should reward player correctly at day 2 when applied', function(done){
        dbPlayerReward.applyConsecutiveLoginReward("",testPlayerId, "RRXX").then(
            function(data) {
                generatedProposals.push({
                    _id: data._id,
                    createTime: data.createTime,
                    "data.applyForDate": data.data.applyForDate
                });
                
                return dbPlayerInfo.getPlayerInfo({_id: generatedPlayerId[0]});
            },
            function(error){
                throw(new Error(JSON.stringify(error, null, 2)));
            }
        ).then(
            function (playerData) {
                let creditIncreased = playerData.validCredit - playerValidCredit;
                creditIncreased.should.be.equal(28);
                playerValidCredit = playerData.validCredit;
                done();
            },
            function(error){
                done(error)
            }
        ).catch(
            function(error) {
                done(error);
            }
        );
    });

    it('shift the reward date of proposal to previous day to prepare for next test', function(done){
        let proms = [];
        generatedProposals.forEach(function(proposal) {
            let oneDayEarlierCreatedTime = new Date(proposal.createTime);
            oneDayEarlierCreatedTime.setDate(oneDayEarlierCreatedTime.getDate() - 1);
            
            let oneDayEarlierDateApplyFor = new Date(proposal["data.applyForDate"]);
            oneDayEarlierDateApplyFor.setDate(oneDayEarlierDateApplyFor.getDate() - 1);

            proms.push(
                dbconfig.collection_proposal.findOneAndUpdate({
                    _id: proposal._id
                }, {
                    $set:{
                        createTime: oneDayEarlierCreatedTime,
                        "data.applyForDate": oneDayEarlierDateApplyFor
                    }
                }).exec()
            );
        });

        Promise.all(proms).then(
            function(data) {
                done();
            },
            function (error) {
                done(JSON.stringify(error, null, 2));
            }
        );
    });

    it('should reward player correctly at day 3 when applied', function(done){
        dbPlayerReward.applyConsecutiveLoginReward("", testPlayerId, "RRXX").then(
            function(data) {
                generatedProposals.push({
                    _id: data._id,
                    createTime: data.createTime,
                    "data.applyForDate": data.data.applyForDate
                });
                
                return dbPlayerInfo.getPlayerInfo({_id: generatedPlayerId[0]});
            },
            function(error){
                throw(new Error(JSON.stringify(error, null, 2)));
            }
        ).then(
            function (playerData) {
                let creditIncreased = playerData.validCredit - playerValidCredit;
                creditIncreased.should.be.equal(58);
                playerValidCredit = playerData.validCredit;
                done();
            },
            function(error){
                done(error)
            }
        ).catch(
            function(error) {
                done(error);
            }
        );
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(testPlatformObjId, generatedPlayerId).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([],testPlatformObjId, [], generatedPlayerId).then(function(data){
            done();
        })
    });
});