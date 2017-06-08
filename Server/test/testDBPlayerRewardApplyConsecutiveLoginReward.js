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



describe("test DBPlayerReward Apply Consecutive Login Reward", function(){

    // Under development
    return true;

    let testPlatformObjId, testPlatformId, rewardTypeObjId, rewardEvent, testPlayerId;
    let generatedPlayerId = [];

    it('Should create test API player and platform', function (done) {
        commonTestFun.createTestPlatform().then(
            function (data) {
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                return commonTestFun.createTestPlayer(testPlatformObjId);
            },
            function (error) {
                console.error(error);
                done(error);
            }
        ).then(
            function (data) {
                generatedPlayerId.push(data._id);
                testPlayerId = data.playerId;
                done();
            },
            function (error) {
                console.error(error);
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
                    "validStartTime": aMonthAgo,
                    "validEndTime": aMonthAfter,
                    "description": "RRXX",
                    "platform": testPlatformObjId,
                    "param": {
                        "reward": [
                            {
                                "dayIndex": 0,
                                "rewardAmount": 8
                            },
                            {
                                "dayIndex": 1,
                                "rewardAmount": 28
                            },
                            {
                                "dayIndex": 2,
                                "rewardAmount": 58
                            },
                            {
                                "dayIndex": 3,
                                "rewardAmount": 98
                            },
                            {
                                "dayIndex": 4,
                                "rewardAmount": 138
                            },
                            {
                                "dayIndex": 5,
                                "rewardAmount": 188
                            },
                            {
                                "dayIndex": 6,
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

    it('apply the correct reward day 1', function(done){
        dbPlayerReward.applyConsecutiveLoginReward(testPlayerId, "RRXX").then(
            function(data) {
                // TODO :: check if the reward add correctly
                console.log(data);
                // dbPlayerInfo.getPlayerInfo()
                done();
            },
            function(err){
                done(err);
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

// applyConsecutiveLoginReward
/*
*  1) get playerinfo and player level of player id
*  2) look for particular event
*  3) check if it is a valid reward event
*  goto:: processConsecutiveLoginRewardRequest
*  1) Check player top up amount and consumption amount has hitted requirement
*  2) Check proposals for this week's reward apply
*  3) Check if player has applied on this date
*
**/