var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test platform", function () {

    var formName="";
    var description = "testPlatformDescription";
    var testPlatformObjId = null;
    var testPlatformObjId2 = null;
    var newDepartmentName = null;
    var newDepartmentId = null;

    var gameProviderObjId = null;

    /*  Create a game Provider */
    it('Should create the game Provider', function (done) {
        commonTestFunc.createTestGameProvider().then(
            function (data) {
                gameProviderObjId = data._id;
                //testProviderId = data.providerId;
                done();
            },
            function (error) {
                console.error(error);
            });

    });

    it('Should create related departments', function (done) {

        commonTestFunc.createTestDepartment().then(
            function (data) {
                newDepartmentId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    //////////////////  Unit Test starts here //////
    /* Test 1 - create a new platform */
    it('Should create a new platform', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            formName = "testPlatform" + date;

            var inputPlatform = {
                name: formName,
                description: description,
                gameProviders: [gameProviderObjId],
                dailySettlementHour: 2,
                dailySettlementMinute: 20,
                code: new Date().getTime()
            };

            socket.emit('createPlatform', inputPlatform);
            socket.once('_createPlatform', function (data) {
                socket.close();
                if (data.success) {
                    testPlatformObjId = data.data._id;
                    data.data.name.should.containEql(formName);
                    done();
                }
            });
        });
    });

    /* Test 2 - get into of the platform */
    it('Should get platform', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            formName = "testPlatform" + date;

            var inputPlatform = {
                _id: testPlatformObjId
            };

            socket.emit('getPlatform', inputPlatform);
            socket.once('_getPlatform', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 3 - create a new platform - two */
    it('Should create a new platform - two', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            formName = "testPlatform-two" + date;

            var inputPlatform = {
                name: formName,
                description: description,
                code: new Date().getTime()
            };

            socket.emit('createPlatform', inputPlatform);
            socket.once('_createPlatform', function (data) {
                socket.close();
                if (data.success) {
                    testPlatformObjId2 = data.data._id;
                    data.data.name.should.containEql(formName);
                    done();
                }
            });
        });
    });

    /* Test 4 - update a new platform */
    it('Should update a platform', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            var updatePlatform = {
                description: description + date
            };

            socket.emit('updatePlatform', {query: {name: formName}, updateData: updatePlatform});
            socket.on('_updatePlatform', function (data) {
                socket.removeAllListeners('_updatePlatform');
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 5 - search a new platform */
    it('Should search a platform', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var inputPlatform = {
                name: formName
            };
            socket.emit('getPlatform', inputPlatform);
            socket.on('_getPlatform', function (data) {
                socket.removeAllListeners('_searchPlatform');
                socket.close();
                if (data.success) {
                    //data.data.platformName.should.containEql(formName);
                    done();
                }
            });
        });
    });

    /* Test 6 - Search all Platform */
    it('Should search all platforms', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getAllPlatforms', {});
            socket.once('_getAllPlatforms', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 8 - add a platform to  department */
    it('Should add platforms to  department', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var addPlatformToDeptData = {
                departmentId : newDepartmentId,
                platformIds :[ testPlatformObjId ,testPlatformObjId2 ] ,

            };
            socket.emit('addPlatformsToDepartmentById', addPlatformToDeptData);
            socket.once('_addPlatformsToDepartmentById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    /* Test 9 - remove a platform from department */
    it('Should remove platforms from department', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var removePlatformDeptData = {
                departmentId : newDepartmentId,
                platformIds : [testPlatformObjId ,testPlatformObjId2]

            };
            socket.emit('removePlatformsFromDepartmentById', removePlatformDeptData);
            socket.once('_removePlatformsFromDepartmentById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });


    /* Test 14 - delete platform  */
    it('Should delete platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var platform = {
                _ids: [testPlatformObjId]
            };
            socket.emit('deletePlatformById', platform);
            socket.once('_deletePlatformById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });
    /* Test 15 - delete platform  2*/
    it('Should delete platform 2', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var platform = {
                _ids: [testPlatformObjId2]
            };
            socket.emit('deletePlatformById', platform);
            socket.once('_deletePlatformById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });
    /* Test 16 - delete a gameProvider  */
    it('Should delete gameProvider', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('deleteGameProvider', {_id: gameProviderObjId});
            socket.once('_deleteGameProvider', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });
    /* Test 17 - delete a department  */
    it('Should delete departments', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('deleteDepartmentsById', {_ids:[newDepartmentId]});
            socket.once('_deleteDepartmentsById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });



});
