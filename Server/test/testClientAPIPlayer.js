var should = require('chai').should();
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
var testGuestPhoneNumber = '55699874';
var testPPlayerPhoneNumber = '97787654556';

var testPlayerName = null;
var testNewPlayerName = 'testnewplayer';
var testNewGuestPlayerName = 'testguestplayer';
var testNewPlayerPartnerName = 'testplayerpartner';
var testPlatformObjId = null;
var testPlatformId = null;
var testPlayerObjId = null;
var testPlayerId = null;
var testNewPlayerId = null;
var testNewGuestPlayerId = null;
var testNewPlayerPartnerId = null;
var smsCode = null;
var token = null;
var dat = null;
var testPlayerGender = null;
var testPlayerDOB = null;
var testPlayerRealName = null;
var testPlayerOldPwd = null;
var smsLog = null;
var pwdToken = null;

describe("Test Client API - Player service", function () {
    this.timeout(12000)
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
    before(async function () {
        //create test platform
        let testPlatform = await commonTestFun.createTestPlatform();
        testPlatformObjId = testPlatform._id;
        testPlatformId = testPlatform.platformId;

        // create test player
        let testPlayer = await commonTestFun.createTestPlayer(testPlatformObjId);
        testPlayerName = testPlayer.name;
        testPlayerObjId = testPlayer._id;
        testPlayerId = testPlayer.playerId;
        testPlayerGender = testPlayer.gender;
        testPlayerDOB = testPlayer.DOB;
        testPlayerRealName = testPlayer.realName;

        testPlayerGender = testPlayer.gender;
        testPlayerDOB = testPlayer.DOB;
        testPlayerRealName = testPlayer.realName;

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
        // saveLog2();
        let randomCode = parseInt(Math.random() * 9000 + 1000);
        let randomCh = parseInt(Math.random() * 900 + 100);
        // let today = new Date();
        // today.setHours(0, 0, 0, 0);
        let curDate = new Date();
        curDate.setHours(curDate.getHours(), curDate.getMinutes(), curDate.getSeconds(), curDate.getMilliseconds());
        curDate.setDate(curDate.getDate());
        console.log('cur date', curDate);
        let saveObj = {
            tel: testPhoneNumber,
            channel: randomCh,
            platformObjId: testPlatformObjId,
            platformId: testPlatformId,
            code: randomCode,
            delay: 0
            // createTime: curDate
        };
        let saveLogObj = {
            tel: testPhoneNumber,
            channel: randomCh,
            platform: testPlatformObjId,
            platformId: testPlatformId,
            message: randomCode,
            type: 'player',
            status: 'success'
        };
        let saveLog = await dbconfig.collection_smsVerificationLog(saveObj).save();
        if(!saveLog){
            return Promise.reject("Save verification log failed");
        }
        let saveLog2 = await dbconfig.collection_smsLog(saveLogObj).save();
        if(!saveLog2){
            return Promise.reject("Save sms log failed");
        }
        let getLog = await dbconfig.collection_smsVerificationLog.findOne({}).sort({createTime: -1})
        if(!getLog){
            return Promise.reject("Get log failed");
        }
        smsLog = getLog.code;


        // getLog();
    });

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
        apiCreatedPlayer.data.name.should.equal(testNewPlayerName);
        done();
    });

    let apiCreatedGuestPlayer;
    before(function(done){
        const newGuestPData = {
            name: testNewGuestPlayerName,
            platformId: testPlatformId,
            phoneNumber: testGuestPhoneNumber,
            captcha: 'testCaptcha',
            password: "654321",
            lastLoginIp: "192.168.3.23",
            email: "testGuestPlayer123@gmail.com",
            isTestPlayer: true,
            guestDeviceId: "01234567-89ABCDEF-01234567-89ABCDEF"
        };
        clientPlayerAPITest.createGuestPlayer(function(data) {
            apiCreatedGuestPlayer = data;
            testNewGuestPlayerId = data.data.playerId;
            done();
        }, newGuestPData);
    })
    it('Should create test guest player', function(done){
        // apiCreatedGuestPlayer.data.name.should.endWith(testNewGuestPlayerName);
        done();
    });

    it('Should create a test player', function(done) {
        apiCreatedPlayer.data.name.should.equal(testNewPlayerName);
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
        apiLoginPlayer.status.should.equal(200);
        // apiLoginPlayer.token.should.be.a.String();
        apiLoginPlayer.token.should.be.a('string');
        apiLoginPlayer.data.name.should.equal(testPlayerName);
        done();
    });

    it('Should return true - test player isLogin', function (done) {

        clientPlayerAPITest.isLogin(function (data) {
            data.status.should.equal(200);
            data.data.should.equal(true);
            done();
        }, {playerId: testPlayerId});
    });

    //todo::add env config for server url
    it('Should get a test player', function (done) {
        clientPlayerAPITest.get(function (data) {
            data.status.should.equal(200);
            // data.data.should.be.an.Object();
            data.data.hasPassword.should.be.a('boolean');
            done();
        }, {playerId: testPlayerId});
    });


    it('Should set player password', function (done) {
        var randomPWD = Math.floor((Math.random() * 100000) + 100000);
        clientPlayerAPITest.settingPlayerPassword(function (data) {
            data.status.should.equal(200);
            data.data.text.should.be.a('string');
            //this if block doing for updatePassword
            if(data.status === 200){
                testPlayerOldPwd = randomPWD.toString();
            }
            done();
        }, {
            playerId: testPlayerId,
            password: randomPWD.toString()
        });
    });

    it('Should generate Password Token', function(done){
        let reqData = {platformId: testPlatformId,
            name: testPlayerName,
            phoneNumber: testPhoneNumber,
            smsCode: smsLog};
        clientPlayerAPITest.generateUpdatePasswordToken(function(data){
            pwdToken = data.data.token;
            done();
        }, reqData);
    });

    it('Should Update Password With Token', function (done) {
        clientPlayerAPITest.updatePasswordWithToken(function (data) {
            data.status.should.equal(200);
            done();
        }, {
            token: pwdToken,
            password: "password123456789",
        });
    });

    it('Fail in updating player password', function (done) {
        clientPlayerAPITest.updatePassword(function (data) {
            data.status.should.equal(400);
            done();
        }, {
            playerId: testPlayerId,
            oldPassword: testPlayerOldPwd,
            newPassword: '5678'
        });
    });

    it('Success in updating player password', function (done) {
        var randomPWD = Math.floor((Math.random() * 100000000) + 100000000);
        clientPlayerAPITest.updatePassword(function (data) {
            data.status.should.equal(200);
            //this if block doing for resetPassword.
            if(data.status === 200){
                testPlayerOldPwd = randomPWD.toString();
            }
            done();
        }, {
            playerId: testPlayerId,
            oldPassword: testPlayerOldPwd,
            newPassword: randomPWD.toString()
        });
    });

    it('Should reset password', function () {
        var randomPWD = Math.floor((Math.random() * 100000) + 100000);
        var randomSms = Math.floor((Math.random() * 1000) + 1000);
        clientPlayerAPITest.resetPassword(function (data) {
            data.status.should.equal(200);
            data.data.phoneNumber.should.be.a('number');
            data.data.name.should.be.a('string');
            data.data.playerId.should.be.a('string');
            data.data.createTime.should.be.a('string');
            data.data.realName.should.be.a('string');
            data.data.password.should.be.a('string');
            data.data.questionList.id.should.be.a('number');
            data.data.questionList.type.should.be.a('number');
            data.data.questionList.title.should.be.a('string');
            data.data.questionList.option.should.be.a('string');
        }, {
            platformId: testPlatformId,
            name: testNewPlayerName,
            smsCode: randomSms,
            phoneNumber: testPhoneNumber,
            playerId: testPlayerId,
            oldPassword: testPlayerOldPwd,
            newPassword: randomPWD.toString()
        });
    });

    it('Should update a player sms setting', function () {
        clientPlayerAPITest.updateSmsSetting(function (data) {
            data.status.should.equal(200);
            // done();
        }, {
            playerId: testPlayerId,
            smsSetting: "mobilePhone"
        });
    });

    it('Should check a player name valid to register and should return false', function () {
        clientPlayerAPITest.isValidUsername(function (data) {
            data.status.should.equal(200);
            data.data.should.equal(false);
        }, {name: testPlayerName, platformId: testPlatformId});
    });

    // it('Should get sms code', function(done){
    //     const smsParam = {
    //         phoneNumber: testPhoneNumber,
    //         platformId: testPlatformId
    //     };
    //    clientPlayerAPITest.getSMSCode(function(data){
    //        data.status.should.equal(200);
    //        done();
    //    }, smsParam);
    // });

    it('Should get credit', function(){
        clientPlayerAPITest.getCredit(function (data){
            data.status.should.equal(200);
            data.data.gameCredit.should.be.a('number');;
            data.data.pendingRewardAmount.should.be.a('number');;
            data.data.validCredit.should.be.a('number');;
        }, {playerId: testPlayerId});
    });

    it('Should get player Credit Balance', function () {
        clientPlayerAPITest.getCreditBalance(function (data) {
            data.status.should.equal(200);
            data.data.should.be.a('number');;
        }, {playerId: testPlayerId});
    });

    it('Should get credit info', function(){
        clientPlayerAPITest.getCreditInfo(function (data){
            data.status.should.equal(200);
            data.data.gameCredit.should.be.a('number');
            data.data.lockedCredit.should.be.a('number');
            data.data.taskData._id.should.be.a('string');
            data.data.taskData.playerId.should.be.a('string');
            data.data.taskData.type.should.be.a('string');
            data.data.taskData.rewardType.should.be.a('string');
            data.data.taskData.platformId.should.be.a('string');
            data.data.taskData.eventId.should.be.a('string');
            data.data.taskData.useConsumption.should.be.a('boolean');
            data.data.taskData.isUnlock.should.be.a('boolean');
            data.data.taskData.initAmount.should.be.a('number');
            data.data.taskData.currentAmount.should.be.a('number');
            data.data.taskData._inputCredit.should.be.a('number');
            data.data.taskData.unlockedAmount.should.be.a('number');
            data.data.taskData.requiredUnlockAmount.should.be.a('number');
            data.data.taskData.inProvider.should.be.a('boolean');
            data.data.taskData.createTime.should.be.a('string');
            data.data.taskData.data.should.be.null();
            data.data.taskData.targetGames.should.be.an('array');
            data.data.taskData.targetProviders.should.be.an('array');
            data.data.taskData.status.should.be.a('string');
            data.data.validCredit.should.be.a('number');
        }, {playerId: testPlayerId});
    });

    it('Should get credit detail', function(){
        clientPlayerAPITest.getCreditDetail(function (data){
            data.data.credit.should.be.a('number');
            data.data.finalAmount.should.be.a('number');
            if(data.data.sameLineProviders){
                data.data.sameLineProviders.should.be.an('array');
            }
            data.data.gameCreditList.should.be.an('array');
            if(data.data.gameCreditList.length > 0){
                data.data.gameCreditList.nickName.should.be.a('string');
                data.data.gameCreditList.validCredit.should.be.a('number');
                data.data.gameCreditList.status.should.be.a('boolean');
                data.data.gameCreditList.providerId.should.be.a('string');
            }
            if(data.data.lockedCreditList.length > 0){
                data.data.lockedCreditList.should.be.an('array');
                data.data.lockedCreditList.nickName.should.be.a('string');
                data.data.lockedCreditList.lockCredit.should.be.a('number');
                data.data.lockedCreditList.list.should.be.an('array');
                if(data.data.lockedCreditList.list.length > 0){
                    data.data.lockedCreditList.list.providerId.should.be.a('string');
                    data.data.lockedCreditList.list.nickName.should.be.a('string');
                    data.data.lockedCreditList.list.validCredit.should.be.a('number');
                    data.data.lockedCreditList.list.status.be.a('boolean');
                }
            }
            data.status.should.equal(200);
        }, {playerObjId: testPlayerObjId});
    });

    it('Should authenticate the token from previous login', function () {
        clientPlayerAPITest.authenticate(function (data) {
            data.status.should.equal(200);
            data.data.should.be.a('boolean');

        }, {playerId: testPlayerId, token: token});
    });

    it('Should update photo url', function () {
        clientPlayerAPITest.updatePhotoUrl(function (data) {
            data.status.should.equal(200);
        }, {
            photoUrl: "http://facebook.com/aaa/bbb"
        });
    });

    it('Should get player day status', function () {
        clientPlayerAPITest.getPlayerDayStatus(function (data) {
            data.status.should.equal(200);
            data.data.topUpAmount.should.be.a('number');
            data.data.consumptionAmount.should.be.a('number');

        }, {playerId: testPlayerId});
    });

    it('Should get player weekly status', function () {
        clientPlayerAPITest.getPlayerWeekStatus(function (data) {
            data.status.should.equal(200);
            data.data.topUpAmount.should.be.a('number');
            data.data.consumptionAmount.should.be.a('number');

        },{playerId: testPlayerId});
    });

    it('Should get player Monthly status', function () {
        clientPlayerAPITest.getPlayerMonthStatus(function (data) {
            data.status.should.equal(200);
            data.data.topUpAmount.should.be.a('number');
            data.data.consumptionAmount.should.be.a('number');

        },{playerId: testPlayerId});
    });

    it('Should get player any day status', function () {
        clientPlayerAPITest.getPlayerAnyDayStatus(function (data) {
            data.status.should.equal(200);
            data.data.topUpAmount.should.be.a('number');
            data.data.consumptionAmount.should.be.a('number');
            data.data.bonusAmount.should.be.a('number');
            data.data.rewardAmount.should.be.a('number');

        },{playerId: testPlayerId});
    });

    it('Should get player mailing list', function () {
        clientPlayerAPITest.getMailList(function (data) {
            data.status.should.equal(200);
            data.data._id.should.be.a('string');
            data.data.title.should.be.a('string');
            data.data.content.should.be.a('string');
            data.data.hasBeenRead.should.be.a('boolean');
            data.data.createTime.should.be.a('string');

        },{playerId: testPlayerId});
    });

    it('Should get player unread mail', function () {
        clientPlayerAPITest.getUnreadMail(function (data) {
            data.status.should.equal(200);
            data.data._id.should.be.a('string');
            data.data.title.should.be.a('string');
            data.data.content.should.be.a('string');
            data.data.hasBeenRead.should.be.a('boolean');
            data.data.createTime.should.be.a('string');
        },{playerId: testPlayerId});
    });

    it('Should send mail from player to player', function () {
        clientPlayerAPITest.sendPlayerMailFromPlayerToPlayer(function (data) {
            data.status.should.equal(200);
            data.data.__v.should.be.a('number');
            data.data.platformId.should.be.a('string');
            data.data.senderType.should.be.a('string');
            data.data.senderId.should.be.a('string');
            data.data.senderName.should.be.a('string');
            data.data.recipientType.should.be.a('string');
            data.data.recipientId.should.be.a('string');
            data.data.title.should.be.a('string');
            data.data.content.should.be.a('string');
            data.data._id.should.be.a('string');
            data.data.bDelete.should.be.a('boolean');
            data.data.hasBeenRead.should.be.a('boolean');
            data.data.createTime.should.be.a('string');
        },{playerObjId: testPlayerObjId, recipientPlayerId: testNewPlayerId, title: "Hello World", content: "unit test"});
    });


    it('Should check valid real name', function () {
        const param = {
            realName: "单元测试姓名",
            platformId: testPlatformId
        }
        clientPlayerAPITest.isValidRealName(function (data) {
            data.status.should.equal(200);
            data.data.should.be.a('boolean');//data.data just simply return true, so check as boolean.

        }, param);
    });

    it('Should get player unread mail', function () {
        clientPlayerAPITest.getUnreadMail(function (data) {
            data.status.should.equal(200);
            data.data._id.should.be.a('string');
            data.data.title.should.be.a('string');
            data.data.content.should.be.a('string');
            data.data.hasBeenRead.should.be.a('boolean');
            data.data.createTime.should.be.a('string');
        },{playerId: testPlayerId});
    });

    it('Should send mail from player to player', function () {
        clientPlayerAPITest.sendPlayerMailFromPlayerToPlayer(function (data) {
            data.status.should.equal(200);
            data.data.__v.should.be.a('number');
            data.data.platformId.should.be.a('string');
            data.data.senderType.should.be.a('string');
            data.data.senderId.should.be.a('string');
            data.data.senderName.should.be.a('string');
            data.data.recipientType.should.be.a('string');
            data.data.recipientId.should.be.a('string');
            data.data.title.should.be.a('string');
            data.data.content.should.be.a('string');
            data.data._id.should.be.a('string');
            data.data.bDelete.should.be.a('boolean');
            data.data.hasBeenRead.should.be.a('boolean');
            data.data.createTime.should.be.a('string');
        },{playerObjId: testPlayerObjId, recipientPlayerId: testNewPlayerId, title: "Hello World", content: "unit test"});
    });

    it('Should update player', function () {
        clientPlayerAPITest.update(function (data) {
            data.status.should.equal(200);
        },{playerId: testNewPlayerId, gender: testPlayerGender, DOB: testPlayerDOB});
    });

    it('Should update player qq', function () {
        var randomQQ = Math.floor((Math.random() * 1000000000) + 1000000000);
        clientPlayerAPITest.updatePlayerQQ(function (data) {
            data.status.should.equal(200);
        },{playerId: testNewPlayerId, qq: randomQQ.toString()});
    });

    it('Should update player wechat', function () {
        clientPlayerAPITest.updatePlayerWeChat(function (data) {
            data.status.should.equal(200);

        }, {playerId: testNewPlayerId, wechat: "testchangewechat"});
    });

    it('Should update player email', function () {
        clientPlayerAPITest.updatePlayerEmail(function (data) {
            data.status.should.equal(200);

        }, {playerId: testNewPlayerId, email: "testplayerupdate@test.com"});
    });


    it('Should get a captcha', function () {
        clientPlayerAPITest.captcha(function (data) {
            data.status.should.equal(200);
            data.data.should.be.an("object");
        });
    });
       

    it('Should set SMS status', function () {
        clientPlayerAPITest.setSmsStatus(function (data) {
            data.status.should.equal(200);
        }, {playerId: testPlayerId, status: "1"});
    });

    it('Should get SMS status', function () {
        clientPlayerAPITest.getSmsStatus(function (data) {
            data.status.should.equal(200);
            data.data.smsName.should.be.a('string');
            data.data.smsId.should.be.a('string');
            data.data.status.should.be.a('number');
            data.data.settings.smsName.should.be.a('string');
            data.data.settings.smsId.should.be.a('string');
            data.data.settings.status.should.be.a('number');
        }, {playerId: testPlayerId});
    });

    it('Should manual level up', function () {
        clientPlayerAPITest.manualPlayerLevelUp(function (data) {
            data.status.should.equal(200);
            data.data.should.be.a('boolean');
        },{playerId: testPlayerObjId});
    });

    it('Should verify phone number by SMS code', function () {
        // let randomCode = parseInt(Math.random() * 9000 + 1000);
        clientPlayerAPITest.verifyPhoneNumberBySMSCode(function (data) {
            data.status.should.equal(200);
        }, {playerId: testPlayerId, smsCode: smsLog});
    });

    it('Get last game info', function () {
        clientPlayerAPITest.getLastPlayedGameInfo(function (data) {
            data.status.should.equal(200);

        }, testPlayerObjId);
    });

    it('Should show player withdrawal info', function () {
        clientPlayerAPITest.getWithdrawalInfo(function (data) {

        }, {platformId: testPlatformId});
    });


//-------------------By Taylor-------------------------

    it('Should login Jbl Show', function () {
        clientPlayerAPITest.loginJblShow(function (data) {
            data.status.should.equal(200);
            data.data.url.should.be.a('string');

        }, {playerObjId: testPlayerObjId });
    });

    it('Should Create Demo Player', function () {
        clientPlayerAPITest.createDemoPlayer(function (data) {
            data.status.should.equal(200);

        }, {platformId: testPlatformId, "smsCode": "3963", "phoneNumber": "97787654" });
    });

    it('Should Change Birthday Date', function () {
        clientPlayerAPITest.changeBirthdayDate(function (data) {
            data.status.should.equal(200);
            data.data.should.be.an('object');

        }, {playerObjId: testPlayerObjId, date: "2000-01-01T00:00"});
    });

    it('Should get Client Data', function () {
        clientPlayerAPITest.getClientData(function (data) {
            data.status.should.equal(200);
            data.data.should.be.a('string');

        }, {playerId: testPlayerId});
    });

    it('Should Save Client Data', function () {
        clientPlayerAPITest.saveClientData(function (data) {
            data.status.should.equal(200);
            data.data.should.be.a('string');

        }, {playerId: testPlayerId,
            clientData:"abc"});
    });

    it('Should Call Back To User', function () {
        clientPlayerAPITest.callBackToUser(function (data) {
            data.status.should.equal(200);
            data.data.should.equal(true);

        }, {platformId: testPlatformId,
            phoneNumber: "13969999999",
            "randomNumber": "1",
            "captcha": "8353",
            "lineId": "0",
            playerId: testPlayerId
        });
    });

    it('Should Get OM Captcha', function () {
        clientPlayerAPITest.getOMCaptcha(function (data) {
            data.status.should.equal(200);
            data.data.should.be.an('object');
            data.data.randomNumber.should.be.a('number');
            data.data.data.should.be.a('string');

        }, {platformId: testPlatformId});
    });

    it('Should Get Receive Transfer List', function () {
        clientPlayerAPITest.getReceiveTransferList(function (data) {
            data.status.should.equal(200);
            data.data.should.be.an('object');
            data.data.stats.totalCount.should.be.a('number');
            data.data.stats.totalPage.should.be.a('number');
            data.data.stats.currentPage.should.be.a('number');
            data.data.stats.totalReceiveAmount.should.be.a('number');

            data.data.list.amount.should.be.a('number');
            data.data.list.time.should.be.a('string');
            data.data.list.status.should.be.a('string');
            data.data.list.proposalId.should.be.a('string');
            data.data.list.withdrawConsumption.should.be.a('number');
            data.data.list.providerGroupId.should.be.a('number');

        }, {
            platformId: testPlatformId,
            playerId: testPlayerId,
            startTime: "",
            endTime: "",
            requestPage: 1,
            count: 10
        });
    });

    it('Should Set PhoneNumber', function () {
        clientPlayerAPITest.setPhoneNumber(function (data) {
            data.status.should.equal(200);
            data.data.should.be.an('object');
            data.data.number.should.be.a('string');

        }, {playerId: testPlayerId, number: "01155555555", smsCode: "3223"});
    });

    it('Should Get Player Login Or Register With SMS', function () {
        clientPlayerAPITest.playerLoginOrRegisterWithSMS(function (data) {
            data.status.should.equal(200);
            data.data.should.be.an('object');

        }, {
            platformId: testPlatformId,
            phoneNumber: "17355544411",
            smsCode: "8888",
            accountPrefix: "e",
            checkLastDeviceId: true,
            referralId: " 邀请码 "
        });
    });

    it('Should Get Phone Number Login With Password', function () {
        clientPlayerAPITest.phoneNumberLoginWithPassword(function (data) {
            data.status.should.equal(200);
            data.data.should.be.an('object');

        }, {
            platformId: testPlatformId,
            phoneNumber: "17355544411",
            password: "8888",
            captcha: "34223"
        });
    });

    it('Should Get Update DeviceId', function () {
        clientPlayerAPITest.updateDeviceId(function (data) {
            data.status.should.equal(200);
            data.data.number.should.be.a('string');

        }, {playerId: testPlayerId, deviceId: "deviceId123"});
    });

    it('Should Check is App Player And Applied Reward', function () {
        clientPlayerAPITest.checkIsAppPlayerAndAppliedReward(function (data) {
            data.status.should.equal(200);

        }, {
            token: token,
            password: "password123456789",
        });
    });

    //-------------------By Taylor-------------------------

    it('Should logout the player', function () {
        clientPlayerAPITest.logout(function (data) {
            data.status.should.equal(200);
        }, {playerId: testPlayerId});
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

