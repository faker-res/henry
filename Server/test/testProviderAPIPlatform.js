var should = require('should');
var WebSocketClient = require('../server_common/WebSocketClient');

var PlatformService = require('../services/provider/ProviderServices').PlatformService;
var PlatformAPITest = require('../testAPI/providerAPITest/PlatformAPITest');

var ConnectionService = require('../services/provider/ProviderServices').ConnectionService;
var ConnectionAPITest = require('../testAPI/providerAPITest/ConnectionAPITest');

var constGameStatus = require("./../const/constGameStatus");
var commonTestFunc = require('../test_modules/commonTestFunc');
var env = require("../config/env").config();

var testPlatformObjId = null;
var testPlatformId = null;

var testPlayerId = null;
var testPlayerObjId = null;
var testPlayerName = null;

var testProviderId = null;
var testProviderObjId = null;

var testGameObjId = null;
var testGameId = null;
var testGameName = 'testGameName';

describe("Test Provider API - Game Service", function () {

    var client = new WebSocketClient(env.providerAPIServerUrl);
    var platformService = new PlatformService();
    client.addService(platformService);
    var platformAPITest = new PlatformAPITest(platformService);

    var connectionService = new ConnectionService();
    client.addService(connectionService);
    var connectionAPITest = new ConnectionAPITest(connectionService);

    it('Should create test API player and platform', function (done) {

        commonTestFunc.createTestPlatform().then(
            function (data) {

                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                done();

            },
            function (error) {
                console.error("platform",error);
            }
        );
    });


    it('Should create test provider', function (done) {

        commonTestFunc.createTestGameProvider().then(
            function (data) {
                testProviderObjId = data._id;
                testProviderId = data.providerId;
                done();
            },
            function (error) {
                console.error(error);
            });
    });

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

    it('Should get platform list', function (done) {

        platformAPITest.getPlatformList(function (data) {
            data.status.should.equal(200);
            done();
        }, {} );
    });

    it('Should get platform', function (done) {

        platformAPITest.getPlatform(function (data) {
            data.data.platformId.should.equal(testPlatformId);
            done();
        }, {platformId: testPlatformId} );
    });


     it('Should addProviderToPlatform', function (done) {

         var providerData = {platformId: testPlatformId,
             providerId: testProviderId,
             providerNickName: "PPP",
             providerPrefix: "QQQ"
         };
         platformAPITest.addProvider(function (data) {
             data.status.should.equal(200);
         done();
         }, providerData );
     });

    it('Should removeProviderFromPlatform', function (done) {

        var providerData =  {platformId: testPlatformId,
            providerId: testProviderId
        };
        platformAPITest.removeProvider(function (data) {
            data.status.should.equal(200);
            done();
        }, providerData);
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformObjId, []).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestProposalData([], testPlatformObjId, [], []).then(function(data){
            done();
        })
    });


});