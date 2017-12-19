var should = require('should');
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

    it('Should create test API player and platform', function (done) {

        commonTestFun.createTestPlatform().then(
            function (data) {

                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                return commonTestFun.createTestPlayer(testPlatformObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testPlayerName = data.name;
                testPlayerObjId = data._id;
                testPlayerId = data.playerId;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });
    //// Init player Data - End ///////

    it('Should create a connection', function (done) {
        client.connect();
        client.addEventListener("open", function () {
            done();
        });
    });

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

    it('Should create a test player', function (done) {
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
        clientPlayerAPITest.create(function (data) {
            //console.log(data);
            data.data.name.should.endWith(testNewPlayerName);
            //data.data.email.should.equal("testPlayer123@gmail.com");
            testNewPlayerId = data.data.playerId;
            done();
        }, newPlayerData);
    });


    it('Should login apiUser', function (done) {
        const testPlayerLoginData = {
            name: testPlayerName,
            password: "123456",
            lastLoginIp: "192.168.3.22",
            platformId: testPlatformId
        };
        clientPlayerAPITest.login(function (data) {
            token = data.token;
            data.data.name.should.equal(testPlayerName);
            done();
        }, testPlayerLoginData);
    });


    it('Should return true - test player isLogin', function (done) {
        clientPlayerAPITest.isLogin(function (data) {
            data.data.should.equal(true);
            done();
        }, {playerId: testPlayerId});
    });

    //todo::add env config for server url
    it('Should get a test player', function (done) {
        clientPlayerAPITest.get(function (data) {
            data.status.should.equal(200);
            done();
        }, {playerId: testPlayerId});
    });

    it('Should update a player sms setting', function (done) {
        clientPlayerAPITest.updateSmsSetting(function (data) {
            data.status.should.equal(200);
            done();
        }, {
            playerId: testPlayerId,
            smsSetting: "mobilePhone"
        });
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

    it('Should check a player name valid to register and should return false', function (done) {
        clientPlayerAPITest.isValidUsername(function (data) {
            data.data.should.equal(false);
            done();
        }, {name: testPlayerName, platformId: testPlatformId});
    });


    it('Should authenticate the token from previous login', function (done) {
        clientPlayerAPITest.authenticate(function (data) {
            data.status.should.equal(200);
            done();
        }, {playerId: testPlayerId, token: token});
    });

    it('Should update photo url', function (done) {
        clientPlayerAPITest.updatePhotoUrl(function (data) {
            data.status.should.equal(200);
            done();
        }, {
            photoUrl: "http://facebook.com/aaa/bbb"
        });
    });

    it('Should get player Credit Balance', function (done) {
        clientPlayerAPITest.getCreditBalance(function (data) {
            data.status.should.equal(200);
            done();
        });
    });


    it('Should get player weekly status', function (done) {
        clientPlayerAPITest.getPlayerWeekStatus(function (data) {
            data.status.should.equal(200);
            done();
        });
    });

    it('Should get player Monthly status', function (done) {
        clientPlayerAPITest.getPlayerMonthStatus(function (data) {
            data.status.should.equal(200);
            done();
        });
    });

    it('Should get player mailing list', function (done) {
        clientPlayerAPITest.getMailList(function (data) {
            data.status.should.equal(200);
            done();
        });
    });


    it('Should do player Quick Registration', function (done) {
        dbconfig.collection_players.remove({name: testQuickPlayerName});

        clientPlayerAPITest.playerQuickReg(function (data) {
            data.data.name.should.endWith(testQuickPlayerName);
            done();
        }, {
            "name": testQuickPlayerName,
            "email": "testPlayer123@gmail.com",
            "realName": "testPlayerRealName",
            "password": "123456",
            "platformId": testPlatformId,
            "phoneNumber": "97787654",
        });
    });

    it('Fail in updating player password', function (done) {
        clientPlayerAPITest.updatePassword(function (data) {
            data.status.should.equal(400);
            done();
        }, {
            playerId: testPlayerId,
            oldPassword: '123456',
            newPassword: '5678'
        });
    });

    it('Success in updating player password', function (done) {
        clientPlayerAPITest.updatePassword(function (data) {
            data.status.should.equal(200);
            done();
        }, {
            playerId: testPlayerId,
            oldPassword: '123456',
            newPassword: '567891'
        });
    });

    it('Should logout the player', function (done) {
        clientPlayerAPITest.logout(function (data) {
            data.status.should.equal(200);
            done();
        }, {playerId: testPlayerId});
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([] , testPlatformObjId, [], [testPlayerObjId]).then(function(data){
            done();
        })
    });

    it('Should show player withdrawal info', function (done) {
        clientPlayerAPITest.getWithdrawalInfo(function (data) {
            done();
        }, {platformId: testPlatformId});
    });

    //notifyNewMail
    //sendPlayerMailFromPlayerToAdmin

});

