var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var constProposalStatus = require('../const/constProposalStatus');
var commonTestFun = require('../test_modules/commonTestFunc');

var PLATFORM_PREFIX_SEPARATOR = '';

describe("Test Report", function () {

    var testPlatformName = "testClientPlatform";
    var testPlatformPrefix = null;
    var testPlatformObjId = null;

    var testProposalTypeId = null;
    var testPlayerName = "testclientplayer";
    var testPlayerObjId = null;
    var testPlayerId = null;
    var testPlayerPlatformObjId = null;
    var testProviderObjId = null;

    it('Should get platform', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var inputPlatform = {
                name: testPlatformName
            };
            socket.emit('getPlatform', inputPlatform);
            socket.once('_getPlatform', function (data) {
                socket.close();
                if (data.success) {
                    testPlayerPlatformObjId = testPlatformObjId = data.data._id;
                    testPlatformPrefix = data.data.prefix;
                    done();
                }
            });
        });
    });

    //get ProposalTypeID
    it('Should get proposalType', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var query = {
                platformId: testPlatformObjId
            };
            socket.emit('getProposalTypeByPlatformId', query);
            socket.once('_getProposalTypeByPlatformId', function (data) {
                socket.close();
                if (data.success) {
                    for (var i = 0; i < data.data.length; i++) {
                        if (data.data[i].name == "PlayerTopUp") {
                            testProposalTypeId = data.data[i]._id
                        }
                    }
                    //testProposalTypeId = data.data[5]._id;
                    done();
                }
            });
        });
    });

    it('Should find player', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryPlayer = {
                "name": testPlatformPrefix + PLATFORM_PREFIX_SEPARATOR + testPlayerName
            };
            socket.emit('getPlayerInfo', queryPlayer);
            socket.once('_getPlayerInfo', function (data) {
                socket.close();
                if (data.success && data.data) {
                    testPlayerObjId = data.data._id;
                    testPlayerId = data.data.playerId;
                    //testPlayerPlatformObjId = data.data.platform;
                    done();
                }
            });
        });
    });
    it('Should find provider', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var query = {
                "name": "testClientProvider"
            };
            socket.emit('getGameProvider', query);
            socket.once('_getGameProvider', function (data) {
                socket.close();
                if (data.success && data.data) {
                    testProviderObjId = data.data._id;
                    done();
                }
            });
        });
    });

    it('Should add a Provider to a Platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var addProviderToPlatformData = {
                platformId: testPlayerPlatformObjId,
                providerId: testProviderObjId,
                providerNickName: 'Nick',
                providerPrefix: 'PF'
            };
            socket.emit('addProviderToPlatformById', addProviderToPlatformData);
            socket.once('_addProviderToPlatformById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    //todo::update this unit test later 
    // it('Should test proposal report', function (done) {
    //
    //     socketConnection.createConnection().then(function (socket) {
    //         socket.connected.should.equal(true);
    //
    //         var d = new Date();
    //         var n = d.toISOString();
    //         var dt = new Date("01 Jan 2016 15:05 UTC");
    //
    //         var data = {
    //             proposalTypeId: testProposalTypeId, // the input from client interface
    //             status: constProposalStatus.PENDING,
    //             startTime: new Date('2015-01-01'),
    //             endTime: new Date('2016-12-30')
    //             //creator:  { adminName: "xxxxx", playerName: "xxxx"} // either of one
    //         };
    //         socket.emit('getProposalStaticsReport', data);
    //         socket.once('_getProposalStaticsReport', function (data) {
    //             socket.close();
    //             if (data.success) {
    //                 // console.log("_getProposalStaticsReport:", data);
    //                 done();
    //             }
    //         });
    //
    //     });
    // });

    it('Should test accumulated consumption report of a player in a provider', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var query = {
                platformId: testPlatformObjId,
                playerId: testPlayerId,  // "5705fc9e1d92130c39985dcd",
                providerId: testProviderObjId, //"5705fc9e1d92130c39985dce",
                startTime: "2016-04-01T00:00:00z",
                endTime: "2016-04-10T00:00:00z"
            };
            socket.emit('getPlayerProviderReport', query);
            socket.once('_getPlayerProviderReport', function (data) {
                socket.close();
                if (data.success) {
                    //console.log("_playerProviderReport:", data);
                    //done();
                }
                done();
            });
        })
    });


    it('Should test accumulated consumption report of a player by game in a provider', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var query = {
                playerId: testPlayerObjId, //"57077b8a6d7d670f56e1fb32", //"5705fc9e1d92130c39985dcd", // ,
                providerId: testProviderObjId, // "57077b8a6d7d670f56e1fb2f", //"5705fc9e1d92130c39985dce",
                startTime: "2016-04-01T00:00:00z",
                endTime: "2016-04-10T00:00:00z"
            };
            socket.emit('getPlayerProviderByGameReport', query);
            socket.once('_getPlayerProviderByGameReport', function (data) {
                socket.close();
                if (data.success) {
                    //console.log("_playerProviderByGameReport:", data);
                    // done();
                }
                done();
            });
        })
    });


    it('Should remove all test Data', function(done) {
        commonTestFun.removeTestData(testPlatformObjId, []).then(function (data) {
            done();
        })
    });


    it('Should remove all test Data', function(done) {
        commonTestFun.removeTestProposalData([], testPlatformObjId, [testProposalTypeId], []).then(function (data) {
            done();
            })
        });

});