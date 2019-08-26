var should = require('should');
var expect = require('expect');
var sinon = require('sinon');
var dbconfig = require('../modules/dbproperties');

var WebSocketClient = require('../server_common/WebSocketClient');
var PlayerService = require('../services/client/ClientServices').PlayerService;
var RegistrationIntentionService = require('../services/client/ClientServices').RegistrationIntentionService;
var TopUpIntentionService = require('../services/client/ClientServices').TopUpIntentionService;
var ConsumptionService = require('../services/client/ClientServices').ConsumptionService;

var ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');
var ClientRegistrationIntentionAPITest = require('../testAPI/clientAPITest/ClientRegistrationIntentionAPITest');
var ClientTopUpIntentionAPITest = require('../testAPI/clientAPITest/ClientTopUpIntentionAPITest');
var ClientConsumptionAPITest = require('../testAPI/clientAPITest/ClientConsumptionAPITest');

var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbPlatform = require('../db_modules/dbPlatform');

var env = require("../config/env").config();
var commonTestFun = require('../test_modules/commonTestFunc');

var testPlatformName = 'unittestPlayerApi_platformName';
var testQuickPlayerName = 'testquickplayername';
var testPhoneNumber = '95567654';

var testPlayerName = null;
var testNewPlayerName = 'testnewplayer';
var testPlatformObjId = null;
var testPlatformId = null;
var testPlayerObjId = null;
var testPlayerId = null;
var testNewPlayerId = null;
var smsCode = null;
var token = null;
var dat = null;

describe("Test Client API - Player service", function () {

    var client = new WebSocketClient(env.clientAPIServerUrl);

    var playerService = new PlayerService();
    client.addService(playerService);

    var registrationIntentionService = new RegistrationIntentionService();
    client.addService(registrationIntentionService);

    var topUpIntentionService = new TopUpIntentionService();
    client.addService(topUpIntentionService);

    var consumptionService = new ConsumptionService();
    client.addService(consumptionService);

    var clientPlayerAPITest = new ClientPlayerAPITest(playerService);


    //// Init player Data - Start ///////
    // NOTE :: if you return promise (or use async/await), you do not need to call done(). An exception will occur if you do it
    // however, if you use promise(or any sort of async programming) without return promise, done() is necessary to tell mocha that the script is finished

    before(async function (){
        //create test platform
        let testPlatform = await commonTestFun.createTestPlatform();
        testPlatformObjId = testPlatform._id;
        testPlatformId = testPlatform.platformId;

        // create test player
        let testPlayer = await commonTestFun.createTestPlayer(testPlatformObjId);
        console.log('test player', testPlayer)
        testPlayerName = testPlayer.name;
        testPlayerObjId = testPlayer._id;
        testPlayerId = testPlayer.playerId;

        // create a connection
        client.connect();
        let clientOpenProm = () => {
            return new Promise(res => {
                client.addEventListener("open", function () {
                    res();
                });
            });
        }
        await clientOpenProm();
    });

    // it('Should create test API player and platform', function (done) {
    //
    //     commonTestFun.createTestPlatform().then(
    //         function (data) {
    //             testPlatformObjId = data._id;
    //             testPlatformId = data.platformId;
    //             // testPlatformId = "5566";
    //             return commonTestFun.createTestPlayer(testPlatformObjId);
    //         },
    //         function (error) {
    //             console.error(error);
    //         }
    //     ).then(
    //         function (data) {
    //             testPlayerName = data.name;
    //             testPlayerObjId = data._id;
    //             testPlayerId = data.playerId;
    //             done();
    //         },
    //         function (error) {
    //             console.error(error);
    //         }
    //     );
    // });
    // Init player Data - End ///////

    // it('Should create a connection', function (done) {
    //     client.connect();
    //     client.addEventListener("open", function () {
    //         done();
    //     });
    // });



    // it('Should get SMS code', function (done) {
    //     clientPlayerAPITest.getSMSCode(function (data) {
    //         if (data && data.data) {
    //             smsCode = data.data;
    //             done();
    //         }
    //
    //     }, {
    //         phoneNumber: testPhoneNumber
    //     });
    // });

    let apiCreatedPlayer;
    before(function(done) {
        const newPlayerData = {
            name: testNewPlayerName,
            platformId: testPlatformId,
            phoneNumber: testPhoneNumber,
            captcha: 'testCaptcha',
            password: "123456",
            lastLoginIp: "192.168.3.22",
            email: "testPlayer123@gmail.com",
            isTestPlayer: true
        };
        clientPlayerAPITest.create(function(data) {
            apiCreatedPlayer = data;
            testNewPlayerId = data.data.playerId;
            done();
        }, newPlayerData);
    })

    it('Should create a test player', function (done) {
        // const newPlayerData = {
        //     name: testNewPlayerName,
        //     platformId: testPlatformId,
        //     phoneNumber: testPhoneNumber,
        //     captcha: 'testCaptcha',
        //     password: "123456",
        //     lastLoginIp: "192.168.3.22",
        //     email: "testPlayer123@gmail.com",
        //     isTestPlayer: true
        // };
        // clientPlayerAPITest.create(function (data) {
        //     //console.log(data);
        //     data.data.name.should.endWith(testNewPlayerName);
        //     //data.data.email.should.equal("testPlayer123@gmail.com");
        //     testNewPlayerId = data.data.playerId;
        //     // done();
        // }, newPlayerData);

        apiCreatedPlayer.data.name.should.endWith(testNewPlayerName);
        done();
    });

    let apiLoginPlayer;
    before(function (done) {
        const testPlayerLoginData = {
            name: testPlayerName,
            password: "123456",
            lastLoginIp: "192.168.3.22",
            platformId: testPlatformId
        };
        clientPlayerAPITest.login(function (data) {
            token = data.token;
            apiLoginPlayer = data;
            done();
        }, testPlayerLoginData);
    });

    it('Should login apiUser', function (done) {
        // const testPlayerLoginData = {
        //     name: testPlayerName,
        //     password: "123456",
        //     lastLoginIp: "192.168.3.22",
        //     platformId: testPlatformId
        // };
        // clientPlayerAPITest.login(function (data) {
        //     this.timeout(15000);
        //     token = data.token;
        //     data.data.name.should.equal(testPlayerName);
        // }, testPlayerLoginData);

        apiLoginPlayer.data.name.should.equal(testPlayerName);
        done();
    });


    it('Should return true - test player isLogin', function () {
        clientPlayerAPITest.isLogin(function (data) {

            data.data.should.equal(true);
        }, {playerId: testPlayerId});
    });

    //todo::add env config for server url
    it('Should get a test player', function (done) {
        clientPlayerAPITest.get(function (data) {
            // data.data.should.have.property('playerId').which.is.a.Number();
            data.data._id.should.not.null();
            data.data.playerId.should.be.a.String();
            data.data.name.should.be.a.String();
            data.data.password.should.be.a.String();
            data.data.phoneNumber.should.be.a.String();
            data.data.bankName.should.be.a.String();
            data.data.bankAccount.should.be.a.String();
            data.data.bankAccountName.should.be.a.String();
            data.data.bankAccountType.should.be.a.String();
            data.data.bankAddress.should.be.a.String();
            data.data.bankBranch.should.be.a.String();
            data.data.internetBanking.should.be.a.String();
            data.data.merchantGroup.should.be.a.String();
            data.data.bankCardGroup.should.be.a.String();
            data.data.hasPassword.should.be.a.Boolean();
            data.data.qnaWrongCount.should.not.null();
            data.data.relTsPhoneList.should.an.Array();
            data.data.ximaWithdraw.should.a.Number();
            data.data.viewInfo.should.not.null();
            data.data.loginTimes.should.be.an.Number();
            data.data.registrationInterface.should.be.an.Number();
            data.data.valueScore.should.be.an.Number();
            data.data.gameProviderPlayed.should.be.an.Array();
            data.data.credibilityRemarks.should.be.an.Array();
            data.data.applyingEasterEgg.should.be.a.Boolean();
            data.data.isReferralReward.should.be.a.Boolean();
            data.data.similarPlayers.should.be.an.Array();
            data.data.favoriteGames.should.be.an.Array();
            data.data.bFirstTopUpReward.should.be.a.Boolean();
            data.data.forbidLevelMaintainReward.should.be.a.Boolean();
            data.data.forbidLevelUpReward.should.be.a.Boolean();
            data.data.forbidPromoCode.should.be.a.Boolean();
            data.data.forbidRewardEvents.should.be.an.Array();
            data.data.forbidTopUpType.should.be.an.Array();
            data.data.creditWallet.should.be.an.Array();
            data.data.consumptionTimes.should.be.a.Number();
            data.data.consumptionSum.should.be.a.Number();
            data.data.pastMonthConsumptionSum.should.be.a.Number();
            data.data.weeklyConsumptionSum.should.be.a.Number();
            data.data.dailyConsumptionSum.should.be.a.Number();
            data.data.bonusAmountSum.should.be.a.Number();
            data.data.pastMonthBonusAmountSum.should.be.a.Number();
            data.data.weeklyBonusAmountSum.should.be.a.Number();
            data.data.dailyBonusAmountSum.should.be.a.Number();
            data.data.withdrawSum.should.be.a.Number();
            data.data.pastMonthWithdrawSum.should.be.a.Number();
            data.data.weeklyWithdrawSum.should.be.a.Number();
            data.data.dailyWithdrawSum.should.be.a.Number();
            data.data.withdrawTimes.should.be.a.Number();
            data.data.topUpTimes.should.be.a.Number();
            data.data.topUpSum.should.be.a.Number();
            data.data.pastMonthTopUpSum.should.be.a.Number();
            data.data.weeklyTopUpSum.should.be.a.Number();
            data.data.dailyTopUpIncentiveAmount.should.be.a.Number();
            data.data.dailyTopUpSum.should.be.a.Number();
            data.data.lockedCredit.should.be.a.Number();
            data.data.validCredit.should.be.a.Number();
            data.data.creditBalance.should.be.a.Number();
            data.data.permission.should.not.null();
            data.data.permission.levelChange.should.be.a.Boolean();
            data.data.permission.PlayerLimitedOfferReward.should.be.a.Boolean();
            data.data.permission.PlayerPacketRainReward.should.be.a.Boolean();
            data.data.permission.playerConsecutiveConsumptionReward.should.be.a.Boolean();
            data.data.permission.forbidPlayerFromEnteringGame.should.be.a.Boolean();
            data.data.permission.forbidPlayerFromLogin.should.be.a.Boolean();
            data.data.permission.PlayerDoubleTopUpReturn.should.be.a.Boolean();
            data.data.permission.PlayerTopUpReturn.should.be.a.Boolean();
            data.data.permission.forbidPlayerConsumptionIncentive.should.be.a.Boolean();
            data.data.permission.allowPromoCode.should.be.a.Boolean();
            data.data.permission.forbidPlayerConsumptionReturn.should.be.a.Boolean();
            data.data.permission.disableWechatPay.should.be.a.Boolean();
            data.data.permission.rewardPointsTask.should.be.a.Boolean();
            data.data.permission.banReward.should.be.a.Boolean();
            data.data.permission.quickpayTransaction.should.be.a.Boolean();
            data.data.permission.alipayTransaction.should.be.a.Boolean();
            data.data.permission.SMSFeedBack.should.be.a.Boolean();
            data.data.permission.phoneCallFeedback.should.be.a.Boolean();
            data.data.permission.topUpCard.should.be.a.Boolean();
            data.data.permission.topupManual.should.be.a.Boolean();
            data.data.permission.topupOnline.should.be.a.Boolean();
            data.data.permission.allTopUp.should.be.a.Boolean();
            data.data.permission.transactionReward.should.be.a.Boolean();
            data.data.permission.applyBonus.should.be.a.Boolean();
            data.data.userAgent.should.be.an.Array();
            data.data.games.should.be.an.Array();
            data.data.exp.should.be.a.Number();
            data.data.forbidPromoCodeList.should.be.an.Array();
            data.data.forbidRewardPointsEvent.should.be.an.Array();
            data.data.forbidProviders.should.be.an.Array();
            data.data.status.should.be.a.Number();
            data.data.badRecords.should.be.an.Array();
            data.data.trustLevel.should.be.a.String();
            data.data.blacklistIp.should.be.an.Array();
            data.data.loginIps.should.be.an.Array();
            data.data.lastLoginIp.should.be.a.String();
            data.data.isLogin.should.be.a.Boolean();
            data.data.lastAccessTime.should.be.a.String();
            data.data.registrationTime.should.be.a.String();
            data.data.realName.should.be.a.String();
            data.data.receiveSMS.should.be.a.Boolean();
            data.data.feedbackTimes.should.be.a.Number();
            if(data.data.lastFeedbackTime){//sometimes, it will be null if no feedback time, add a null check here
                data.data.lastFeedbackTime.should.be.a.String();
            }
            data.data.isRealPlayer.should.be.a.Boolean();
            data.data.isTestPlayer.should.be.a.Boolean();
            data.data.icon.should.be.a.String();
            data.data.smsSetting.should.not.null();
            data.data.smsSetting.AuctionOpenPromoCodeSuccess.should.be.a.Boolean();
            data.data.smsSetting.AuctionPromoCodeSuccess.should.be.a.Boolean();
            data.data.smsSetting.PromoCodeSend.should.be.a.Boolean();
            data.data.smsSetting.PlayerLevelUpSuccess.should.be.a.Boolean();
            data.data.smsSetting.PlayerLevelDownMigrationSuccess.should.be.a.Boolean();
            data.data.smsSetting.PlayerLevelUpMigrationSuccess.should.be.a.Boolean();
            data.data.smsSetting.PlayerPromoCodeRewardSuccess.should.be.a.Boolean();
            data.data.smsSetting.PlayerRegisterIntentionSuccess.should.be.a.Boolean();
            data.data.smsSetting.PlayerFreeTrialRewardGroupSuccess.should.be.a.Boolean();
            data.data.smsSetting.PlayerConsumptionRewardGroupSuccess.should.be.a.Boolean();
            data.data.smsSetting.PlayerConsecutiveRewardGroupSuccess.should.be.a.Boolean();
            data.data.smsSetting.PlayerLoseReturnRewardGroupSuccess.should.be.a.Boolean();
            data.data.smsSetting.PlayerTopUpReturnGroupSuccess.should.be.a.Boolean();
            data.data.smsSetting.updatePassword.should.be.a.Boolean();
            data.data.smsSetting.UpdatePhoneInfoSuccess.should.be.a.Boolean();
            data.data.smsSetting.UpdateBankInfoSuccess.should.be.a.Boolean();
            data.data.smsSetting.PlayerLimitedOfferRewardSuccess.should.be.a.Boolean();
            data.data.smsSetting.WithdrawCancel.should.be.a.Boolean();
            data.data.smsSetting.WithdrawSuccess.should.be.a.Boolean();
            data.data.smsSetting.WechatTopupSuccess.should.be.a.Boolean();
            data.data.smsSetting.AlipayTopupSuccess.should.be.a.Boolean();
            data.data.smsSetting.OnlineTopupSuccess.should.be.a.Boolean();
            data.data.smsSetting.ManualTopupSuccess.should.be.a.Boolean();
            data.data.smsSetting.PlayerConsumptionReturnSuccess.should.be.a.Boolean();
            data.data.smsSetting.updatePaymentInfo.should.be.a.Boolean();
            data.data.smsSetting.consumptionReturn.should.be.a.Boolean();
            data.data.smsSetting.applyReward.should.be.a.Boolean();
            data.data.smsSetting.cancelBonus.should.be.a.Boolean();
            data.data.smsSetting.applyBonus.should.be.a.Boolean();
            data.data.smsSetting.manualTopup.should.be.a.Boolean();
            if(data.data.DOB){
                data.data.DOB.should.be.a.String();
            }
            data.data.gender.should.be.a.Boolean();
            data.data.email.should.be.a.String();
            data.data.__v.should.be.a.Number();
            data.data.playerLevel.should.not.null();
            data.data.playerLevel._id.should.be.a.String();
            data.data.playerLevel.name.should.be.a.String();
            data.data.playerLevel.value.should.be.a.Number();
            data.data.playerLevel.platform.should.not.null();
            data.data.playerLevel.playerValueScore.should.be.a.Number();
            data.data.playerLevel.reward.should.not.null();
            data.data.playerLevel.levelDownConfig.should.be.an.Array();
            data.data.playerLevel.levelUpConfig.should.be.an.Array();
            data.data.playerLevel.__v.should.be.a.Number();
            data.data.rewardPointsObjId.should.not.null();
            data.data.userCurrentPoint.should.be.a.Number();
            data.data.platformId.should.be.a.String();
            data.data.bankAccountCityId.should.be.a.String();
            data.data.pendingRewardAmount.should.be.a.Number();
            data.data.preDailyExchangedPoint.should.be.a.Number();
            data.data.preDailyAppliedPoint.should.be.a.Number();
            data.status.should.equal(200);
            done();
        }, {playerId: testPlayerId});
    });

    it('Should update a player sms setting', function () {
        clientPlayerAPITest.updateSmsSetting(function (data) {
            // data.status.should.equal(200);
            // done();
        }, {
            playerId: testPlayerId,
            smsSetting: "mobilePhone"
        });
    });

    // it('Should send sms code', function(done){
    //     const smsParam = {
    //         phoneNumber: testPhoneNumber,
    //         platformId: testPlatformId
    //     };
    //    clientPlayerAPITest.getSMSCode(function(data){
    //        data.status.should.equal(200);
    //        done();
    //    }, smsParam);
    // });

    it('Should get credit detail', function(){
        clientPlayerAPITest.getCreditDetail(function (data){
            // expect(data.data.credit).toBe('number');
            data.data.credit.should.be.a.Number();
            data.data.finalAmount.should.be.a.Number();
            if(data.data.sameLineProviders){
                data.data.sameLineProviders.should.be.an.Array();
            }
            data.data.gameCreditList.should.be.an.Array();
            if(data.data.gameCreditList.length > 0){
                data.data.gameCreditList.nickName.should.be.a.String();
                data.data.gameCreditList.validCredit.should.be.a.Number();
                data.data.gameCreditList.status.should.be.a.Boolean();
                data.data.gameCreditList.providerId.should.be.a.String();
            }
            if(data.data.lockedCreditList.length > 0){
                data.data.lockedCreditList.should.be.an.Array();
                data.data.lockedCreditList.nickName.should.be.a.String();
                data.data.lockedCreditList.lockCredit.should.be.a.Number();
                data.data.lockedCreditList.list.should.be.an.Array();
                if(data.data.lockedCreditList.list.length > 0){
                    data.data.lockedCreditList.list.providerId.should.be.a.String();
                    data.data.lockedCreditList.list.nickName.should.be.a.String();
                    data.data.lockedCreditList.list.validCredit.should.be.a.Number();
                    data.data.lockedCreditList.list.status.be.a.Boolean();
                }
            }
            // expect(data.data.finalAmount).toBe('number');
            data.status.should.equal(200);
            // done();ObjectId("5cebb27843d8f20296c7cde1")
        }, {playerObjId: testPlayerObjId});
    });

    // it('Should update a player payment info', function (done) {
    //     var updatePaymentInfo = {
    //         playerId: testPlayerId,
    //         bankType: "testBank",
    //         bankAccount: "1234567890123456",
    //         // bankAccountName: "testPlayer",
    //         bankAccountType: "saving"
    //     };
    //     clientPlayerAPITest.updatePaymentInfo(function (data) {
    //         data.status.should.equal(200);
    //         done();
    //     }, updatePaymentInfo);
    // });

    it('Should check a player name valid to register and should return false', function () {
        clientPlayerAPITest.isValidUsername(function (data) {
            data.data.should.equal(false);

        }, {name: testPlayerName, platformId: testPlatformId});
    });


    it('Should authenticate the token from previous login', function () {
        clientPlayerAPITest.authenticate(function (data) {
            data.status.should.equal(200);

        }, {playerId: testPlayerId, token: token});
    });

    it('Should update photo url', function () {
        clientPlayerAPITest.updatePhotoUrl(function (data) {
            data.status.should.equal(200);

        }, {
            photoUrl: "http://facebook.com/aaa/bbb"
        });
    });

    it('Should get player Credit Balance', function () {
        clientPlayerAPITest.getCreditBalance(function (data) {
            data.status.should.equal(200);

        });
    });


    it('Should get player weekly status', function () {
        clientPlayerAPITest.getPlayerWeekStatus(function (data) {
            data.status.should.equal(200);

        });
    });

    it('Should get player Monthly status', function () {
        clientPlayerAPITest.getPlayerMonthStatus(function (data) {
            data.status.should.equal(200);

        });
    });

    it('Should get player mailing list', function () {
        clientPlayerAPITest.getMailList(function (data) {
            data.status.should.equal(200);

        });
    });


    it('Should do player Quick Registration', function () {
        dbconfig.collection_players.remove({name: testQuickPlayerName});

        clientPlayerAPITest.playerQuickReg(function (data) {
            data.data.name.should.endWith(testQuickPlayerName);

        }, {
            "name": testQuickPlayerName,
            "email": "testPlayer123@gmail.com",
            "realName": "testPlayerRealName",
            "password": "123456",
            "platformId": testPlatformId,
            "phoneNumber": "97787654",
        });
    });

    it('Fail in updating player password', function () {
        clientPlayerAPITest.updatePassword(function (data) {
            data.status.should.equal(400);

        }, {
            playerId: testPlayerId,
            oldPassword: '123456',
            newPassword: '5678'
        });
    });

    it('Success in updating player password', function () {
        clientPlayerAPITest.updatePassword(function (data) {
            data.status.should.equal(200);

        }, {
            playerId: testPlayerId,
            oldPassword: '123456',
            newPassword: '567891'
        });
    });

    it('Should logout the player', function () {
        clientPlayerAPITest.logout(function (data) {
            data.status.should.equal(200);

        }, {playerId: testPlayerId});
    });

    it('Should show player withdrawal info', function () {
        clientPlayerAPITest.getWithdrawalInfo(function (data) {

        }, {platformId: testPlatformId});
    });

    after(async function () {
        // remove all test data
        let removeTestDataProm = commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]);
        let removeTestProposalData = commonTestFun.removeTestProposalData([] , testPlatformObjId, [], [testPlayerObjId]);
        let finished = await Promise.all([removeTestDataProm, removeTestProposalData]);

        //
        client.disconnect();
    });

    // it('Should remove all test Data', function(done){
    //     commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function(data){
    //         done();
    //     })
    // });
    //
    // it('Should remove all test proposal Data', function(done){
    //     commonTestFun.removeTestProposalData([] , testPlatformObjId, [], [testPlayerObjId]).then(function(data){
    //         done();
    //     })
    // });

    //notifyNewMail
    //sendPlayerMailFromPlayerToAdmin

});

