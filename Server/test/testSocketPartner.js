var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var rewardEventGenerator = require("./../test_modules/rewardEventGenerator.js");
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test socket partner", function () {

    var testPartnerName = null;
    var testPartnerObjId = null;

    var testPlatformName = "";
    var testPlatformDescription = "testPlatformDescription";
    var testPlatformObjId = null;
    var resetPassword = null;

    /* Test 1 - create a new platform before the creation of a new player */

    it('Should create test API platform', function (done) {

        commonTestFunc.createTestPlatform().then(
            function (data) {
                testPlatformObjId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    /* Test 2- create partner users */
    it('Should create partner', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            testPartnerName = "testpartner" + date;
            realName = "realname" + date; // added

            var createPartner = {
                "partnerName": testPartnerName,
                "realName": realName, // added
                "email": "testPartner123@gmail.com",
                "password": "123456",
                "platform": testPlatformObjId,
                "bankAccount": "235-18765-1"
            };
            socket.emit('createPartner', createPartner);
            socket.once('_createPartner', function (data) {
                socket.close();
                if (data.success && data.data) {
                    testPartnerObjId = data.data._id;
                    data.data.partnerName.should.equal(testPartnerName);
                    done();
                }
            });
        });
    });

    var childPartnerId = null;
    /* Test 2- create partner users */
    it('Should create partner with parent', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            var testPartnerName1 = "testpartner" + date;
            realName = "realname" + date; // added

            var createPartner = {
                "partnerName": testPartnerName1,
                "realName": realName, // added
                "email": "testPartner123@gmail.com",
                "password": "123456",
                "platform": testPlatformObjId,
                "bankAccount": "235-18765-1",
                parent: testPartnerObjId
            };
            socket.emit('createPartnerWithParent', createPartner);
            socket.once('_createPartnerWithParent', function (data) {
                socket.close();
                if (data.success && data.data) {
                    childPartnerId = data.data._id;
                    data.data.parent.should.equal(testPartnerObjId);
                    done();
                }
            });
        });
    });

    /* Test 3 - find partner users */
    it('Should find children partners', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryPartner = {
                "_ids": [childPartnerId]
            };
            socket.emit('getChildrenPartner', queryPartner);
            socket.once('_getChildrenPartner', function (data) {

                socket.close();
                if (data.success && data.data) {
                    data.data.length.should.equal(1);
                    done();
                }
            });
        });
    });

    /* Test 3 - find partner users */
    it('Should find partner', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryPartner = {
                "_id": testPartnerObjId
            };
            socket.emit('getPartner', queryPartner);
            socket.once('_getPartner', function (data) {

                socket.close();
                if (data.success && data.data) {
                    data.data.partnerName.should.containEql(testPartnerName);
                    done();
                }
            });
        });
    });
    /* Test 3 - update partner users */
    it('Should update partner', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var updatePartner = {
                email: "updateTestPartner@test.com"
            };

            socket.emit('updatePartner', {query: {_id: testPartnerObjId}, updateData: updatePartner});
            socket.once('_updatePartner', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    it('Should find partners by advanced query', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var partnerQuery = {
                platformId: testPlatformObjId,
                query: {
                    partnerName: testPartnerName,
                    bankAccount: "235-18765-1"
                    //partnerId: "xxxxxx",
                    //level: 3}
                }
            };
            socket.emit('getPartnersByAdvancedQuery', partnerQuery);
            socket.once('_getPartnersByAdvancedQuery', function (data) {
                socket.close();
                if (data.success && data.data) {
                    done();
                }
            });
        });
    });

    it('Should resest the partner password', function (done) {

        socketConnection.createConnection().then(function (socket) {
            var partnerQuery = {
                _id: testPartnerObjId
            };
            socket.emit('resetPartnerPassword', partnerQuery);
            socket.once('_resetPartnerPassword', function (data) {
                socket.close();
                if (data.success) {
                    resetPassword = data.data;
                    done();
                }
            });
        });
    });

    /* Test 5 - find partners by a platform */
    it('Should find partners By platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryPartner = {
                "platform": testPlatformObjId
            };
            socket.emit('getPartnersByPlatform', queryPartner);

            socket.once('_getPartnersByPlatform', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should created test player for partner', function (done) {
        var date = new Date().getTime();
        var playerData = {
            name: "testplayer" + date,
            platform: testPlatformObjId,
            password: "123456",
            partner: testPartnerObjId,
            topUpSum: 200,
            phoneNumber: "111" + date // added
        };
        dbPlayerInfo.createPlayerInfo(playerData).then(
            function (data) {
                if (data) {
                    done();
                }
            },
            function(error){
                console.log(error);
            }
        );
    });

    it('Should find referral players for partner', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryPartner = {
                partnerObjId: testPartnerObjId
            };
            socket.emit('getPartnerReferralPlayers', queryPartner);

            socket.once('_getPartnerReferralPlayers', function (data) {
                socket.close();
                if (data.success && data.data.length > 0) {
                    done();
                }
            });
        });
    });

    it('Should find active players for partner', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryPartner = {
                partnerObjId: testPartnerObjId
            };
            socket.emit('getPartnerActivePlayersForPastWeek', queryPartner);

            socket.once('_getPartnerActivePlayersForPastWeek', function (data) {
                socket.close();
                if (data.success && data.data.length > 0) {
                    done();
                }
            });
        });
    });

    it('Should find valid players for partner', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryPartner = {
                partnerObjId: testPartnerObjId
            };
            socket.emit('getPartnerValidPlayers', queryPartner);

            socket.once('_getPartnerValidPlayers', function (data) {
                socket.close();
                if (data.success && data.data.length > 0) {
                    done();
                }
            });
        });
    });

    /* Test 4 - delete partner users */
    it('Should delete partner', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var players = {
                _ids: [testPartnerObjId]
            };
            socket.emit('deletePartnersById', players);
            socket.once('_deletePartnersById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformObjId).then(function(data){
            done();
        })
    });
});