/**
 * Created by hninpwinttin on 26/11/15.
 */

var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test role", function () {

    var newRoleName = null;
    var newRoleId = null;
    var testDepartmentId = null;

    it('Should create test department', function (done) {

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

    /* Test 1 - create a new role*/
    it('Should create a new role', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            newRoleName = "step1Role" + date;

            var inputRole = {
                "roleName": newRoleName,
                //"actions": {
                //    "addAdmin": true,
                //    "findAdmin": true
                //},
                "views": {
                    "admin-user": true,
                    "role": true
                }
            };

            socket.emit('createRole', inputRole);
            socket.on('_createRole', function (data) {
                socket.removeAllListeners('_createRole');
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should get one role by name', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getRole', {roleName: newRoleName});
            socket.on('_getRole', function (data) {
                socket.removeAllListeners('_getRole');
                socket.close();
                if (data.success) {
                    newRoleId = data.data._id;
                    newRoleId.should.not.equal(null);
                    done();
                }
            });
        });
    });

    it('Should get one role by id', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getRole', {_id: newRoleId});
            socket.on('_getRole', function (data) {
                socket.removeAllListeners('_getRole');
                socket.close();
                if (data.success) {
                    data.data.roleName.should.equal(newRoleName);
                    done();
                }
            });
        });

    });

    it('Should not create a wrong role', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            // This does fail but only because it is missing its roleName, not its view because view is optional.
            var wrongRole = {
                "role": "step1Role",
                "viewWrong": {
                    "admin-user": true,
                    "role": true
                }
            };

            socket.emit('createRole', wrongRole);
            socket.on('_createRole', function (data) {
                socket.removeAllListeners('_createRole');
                socket.close();

                if (!data.success) {
                    done();
                }
            });
        });
    });

    /* Test 2 - find all roles */
    it('Should find all roles', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryUser = {};
            socket.emit('getAllRole', queryUser);
            socket.on('_getAllRole', function (data) {
                socket.removeAllListeners('_getAllRole');
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 3 - update role */
    it('Should update role ', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryRole = {
                query: {
                    roleName: newRoleName
                },
                updateData: {
                    views: {
                        "testAction": true
                    },
                }
            };

            socket.emit('updateRole', queryRole);
            socket.once('_updateRole', function (data) {
                socket.close();
                if (data.success) {
                    // data.data[0].adminName.should.containEql("admin");
                    done();
                }
            });
        });
    });

    /* Test 4 - attach role */
    it('Should attach role to user ', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var attachData = {
                roleName: newRoleName,
                adminName: "admin"
            };

            socket.emit('attachRoleToUserByName', attachData);
            socket.on('_attachRoleToUserByName', function (data) {
                socket.removeAllListeners('_attachRoleToUserByName');
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    it('Should detach role from user ', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var detachData = {
                roleName: newRoleName,
                adminName: "admin"
            };

            socket.emit('detachRoleFromUserByName', detachData);
            socket.on('_detachRoleFromUserByName', function (data) {
                socket.removeAllListeners('_detachRoleFromUser');
                if (data.success) {
                    done();
                }
            });

        });
    });

    it('Should get all actions', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getAllActions');
            socket.on('_getAllActions', function (data) {
                socket.removeAllListeners('_getAllActions');
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    it('Should get all views', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getAllViews');
            socket.on('_getAllViews', function (data) {
                socket.removeAllListeners('_getAllViews');
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    it('Should get all unattached users', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getUnAttachUsers', {_id: newRoleId});
            socket.on('_getUnAttachUsers', function (data) {
                socket.removeAllListeners('_getUnAttachUsers');
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    it('Should get all unattached departments', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getUnAttachDepartments', {_id: newRoleId});
            socket.once('_getUnAttachDepartments', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should delete role', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('deleteRolesById', {_ids: [newRoleId]});
            socket.once('_deleteRolesById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should create a new role for department', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            newRoleName = "step1Role" + date;

            var inputRole = {
                "roleName": newRoleName,
                //"actions": {
                //    "addAdmin": true,
                //    "findAdmin": true
                //},
                "views": {
                    "admin-user": true,
                    "role": true
                },
                departments: [testDepartmentId]
            };

            socket.emit('createRoleForDepartment', inputRole);
            socket.once('_createRoleForDepartment', function (data) {
                socket.close();
                if (data.success && data.data) {
                    newRoleId = data.data._id;
                    done();
                }
            });
        });
    });

    it('Should delete role', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('deleteRolesById', {_ids: [newRoleId]});
            socket.once('_deleteRolesById', function (data) {
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

            socket.emit('deleteDepartmentsById', {_ids:[testDepartmentId]});
            socket.once('_deleteDepartmentsById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });


});
