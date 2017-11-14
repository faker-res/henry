var should = require('should');
var dbconfig = require('../modules/dbproperties');
var WebSocketClient = require('../server_common/WebSocketClient');
var ProposalService = require('../services/payment/PaymentServices').ProposalService;
var ProposalAPITest = require('../testAPI/paymentAPITest/ProposalAPITest');

var ConnectionService = require('../services/payment/PaymentServices').ConnectionService;
var ConnectionAPITest = require('../testAPI/paymentAPITest/ConnectionAPITest');

var env = require("../config/env").config();

var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbPlatform = require('../db_modules/dbPlatform');
var dbPaymentChannel = require('../db_modules/dbPaymentChannel');
var dbPlayerTopUpIntentRecord = require('../db_modules/dbPlayerTopUpIntentRecord');
var dbProposalType = require('../db_modules/dbProposalType');
var constProposalType = require('./../const/constProposalType');
var commonTestFun = require('../test_modules/commonTestFunc');
var clientApiInstances = require('../modules/clientApiInstances');

var testPlatformName = 'unittestPaymentApi_platformName';
var testPlayerName = null;
var paymentChannelName = 'unittestpaymentChannelName';
var topUpAmount = 260;

var testPlatformObjId = null;
var testPlatformId = null;
var testPlayerObjId = null;
var testPlayerId = null;
var proposalTypeId = null;
var proposalTypeId2 = null;
var proposalId = null;
var proposalId2 = null;
var bonusId = null;
var bonusProposalId = null;
var bonusProposalId2 = null;

describe("Test Payment API - Proposal Service", function () {

    var client = new WebSocketClient(env.paymentAPIServerUrl);

    var proposalService = new ProposalService();
    client.addService(proposalService);
    var proposalAPITest = new ProposalAPITest(proposalService);

    var connectionService = new ConnectionService();
    client.addService(connectionService);
    var connectionAPITest = new ConnectionAPITest(connectionService);

    it("Should create payment API client and store in serverInstance for global usage", function () {
        // Although commonTestFunc does create the payment API, it does not wait until the client is ready.
        // So here we get hold of a promise.  This will ensure the tests don't run before the client is ready.
        // Of course this only matters when creating a 'real' client.  The 'mock' client is created instantly.
        return clientApiInstances.createPaymentAPI('mock');
    });

    //// Init Proposal Data - Start ///////
    it('Should create test API player and platform', function () {
        return commonTestFun.createTestPlatform().then(
            function (data) {
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                return commonTestFun.createTestPlayer(testPlatformObjId);
            }
        ).then(
            function (data) {
                testPlayerName = data.name;
                testPlayerObjId = data._id;
                testPlayerId = data.playerId;
            }
        );
    });

    it('Should create test payment channel', function () {
        return commonTestFun.createTestPaymentChannel().then(
            function (data) {
                testChannelId = data.channelId;
            }
        );
    });

    it('Should create topUp Proposal - One', function () {
        var topUpData = {
            playerId: testPlayerId,
            topUpAmount: topUpAmount,
            topupChannel: testChannelId
        };

        return dbPlayerTopUpIntentRecord.generateProposalIDfromTopupIntention(topUpData).then(
            function (data) {
                proposalId = data.proposalId;
                proposalTypeId = data.type;
            }
        ).then(function (data) {
                //console.log('Approve TopUp Proposal', data);
                done();
            },
            function (error) {
                console.log({'topUp Success': error});
            }
        )
    });

    // it('Should create topUp Proposal - Two', function () {
    //     var topUpData = {
    //         playerId: testPlayerId,
    //         topUpAmount: topUpAmount,
    //         topupChannel: testChannelId
    //     };
    //
    //     return dbPlayerTopUpIntentRecord.generateProposalIDfromTopupIntention(topUpData).then(
    //         function (data) {
    //             proposalId2 = data.proposalId;
    //             proposalTypeId2 = data.type;
    //
    //         }
    //     )
    // });

    //todo:: re-eanble after pms api integration
    //return;
    
    it('Should get bonusId', function () {
        return dbPlayerInfo.getBonusList(0, 5).then(
            function (data) {
                //console.log('getBonusList response:', data);
                data.bonuses.should.be.an.Array;
                bonusId = data.bonuses[0].bonus_id;
            }
        );
    });

    //todo::enable later
    // it('Should applyBonus - One', function () {
    //     var amount = 200;
    //
    //     return dbPlayerInfo.applyBonus(testPlayerId, bonusId, amount).then(
    //         function (data) {
    //             bonusProposalId = data.proposalId;
    //         }
    //     )
    // });
    //
    // it('Should applyBonus - Two', function () {
    //     var amount = 300;
    //
    //     return dbPlayerInfo.applyBonus(testPlayerId, bonusId, amount).then(
    //         function (data) {
    //             bonusProposalId2 = data.proposalId;
    //
    //         }
    //     )
    // });
    //// Init Proposal Data - End ///////

    it('Should create a connection', function (done) {
        client.connect();
        client.addEventListener("open", function () {
            done();
        });
    });


    it('Should login apiUser', function (done) {
        connectionAPITest.login(function (data) {
            done();
        });
    });

    // it('Should update topUp proposal status Success ', function (done) {
    //     proposalAPITest.topupSuccess(function (data) {
    //         data.status.should.equal(200);
    //         done();
    //     }, {
    //         playerId: testPlayerId,
    //         proposalId: proposalId,
    //         amount: topUpAmount
    //     });
    // });


    // it('Should update topUp proposal status Fail', function (done) {
    //     proposalAPITest.topupFail(function (data) {
    //         //console.log('topupFail', data);
    //         data.status.should.equal(200);
    //         done();
    //     }, {proposalId: proposalId2});
    // });

    //todo::enable later
    // it('Should  update bonus proposal status Success', function (done) {
    //     proposalAPITest.applyBonusSuccess(function (data) {
    //         //console.log('applyBonusSuccess', data);
    //         data.status.should.equal(200);
    //         done();
    //     }, {proposalId: bonusProposalId});
    // });
    //
    //
    // it('Should update bonus proposal status Fail', function (done) {
    //     proposalAPITest.applyBonusFail(function (data) {
    //         //console.log('applyBonusFail', data);
    //         data.status.should.equal(200);
    //         done();
    //     }, {proposalId: bonusProposalId2});
    // });

    it('Should remove all test Data', function(){
        return commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]);
    });


    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([] , testPlatformObjId, [proposalTypeId,proposalTypeId2], [testPlayerObjId]).then(function(data){
            done();
        })
    });


});
