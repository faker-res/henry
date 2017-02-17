var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var dbDepartment = require('./../db_modules/dbDepartment');

describe("Test socket Admin Department APIs", function () {

    var testAdminName = null;
    var testAdminId = null;

    var newDepartmentName = null;
    var newDepartmentId = null;

    var newChildDepartmentName = null;
    var newChildDepartmentId = null;

    it('Should create department', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            newDepartmentName = "testDepartment" + date;

            var newTestDepartment = {
                departmentName: newDepartmentName,
            };
            socket.emit('createDepartment', newTestDepartment);
            socket.once('_createDepartment', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    it('Should find department', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryUser = {
                "departmentName": newDepartmentName

            };
            socket.emit('getDepartment', queryUser);
            socket.once('_getDepartment', function (data) {
                socket.close();
                if (data.success && data.data) {
                    newDepartmentId = data.data._id;
                    newDepartmentId.should.not.equal(null);
                    done();
                }
            });
        });
    });

    it('Should find all admin departments', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getAllDepartments', {});
            socket.once('_getAllDepartments', function (data) {
                socket.close();
                if (data.success && data.data && data.data.length > 0) {
                    done();
                }
            });
        });
    });

    it('Should update department ', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryDepartment = {
                query: {
                    departmentName: newDepartmentName
                },
                updateData: {
                    users: []
                }
            };

            socket.emit('updateDepartment', queryDepartment);
            socket.once('_updateDepartment', function (data) {
                socket.close();
                if (data.success) {
                    // data.data[0].adminName.should.containEql("admin");
                    done();
                }
            });
        });
    });

    it('Should add admin users into test departments', function (done) {
        // This operation can be very slow if you have a lot of admins
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getAllAdminInfo');
            socket.once('_getAllAdminInfo', function (data) {
                if (data.success && data.data && data.data.length > 0) {
                    var allIds = [];
                    for(var i = 0; i < data.data.length; i++){
                        allIds.push( data.data[i]._id);
                    }
                    testAdminId = allIds[0];
                    var sendData = {
                        adminIds: allIds,
                        departmentIds: [newDepartmentId]
                    };
                    socket.emit('addUsersToDepartmentsById', sendData);
                    socket.once('_addUsersToDepartmentsById', function (data) {
                        if(data && data.success){
                            done();
                        }
                    });
                }
            });
        });
    });

    /* it should get roles attached to an admin */
    it('Should get all roles attached to an department', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryDepartment = {
                _id: newDepartmentId
            };
            socket.emit('getAttachedRolesForDepartment', queryDepartment);
            socket.once('_getAttachedRolesForDepartment', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* it should get roles attached to an admin */
    it('Should get all roles unattached to an department', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryDepartment = {
                _id: newDepartmentId
            };
            socket.emit('getUnAttachedRolesForDepartment', queryDepartment);
            socket.once('_getUnAttachedRolesForDepartment', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    var newRoleName = null;
    var newRoleId = null;

    it('Should create a test role', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            newRoleName = "step1Role" + date;

            //noinspection JSAnnotator
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
            socket.once('_createRole', function (data) {
                socket.close();
                if (data.success) {
                    newRoleId = data.data._id;
                    done();
                }
            });
        });
    });

    it('Should attach test roles to test departments', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var sendData = {
                departmentIds: [newDepartmentId],
                roleIds: [newRoleId]
            };
            socket.emit('attachRolesToDepartmentsById', sendData);
            socket.once('_attachRolesToDepartmentsById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should get department roles for test user', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var sendData = {
                _id: testAdminId,
            };
            socket.emit('getAttachedDepartmentRolesforAdmin', sendData);
            socket.once('_getAttachedDepartmentRolesforAdmin', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });


    it('Should get all roles for test user', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var sendData = {
                _id: testAdminId,
            };
            socket.emit('getAllRolesforAdmin', sendData);
            socket.once('_getAllRolesforAdmin', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should remove admin users from test departments', function (done) {
        // This operation can be very slow if you have a lot of admins
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getAllAdminInfo');
            socket.once('_getAllAdminInfo', function (data) {
                if (data.success && data.data && data.data.length > 0) {
                    var allIds = [];
                    for(var i = 0; i < data.data.length; i++){
                        allIds.push( data.data[i]._id);
                    }
                    var sendData = {
                        adminIds: allIds,
                        departmentIds: [newDepartmentId]
                    };
                    socket.emit('removeUsersFromDepartmentsById', sendData);
                    socket.once('_removeUsersFromDepartmentsById', function (data) {
                        if(data && data.success){
                            done();
                        }
                    });
                }
            });
        });
    });

    it('Should get un attached users for department', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var sendData = {
                _id: newDepartmentId,
            };
            socket.emit('getUnAttachedUsersForDepartment', sendData);
            socket.once('_getUnAttachedUsersForDepartment', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should detach test roles from test departments', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var sendData = {
                departmentIds: [newDepartmentId],
                roleIds: [newRoleId]
            };
            socket.emit('detachRolesFromDepartmentsById', sendData);
            socket.once('_detachRolesFromDepartmentsById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should create child department', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            newChildDepartmentName = "testDepartment" + date;

            var newTestDepartment = {
                departmentName: newChildDepartmentName,
                users: [],
                roles: []
            };
            socket.emit('createDepartment', newTestDepartment);
            socket.once('_createDepartment', function (data) {
                socket.close();
                if (data.success) {
                    newChildDepartmentId = data.data._id;
                    newChildDepartmentId.should.not.equal(null);
                    done();
                }
            });

        });
    });

    it('Should add child departments', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('addChildrenById', {departmentId: newDepartmentId, childrenIds:[newChildDepartmentId]});
            socket.once('_addChildrenById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should remove child departments', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('removeChildrenById', {departmentId: newDepartmentId, childrenIds:[newChildDepartmentId]});
            socket.once('_removeChildrenById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });
    it('Should delete the new created child departments', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('deleteDepartmentsById', {_ids:[newChildDepartmentId]});
            socket.once('_deleteDepartmentsById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should get potential child departments', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getPotentialChildren', {departmentId: newDepartmentId});
            socket.once('_getPotentialChildren', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should create child department with parentId', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            newChildDepartmentName = "testDepartment" + date;

            var newTestDepartment = {
                departmentName: newChildDepartmentName,
                parent: newDepartmentId
            };
            socket.emit('createDepartmentWithParent', newTestDepartment);
            socket.once('_createDepartmentWithParent', function (data) {
                socket.close();
                if (data.success) {
                    newChildDepartmentId = data.data._id;
                    newChildDepartmentId.should.not.equal(null);
                    done();
                }
            });
        });
    });


    var newParentDepartId = null;
    it('Should create new parent department', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            var newParentDepartmentName = "testDepartment" + date;

            var newTestDepartment = {
                departmentName: newParentDepartmentName,
            };
            socket.emit('createDepartment', newTestDepartment);
            socket.once('_createDepartment', function (data) {
                socket.close();
                if (data.success) {
                    newParentDepartId = data.data._id;
                    newParentDepartId.should.not.equal(null);
                    done();
                }
            });

        });
    });

    it('Should update department parent', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var data = {
                departmentId: newChildDepartmentId,
                curParentId: newDepartmentId,
                newParentId: newParentDepartId
            };

            socket.emit('updateDepartmentParent', data);
            socket.once('_updateDepartmentParent', function (data) {
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

            socket.emit('deleteDepartmentsById', {_ids:[newDepartmentId, newChildDepartmentId, newParentDepartId]});
            socket.once('_deleteDepartmentsById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });
});