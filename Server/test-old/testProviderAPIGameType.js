var should = require('should');
var WebSocketClient = require('../server_common/WebSocketClient');

var ConnectionService = require('../services/provider/ProviderServices').ConnectionService;
var ConnectionAPITest = require('../testAPI/providerAPITest/ConnectionAPITest');

var GameTypeService = require('../services/provider/ProviderServices').GameTypeService;
var GameTypeAPITest = require('../testAPI/providerAPITest/GameTypeAPITest');

var env = require("../config/env").config();

var date = Date.now();
var testGameTypeCode = 'testGameTypeCode' + date;
var testGameTypeName = 'testGameTypeName' + date;
var testGameTypeName2 = 'testGameTypeName2' + date;
var testGameTypeCode2 = 'testGameTypeCode2' + date;

describe("Test Provider API - Game Type Service", function () {

    var client = new WebSocketClient(env.providerAPIServerUrl);

    var connectionService = new ConnectionService();
    client.addService(connectionService);
    var connectionAPITest = new ConnectionAPITest(connectionService);

    var gameTypeService = new GameTypeService();
    client.addService(gameTypeService);
    var gameTypeAPITest = new GameTypeAPITest(gameTypeService);

    it('Create a connection', function (done) {
        client.connect();
        client.addEventListener("open", function () {
            done();
        });
    });

    it('Log in apiUser', function (done) {
        connectionAPITest.login(function (data) {
            done();
        });
    });

    it('should create a gametype', done => {
        gameTypeAPITest.add(
            data => {
                data.status.should.equal(200);
                data.data.code.should.equal(testGameTypeCode);
                data.data.name.should.equal(testGameTypeName);
                data.data.description.should.equal('___');
                done();
            },
            {
                gameTypeId: testGameTypeCode,
                code: testGameTypeCode,
                name: testGameTypeName,
                description: '___'
            }
        );
    });

    it("should update a gametype's name", done => {
        gameTypeAPITest.update(
            data => {
                data.status.should.equal(200);
                data.data.code.should.equal(testGameTypeCode);
                data.data.name.should.equal(testGameTypeName2);
                data.data.description.should.equal('___');
                done();
            },
            {
                gameTypeId: testGameTypeCode,
                name: testGameTypeName2
            }
        );
    });

    it("should update a gametype's description", done => {
        gameTypeAPITest.update(
            data => {
                data.status.should.equal(200);
                data.data.code.should.equal(testGameTypeCode);
                data.data.name.should.equal(testGameTypeName2);
                data.data.description.should.equal("xxxxx");
                done();
            },
            {
                gameTypeId: testGameTypeCode,
                description: "xxxxx"
            }
        );
    });

    it("should modify a gametype's code", done => {
        gameTypeAPITest.modifyCode(
            data => {
                data.status.should.equal(200);
                data.newCode.should.equal(testGameTypeCode2);
                testGameTypeCode = testGameTypeCode2;
                done();
            },
            {
                oldCode: testGameTypeCode,
                newCode: testGameTypeCode2
            }
        );
    });

    it('should offer a list of existing gametypes', done => {
        gameTypeAPITest.getGameTypeList(
            data => {
                data.status.should.equal(200);
                data.data.length.should.be.greaterThan(0);
                var testGT = data.data.filter(gameType => gameType.code === testGameTypeCode)[0];
                testGT.name.should.equal(testGameTypeName2);
                testGT.description.should.equal("xxxxx");
                testGameTypeCode = testGameTypeCode2;
                done();
            },
            null
        );
    });

    it('should delete a gametype', done => {
        gameTypeAPITest.delete(
            data => {
                data.status.should.equal(200);
                // Check it has been removed from the list
                gameTypeAPITest.getGameTypeList(
                    data => {
                        var filteredList = data.data.filter(gameType => gameType.gameTypeId === testGameTypeCode);
                        filteredList.length.should.equal(0);
                        done();
                    },
                    null
                );
            },
            {
                gameTypeId: testGameTypeCode
            }
        );
    });

});
