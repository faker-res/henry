let should = require('chai').should();
let dbconfig = require('../modules/dbproperties');
let WebSocketClient = require('../server_common/WebSocketClient');
let PlayerService = require('../services/client/ClientServices').PlayerService;
let RegistrationIntentionService = require('../services/client/ClientServices').RegistrationIntentionService;
let TopUpIntentionService = require('../services/client/ClientServices').TopUpIntentionService;
let ConsumptionService = require('../services/client/ClientServices').ConsumptionService;
let ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');

let env = require("../config/env").config();
let commonTestFun = require('../test_modules/commonTestFunc');
let dbRole = require('../db_modules/dbRole');

let testPhoneNumber = '95567654';
let testGuestPhoneNumber = '55699874';

let testPlayerName = null;
let testNewPlayerName = 'testnewplayer';
let testNewGuestPlayerName = 'testguestplayer';
let testPlatformObjId = null;
let testPlatformId = null;
let testPlayerObjId = null;
let testPlayerId = null;
let testNewPlayerId = null;
let testNewGuestPlayerId = null;
let smsCode = null;
let token = null;
let testPlayerGender = null;
let testPlayerRealName = null;
let testPlayerOldPwd = null;
let smsLog = null;
let pwdToken = null;
let step1DepartmentId = null;
let step1AdminId = null;
let step1AdminName = null;
let step1RoleId = null;

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
        let platformData = {
            callRequestUrlConfig: "http://www.testchat.com",
            callRequestLineConfig: [
                {
                    "minLevel": "",
                    "lineName": "test8888",
                    "lineId": 8888,
                    "status": 1
                }
            ]
        }
        let testPlatform = await commonTestFun.createTestPlatform(platformData);
        testPlatformObjId = testPlatform._id;
        testPlatformId = testPlatform.platformId;

        // create test player
        let testPlayer = await commonTestFun.createTestPlayer(testPlatformObjId);
        testPlayerName = testPlayer.name;
        testPlayerObjId = testPlayer._id;
        testPlayerId = testPlayer.playerId;
        testPlayerGender = testPlayer.gender;
        testPlayerRealName = testPlayer.realName;
        testPlayerGender = testPlayer.gender;
        testPlayerRealName = testPlayer.realName;

        let randomCode = parseInt(Math.random() * 9000 + 1000);
        let randomCh = parseInt(Math.random() * 900 + 100);
        let curDate = new Date();
        curDate.setHours(curDate.getHours(), curDate.getMinutes(), curDate.getSeconds(), curDate.getMilliseconds());
        curDate.setDate(curDate.getDate());
        console.log('cur date', curDate);

        // create test department
        let testDepartment = await commonTestFun.createTestDepartment();
        testDepartment.should.have.property('_id');

        step1DepartmentId = testDepartment._id;

        // create test admin with role
        let testAdminWithRole = await commonTestFun.createTestAdminWithRole(step1DepartmentId);
        testAdminWithRole[0].should.have.property('_id');
        testAdminWithRole[1].should.have.property('_id');

        step1AdminId = testAdminWithRole[0]._id;
        step1AdminName = testAdminWithRole[0].adminName;
        step1RoleId = testAdminWithRole[1]._id;

        // attach test roles to test users
        let testAttachRolesToUsers = await dbRole.attachRolesToUsersById([step1AdminId], [step1RoleId]);

        // create test client QnA Template
        let forgotPasswordLevel1 = {
            alternativeQuestion: {des: "forgot user ID?"},
            question: [{questionNo: 1, des: "Please enter your user ID:"}],
            answerInput: [{type: "text", objKey: "name", questionNo: 1, placeHolder: "Please enter player ID"}],
            action: "forgotPassword1"
        }
        await commonTestFun.createClientQnATemplate("1", "forgotPassword", forgotPasswordLevel1);
        let forgotPasswordLevel2_1 = {
            alternativeQuestion: {des: "Inconvenient to accept?", action: "forgotPassword2"},
            question: [{questionNo: 1, des: "Please enter phone number of the account, a sms verification code will be sent"}],
            answerInput: [{type: "text", objKey: "phoneNumber", questionNo: 1, placeHolder: "Please enter phone number"}],
            action: "forgotPassword2_1"
        }
        await commonTestFun.createClientQnATemplate("2_1", "forgotPassword", forgotPasswordLevel2_1);
        let forgotPasswordLevel2_2 = {
            isSecurityQuestion: true,
            questionTitle: "Please answer the question below",
            question: [
                {questionNo: 1, des: "Please enter last 4 digits of bank account (must answer correctly)"},
                {questionNo: 2, des: "Please enter bank card name?"},
                {questionNo: 3, des: "Please enter bank card registration city?"},
                {questionNo: 4, des: "Please enter bank name?"}],
            answerInput: [
                {type: "text", objKey: "bankAccount", questionNo: 1},
                {type: "text", objKey: "bankCardName", questionNo: 2},
                {type: "select", objKey: "bankCardProvince", questionNo: 3, options: "qnaProvinceList"},
                {type: "select", objKey: "bankCardCity", questionNo: 3, options: "qnaCityList"},
                {type: "select", objKey: "bankName", questionNo: 4, options: "qnaAllBankTypeList"},
            ],
            action: "forgotPassword2_2"
        }
        await commonTestFun.createClientQnATemplate("2_2", "forgotPassword", forgotPasswordLevel2_2);
        let forgotPasswordLevel3 = {
            alternativeQuestion: {des: "Didn't receive? Send again", isResendSMS: true, action: "forgotPasswordResendSMSCode"},
            question: [{questionNo: 1, des: "Please enter the verification code"}],
            answerInput: [{type: "text", objKey: "smsCode", questionNo: 1, placeHolder: "Verification code"}],
            action: "forgotPassword3_1"
        }
        await commonTestFun.createClientQnATemplate("3_1", "forgotPassword", forgotPasswordLevel3);

        // create test client QnA Template Config
        let configData = {
            type: "forgotPassword",
            minQuestionPass: 1,
            defaultPassword : "888888"
        }
        await commonTestFun.createTestClientQnAConfig(testPlatformObjId, configData);

        // create test sms group
        let testSmsGroup = await commonTestFun.createTestSMSGroup(testPlatformObjId);
        testSmsGroup.should.have.property('smsId');

        // update test sms group
        let smsGroupData = [{
            platformObjId: testPlatformObjId,
            smsName: "PlayerRegisterIntentionSuccess",
            smsParentSmsId: testSmsGroup.smsId
        }]
        await commonTestFun.updateTestSMSGroup(testPlatformObjId, smsGroupData)

        // create test player mail
        let title = "test player mail title";
        let content = "test player mail content";
        await commonTestFun.createTestPlayerMail(testPlatformObjId, step1AdminId, step1AdminName, testPlayerObjId, title, content);

        // create test sms code
        let phoneNumbers = [testPhoneNumber, "80808080", "17355544411", "01155555555"];
        let testSMSVerificationLogProms = [];
        let testSMSLogProms = [];
        if (phoneNumbers && phoneNumbers.length > 0) {
            phoneNumbers.forEach(phoneNumber => {
                testSMSVerificationLogProms.push(commonTestFun.createTestSMSVerificationLog({
                    tel: phoneNumber,
                    channel: randomCh,
                    platformObjId: testPlatformObjId,
                    platformId: testPlatformId,
                    code: randomCode,
                    delay: 0
                }));
                testSMSLogProms.push(commonTestFun.createTestSMSLog({
                    tel: phoneNumber,
                    channel: randomCh,
                    platform: testPlatformObjId,
                    platformId: testPlatformId,
                    message: randomCode,
                    type: 'player',
                    status: 'success'
                }));
            });

            await Promise.all([testSMSVerificationLogProms, testSMSLogProms]);
        }
        smsLog = randomCode;

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
        clientPlayerAPITest.resetPassword(function (data) {
            data.status.should.equal(200);
            data.data.playerId.should.be.a('string');
            data.data.createTime.should.be.a('string');
            data.data.realName.should.be.a('string');
            data.data.password.should.be.a('string');
        }, {
            platformId: testPlatformId,
            name: testPlayerName,
            smsCode: smsLog,
            phoneNumber: '80808080',
            playerId: testPlayerId,
            oldPassword: testPlayerOldPwd,
            newPassword: randomPWD.toString()
        });
    });

    it('Should update a player sms setting', function () {
        clientPlayerAPITest.updateSmsSetting(function (data) {
            data.status.should.equal(200);
        }, {
            playerId: testPlayerId,
            smsSetting: "mobilePhone"
        });
    });

    it('Should check a player name valid to register and should return false', function () {
        clientPlayerAPITest.isValidUsername(function (data) {
            data.data.should.equal(false);
        }, {name: testPlayerName, platformId: testPlatformId});
    });

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
            data.data.should.be.an('array');
            data.data[0].title.should.be.a('string');
            data.data[0].content.should.be.a('string');
            data.data[0].hasBeenRead.should.be.a('boolean');
            data.data[0].createTime.should.be.a('string');
        },{playerId: testPlayerId});
    });

    it('Should get player unread mail', function () {
        clientPlayerAPITest.getUnreadMail(function (data) {
            data.status.should.equal(200);
            data.data.should.be.an('array');
            data.data[0].title.should.be.a('string');
            data.data[0].content.should.be.a('string');
            data.data[0].hasBeenRead.should.be.a('boolean');
            data.data[0].createTime.should.be.a('string');
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

    it('Should update player', function () {
        clientPlayerAPITest.update(function (data) {
            data.status.should.equal(200);
        },{playerId: testNewPlayerId, gender: testPlayerGender});
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
            data.data.should.be.an('array');
            data.data[0].smsName.should.be.a('string');
            data.data[0].smsId.should.be.a('number');
            data.data[0].status.should.be.a('number');
            data.data[0].settings.should.be.an('array');
        }, {playerId: testPlayerId});
    });

    it('Should manual level up', function () {
        clientPlayerAPITest.manualPlayerLevelUp(function (data) {
            data.status.should.equal(200);
            data.data.should.equal(true);
        },{playerId: testPlayerObjId});
    });

    it('Should verify phone number by SMS code', function () {
        clientPlayerAPITest.verifyPhoneNumberBySMSCode(function (data) {
            console.log('verifyPhoneNumberBySMSCode ==>', data)
            data.status.should.equal(200);
        }, {playerId: {playerId: testPlayerId}, smsCode: smsLog});
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

    // comment it as this api only valid when platformId = 6
    // it('Should login Jbl Show', function () {
    //     clientPlayerAPITest.loginJblShow(function (data) {
    //         console.log('loginJblShow ==>', data)
    //         data.status.should.equal(200);
    //         data.data.url.should.be.a('string');
    //
    //     }, {playerObjId: testPlayerObjId });
    // });

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

        }, {playerId: testPlayerId});
    });

    it('Should Save Client Data', function () {
        clientPlayerAPITest.saveClientData(function (data) {
            data.status.should.equal(200);

        }, {playerId: testPlayerId,
            clientData:"abc"});
    });

    it('Should Call Back To User', function () {
        clientPlayerAPITest.callBackToUser(function (data) {
            data.status.should.equal(200);
            data.data.should.equal(true);

        }, {platformId: testPlatformId,
            phoneNumber: "80808080",
            "randomNumber": "1",
            "captcha": "8353",
            "lineId": "8888",
            playerId: testPlayerId
        });
    });

    it('Should Get OM Captcha', function () {
        clientPlayerAPITest.getOMCaptcha(function (data) {
            data.status.should.equal(200);
            data.data.should.be.an('object');
            data.data.randomNumber.should.be.a('number');
            data.data.b64ImgDataUrl.should.be.a('string');
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
            data.data.list.should.be.an('array');

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
            if (data.status.should.equal(400)) {
                data.errorMessage.should.equal("电话号码已设置");
            } else {
                data.status.should.equal(200);
            }

        }, {playerId: testNewGuestPlayerId, number: "01155555555", smsCode: smsLog});
    });

    it('Should Get Player Login Or Register With SMS', function () {
        clientPlayerAPITest.playerLoginOrRegisterWithSMS(function (data) {
            data.status.should.equal(200);
            data.data.should.be.an('object');

        }, {
            platformId: testPlatformId,
            phoneNumber: "17355544411",
            deviceId: '1111-1111-1111-1111',
            smsCode: smsLog,
            accountPrefix: "testplayer",
            checkLastDeviceId: true,
            referralId: testNewGuestPlayerId
        });
    });

    it('Should Get Phone Number Login With Password', function () {
        clientPlayerAPITest.phoneNumberLoginWithPassword(function (data) {
            data.status.should.equal(200);
            data.data.should.have.property('_id');
        }, {
            platformId: testPlatformId,
            phoneNumber: testPhoneNumber,
            password: "123456"
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

    describe("Test create player by phone number and password", function () {
        before(async function() {
            let testChannel = parseInt(Math.random() * 900 + 100);
            let testCode = parseInt(Math.random() * 9000 + 1000);
            let phoneNumbers1 = [testPhoneNumber, "12345678870", "12345999999"];
            let testSMSVerificationLogProms1 = [];
            let testSMSLogProms1 = [];
            if (phoneNumbers1 && phoneNumbers1.length > 0) {
                phoneNumbers1.forEach(phoneNumber => {
                    testSMSVerificationLogProms1.push(commonTestFun.createTestSMSVerificationLog({
                        tel: phoneNumber,
                        channel: testChannel,
                        platformObjId: testPlatformObjId,
                        platformId: testPlatformId,
                        code: testCode,
                        delay: 0
                    }));
                    testSMSLogProms1.push(commonTestFun.createTestSMSLog({
                        tel: phoneNumber,
                        channel: testChannel,
                        platform: testPlatformObjId,
                        platformId: testPlatformId,
                        message: testCode,
                        type: 'player',
                        status: 'success'
                    }));
                });

                await Promise.all([testSMSVerificationLogProms1, testSMSLogProms1]);
            }
            smsCode = testCode;
        });

        it('Should create test player by phone number and password', function (done) {
            clientPlayerAPITest.registerByPhoneNumberAndPassword(function(data) {
                data.status.should.equal(200);
                data.data.should.have.property('_id');
                done();
            }, {
                platformId: testPlatformId,
                phoneNumber: "12345678870",
                smsCode: smsCode,
                accountPrefix: "testplayer",
                password: "888888"
            });
        });

        it('Should login test player by phone number and password', function () {
            clientPlayerAPITest.loginByPhoneNumberAndPassword(function (data) {
                data.status.should.equal(200);
                data.data.should.have.property('_id');
            }, {
                platformId: testPlatformId,
                phoneNumber: testPhoneNumber,
                password: "123456"
            });
        });

        it('Should update test player password by phone number', function () {
            clientPlayerAPITest.updatePasswordByPhoneNumber(function (data) {
                data.status.should.equal(200);
                data.data.should.have.property('_id');
            }, {
                platformId: testPlatformId,
                phoneNumber: testPhoneNumber,
                newPassword: "123456",
                smsCode: smsLog
            });
        });

        let testGuestPlayer;
        let testGuestPlayerId;
        before(function(done){
            clientPlayerAPITest.createGuestPlayer(function(data) {
                data.status.should.equal(200);
                data.data.should.have.property('_id');
                testGuestPlayer = data;
                testGuestPlayerId = data.data.playerId;
                done();
            }, {
                platformId: testPlatformId,
                captcha: 'testCaptcha',
                isTestPlayer: true,
                guestDeviceId: "9999-9999-9999-9999-9999"
            });
        })

        it('Should set test guest player phone number and password', function(done){
            clientPlayerAPITest.setPhoneNumberAndPassword(function (data) {
            }, {
                playerId: testGuestPlayerId,
                phoneNumber: "12345999999",
                password: "123456",
                smsCode: smsCode
            });
            done();
        });
    });

    after(async function () {
        // remove all test data
        let removeTestDataProm = commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]);
        let removeTestProposalData = commonTestFun.removeTestProposalData([] , testPlatformObjId, [], [testPlayerObjId]);
        let finished = await Promise.all([removeTestDataProm, removeTestProposalData]);

        //
        client.disconnect();
    });

});

