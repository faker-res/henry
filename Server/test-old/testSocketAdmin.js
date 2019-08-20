var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test socket admin APIs", function () {

    var testAdminName = null;
    var testAdminId = null;
    var testDepartmentId = null;

    /* Test 1 - create admin users */ // working fine
    it('Should create admin user', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            testAdminName = "step1admin" + date;

            var createUser = {
                "adminName": testAdminName,
                "email": "testUser123@gmail.com",
                "firstName": "testUserFirstName",
                "lastName": "testUserLastName",
                "password": "123",
                "accountStatus": 1
            };

            socket.emit('createAdmin', createUser);
            socket.once('_createAdmin', function (data) {
                socket.close();
                if (data.success && data.data) {
                    testAdminId = data.data._id;
                    data.data.adminName.should.equal(testAdminName);
                    done();
                }
            });
        });
    });

    /* Test 2 - find admin users */
    it('Should find admin user', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryUser = {
                "adminName": testAdminName
            };
            socket.emit('getAdminInfo', queryUser);

            socket.once('_getAdminInfo', function (data) {
                socket.close();
                if (data.success && data.data) {
                    data.data.adminName.should.containEql(testAdminName);
                    done();
                }
            });
        });
    });

    /* test 3 - */
    it('Should update admin user', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var updateUser = {};
            updateUser.email = "updateAdminUser@test.com";

            socket.emit('updateAdmin', {query: {adminName: testAdminName}, updateData: updateUser});
            socket.once('_updateAdmin', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    /* test 4 - */
    it('Should get full admin info', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryUser = {
                "adminName": testAdminName
            };
            socket.emit('getFullAdminInfo', queryUser);
            socket.once('_getFullAdminInfo', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* it should get all roles  */
    it('Should get all roles not attached to current admin', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryUser = {
                "adminName": testAdminName
            };

            socket.emit('getAdminInfo', queryUser);

            socket.once('_getAdminInfo', function (data) {

                if (data.success && data.data) {

                    socket.emit('getUnAttachedRolesforAdmin', data.data);
                    socket.once('_getUnAttachedRolesforAdmin', function (data) {
                        socket.close();

                        if (data.success) {

                            done();
                        }
                    });
                }
            });

        });
    });

    /* it should get roles attached to an admin */
    it('Should get all roles  attached to current admin', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryUser = {
                "adminName": "admin"
            };
            socket.emit('getAdminInfo', queryUser);

            socket.once('_getAdminInfo', function (data) {
                if (data.success && data.data) {

                    socket.emit('getAttachedRolesforAdmin', data.data);
                    socket.once('_getAttachedRolesforAdmin', function (data) {
                        socket.close();
                        if (data.success) {
                            done();
                        }
                    });
                }
            });
        });
    });

    it('Should get all departments not attached to current admin', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryUser = {
                _id: testAdminId
            };

            socket.emit('getUnAttachedDepartmentsforAdmin', queryUser);
            socket.once('_getUnAttachedDepartmentsforAdmin', function (data) {
                socket.close();

                if (data.success) {
                    done();
                }
            });

        });
    });

    it('Should delete admin info', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryUser = {
                _ids: [testAdminId]
            };
            socket.emit('deleteAdminInfosById', queryUser);
            socket.once('_deleteAdminInfosById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });



    it('create test department', function (done) {

        commonTestFunc.createTestDepartment().then(
            function (data) {
                testDepartmentId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create admin user with department', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            testAdminName = "step1admin" + date;

            var createUser = {
                "adminName": testAdminName,
                "email": "testUser" + date + "@gmail.com",
                "firstName": "testUserFirstName",
                "lastName": "testUserLastName",
                "password": "123",
                "accountStatus": 1,
                "departments": [testDepartmentId]
            };

            socket.emit('createAdminForDepartment', createUser);

            socket.once('_createAdminForDepartment', function (data) {
                socket.close();
                if (data.success && data.data) {
                    testAdminId = data.data._id;
                    done();
                }
            });
        });
    });

    var newTestDepartmentId = null;
    it('Should create new test department', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            var newDepartmentName = "testDepartment" + date;

            var newTestDepartment = {
                departmentName: newDepartmentName,
            };
            socket.emit('createDepartment', newTestDepartment);
            socket.once('_createDepartment', function (data) {
                socket.close();
                if (data.success) {
                    newTestDepartmentId = data.data._id;
                    newTestDepartmentId.should.not.equal(null);
                    done();
                }
            });

        });
    });

    // it('Should update admin user department', function (done) {
    //
    //     socketConnection.createConnection().then(function (socket) {
    //         socket.connected.should.equal(true);
    //
    //         var data = {
    //             adminId: testAdminId,
    //             curDepartmentId: testDepartmentId,
    //             newDepartmentId: newTestDepartmentId
    //         };
    //         socket.emit('updateAdminDepartment', data);
    //         socket.once('_updateAdminDepartment', function (data) {
    //             socket.close();
    //             console.log('updateAdminDepartment1',data); // success: false, error: Failed to update user department
    //
    //             if (data.success) {
    //                 console.log('updateAdminDepartment.data1',data); // did not reach here
    //                 console.log('updateAdminDepartment.data.success1',data.success);
    //                 done();
    //             }
    //         });
    //     });
    // });

    it('Should delete admin info', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryUser = {
                _ids: [testAdminId]
            };
            socket.emit('deleteAdminInfosById', queryUser);
            socket.once('_deleteAdminInfosById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should delete departments', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('deleteDepartmentsById', {_ids: [testDepartmentId, newTestDepartmentId]});
            socket.once('_deleteDepartmentsById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should get admin user action log', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryUser = {
                adminName: socketConnection.adminName
            };
            socket.emit('getAdminActionLog', queryUser);
            socket.once('_getAdminActionLog', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

});





