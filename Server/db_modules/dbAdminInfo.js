var dbconfig = require('./../modules/dbproperties');
var constSystemLogLevel = require('./../const/constSystemLogLevel');
var constSystemParam = require('./../const/constSystemParam');
var constShardKeys = require('../const/constShardKeys');
var dbUtility = require('./../modules/dbutility');
var encrypt = require('./../modules/encrypt');
var Q = require("q");

var dbAdminInfo = {

    /**
     * Create a new admi user
     * @param {json} data - The data of the admin user. Refer to adminInfo schema.
     */
    createAdminUser: function (adminData) {
        // Lowercase now performed by mongoose, as specified in schema
        //adminData.adminName = adminData.adminName.toLowerCase();
        //if (adminData.email) {
        //    adminData.email = adminData.email.toLowerCase();
        //}
        var adminUser = new dbconfig.collection_admin(adminData);
        return adminUser.save();
    },

    /**
     * Create a new admin user
     * @param {json} data - The data of the admin user. Refer to adminInfo schema.
     */
    createAdminUserWithDepartment: function (adminData) {
        var deferred = Q.defer();
        dbAdminInfo.createAdminUser(adminData).then(
            function (newAdmin) {
                if (!newAdmin) {
                    deferred.reject({name: "DBError", message: "Failed to create new admin user."});
                    return;
                }
                dbconfig.collection_department.update(
                    {_id: adminData.departments[0]},
                    {$addToSet: {users: newAdmin._id}}
                ).exec().then(
                    function (data) {
                        deferred.resolve(newAdmin);
                    },
                    function (err) {
                        deferred.reject({name: "DBError", message: "Failed to add new admin user to department."});
                    }
                );
            },
            function (err) {
                deferred.reject({name: "DBError", message: "Failed to create new admin user.", error: err});
            }
        );
        return deferred.promise;
    },

    /**
     * Get the full information of the admin user by adminName
     * @param {String} query - Query string
     */
    getFullAdminInfo: function (query) {
        return dbconfig.collection_admin.findOne(query)
            .populate({path: "departments", model: dbconfig.collection_department})
            .populate({path: 'roles', model: dbconfig.collection_role}).exec();
    },

    /**
     * Get the information of the admin user by adminName
     * @param {String} query - Query string
     */
    getAdminInfo: function (query) {
        return dbconfig.collection_admin.findOne(query).exec();
    },
    getAdminsInfo: function (query) {
        console.log("outttttttttttttttttttttt")
        return dbconfig.collection_admin.find(query).exec();
    },
    getCSAdmins: function(data){
        let deferred = Q.defer();
        let proms = [];
        for(var d in data){
          let prom = dbconfig.collection_admin.find({_id: data[d]}).lean();
          proms.push(prom)
        }
        Q.all(proms).then(data=>{
            deferred.resolve(data[0]);
        })
        return deferred.promise;
    },
    getQIAdmins: function(data){
        let deferred = Q.defer();
        let proms = [];
        for(var d in data){
            let prom = dbconfig.collection_admin.find({_id: data[d]}).lean();
            proms.push(prom)
        }
        Q.all(proms).then(data=>{
            deferred.resolve(data[0]);
        })
        return deferred.promise;
    },
    /**
     * Get all admin users detailed info
     * @param {String} query - Query string
     */
    getFullAdminInfos: function (query) {
        return dbconfig.collection_admin.find(query)
            .populate({path: "departments", model: dbconfig.collection_department})
            .populate({path: 'roles', model: dbconfig.collection_role}).exec();
    },

    /**
     * Get all admin users
     * @param {String} query - Query string
     */
    updateAdminInfo: function (query, data) {
        return dbconfig.collection_admin.findOneAndUpdate(query, data).exec();
    },

    /**
     * Get all live800 account
     * @param live800Acc
     */
    checkLive800AccValidity: function(live800Acc,adminName){
        return dbconfig.collection_admin.find({live800Acc: {$in:live800Acc}, adminName: {$ne:adminName}}).count().then(
            adminCount => {
                return adminCount > 0 ? false : true;
            });
    },

    /**
     * Remove admin user by query
     * @param {String} query - The query string
     */
    removeAdminInfosById: function (adminObjIds) {
        var deferred = Q.defer();
        var adminProm = dbconfig.collection_admin.remove({_id: {$in: adminObjIds}}).exec();
        var departmentProm = dbconfig.collection_department.update(
            {},
            {
                $pull: {users: {$in: adminObjIds}}
            },
            {multi: true}
        ).exec();
        var roleProm = dbconfig.collection_role.update(
            {},
            {
                $pull: {users: {$in: adminObjIds}}
            },
            {multi: true}
        ).exec();
        Q.all([adminProm, departmentProm, roleProm]).then(
            function (data) {
                if (data && data[0] && data[1] && data[2]) {
                    deferred.resolve(data);
                }
                else {
                    deferred.reject({name: "DBError", message: "Incorrect return data"});
                }
            }
        ).catch(
            function (error) {
                deferred.reject(error);
            });

        return deferred.promise;
    },

    /**
     * Get list of admin users who don't have the role
     * @param {String} roleId - The _id of the role
     */
    getUnAttachedUserForRoleId: function (roleId) {
        return dbconfig.collection_admin.find({'roles': {$ne: roleId}}).exec();
    },

    /**
     * Get list of roles which are not attached to current adminName
     * @param {String} adminUserObjId - The _id of the adminInfo
     */
    getUnAttachedRolesForAdmin: function (adminUserObjId) {
        return dbconfig.collection_role.find({'users': {$ne: adminUserObjId}}).exec();
    },

    /**
     * Get list of departments which are not attached to current adminName
     * @param {String} adminUserObjId - The _id of the adminInfo
     */
    getUnAttachedDepartmentsForAdmin: function (adminUserObjId) {
        return dbconfig.collection_department.find({'users': {$ne: adminUserObjId}}).exec();
    },

    /**
     * Get list of roles which are attached to current adminName
     * @param {String} adminUserObjId - The _id of the adminInfo
     */
    getAttachedRolesForAdmin: function (adminUserObjId) {
        return dbconfig.collection_role.find({'users': {$elemMatch:{$eq: adminUserObjId}}}).exec();
    },
    /**
     * Get list of roles which are NOT attached to current adminName
     * @param {String} adminUserObjId - The _id of the adminInfo
     */
    getUnAttachedDepartmentRolesForAdmin: function (adminUserObjectId) {
        var deferred = Q.defer();
        var currentRolesId = [];
        var roleIds = [];
        var unAttachedRolesIds = [];
        dbconfig.collection_admin.findOne({_id: adminUserObjectId}).populate({
            path: 'departments',
            model: dbconfig.collection_department
        }).then(
            function (result) {
                if (result && result.departments) {
                    currentRolesId = result.roles; // Admiin's current attached role
                    roleIds = []; // all the roles in the department
                    for (var i = 0; i < result.departments.length; i++) {
                        roleIds.push.apply(roleIds, result.departments[i].roles);
                    }
                    for (var j = 0; j < roleIds.length; j++) {
                        if (currentRolesId.indexOf(roleIds[j]) <= -1) {
                            unAttachedRolesIds.push(roleIds[j]);
                        }
                    }
                    dbconfig.collection_role.find({_id: {$in: unAttachedRolesIds}}).exec().then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject(err);
                        }
                    );
                }
                else {
                    deferred.reject({error: {message: 'Failed get Unattached department role!'}});
                }
            },
            function (err) {
                deferred.reject({name: "DBError", message: "Failed to find all departments", error: err});
            }
        );

        return deferred.promise;
    },
    /**
     * Get list of roles which are attached to current adminName
     * @param {String} adminUserObjId - The _id of the adminInfo
     */
    getAttachedDepartmentRolesForAdmin: function (adminUserObjId) {
        var deferred = Q.defer();
        dbconfig.collection_admin.findOne({_id: adminUserObjId}).populate({
            path: 'departments',
            model: dbconfig.collection_department
        }).then(
            function (result) {
                if (result && result.departments) {
                    var roleIds = [];
                    for (var i = 0; i < result.departments.length; i++) {
                        roleIds.push.apply(roleIds, result.departments[i].roles);
                    }

                    dbconfig.collection_role.find({_id: {$in: roleIds}}).exec().then(
                        function (data) {
                            deferred.resolve(data);
                        },
                        function (err) {
                            deferred.reject(err);
                        }
                    );
                }
                else {
                    deferred.reject({error: {message: 'Failed get attached department role!'}});
                }
            },
            function (err) {
                deferred.reject(err);
            }
        );

        return deferred.promise;
    },

    /**
     * Get all the roles which are attached to current admin user and admin user's departments
     * @param {String} adminUserObjId - The _id of the admin user
     */
    getAllRolesForAdmin: function (adminUserObjId) {
        //only check the roles that belong to this user
        return dbAdminInfo.getAttachedRolesForAdmin(adminUserObjId);

        //var deferred = Q.defer();
        //var adminRoleProm = dbAdminInfo.getAttachedRolesForAdmin(adminUserObjId);
        //var departmentRoleProm = dbAdminInfo.getAttachedDepartmentRolesForAdmin(adminUserObjId);
        //
        //Q.all([adminRoleProm, departmentRoleProm]).then(
        //    function (data) {
        //        if (data && data[0] && data[1]) {
        //            var roles = [];
        //            roles.push.apply(roles, data[0]);
        //            roles.push.apply(roles, data[1]);
        //            deferred.resolve(roles);
        //        }
        //        else {
        //            deferred.reject({name: "DBError", message: "Incorrect return data"});
        //        }
        //    }
        //).catch(
        //    function (error) {
        //        log.conLog.error("getAllRolesForAdmin error", error);
        //        deferred.reject(error);
        //    });
        //
        //return deferred.promise;
    },

    /**
     * Update admin user's department
     * @param {objectId} userId - objectId for admin user
     * @param {objectId} curDepartmentId - current department id
     * @param {objectId} newDepartmentId - new department id
     */
    updateAdminDepartment: function (userId, curDepartmentId, newDepartmentId) {
        var deferred = Q.defer();
        var departProm = dbconfig.collection_department.update(
            {
                _id: curDepartmentId
            },
            {
                //Todo::have to pull from an array?...mongoose bug? need to check later
                $pull: {users: {$in: [userId]}}
            }
        ).exec();
        var depart1Prom = dbconfig.collection_department.update(
            {
                _id: newDepartmentId
            },
            {
                $addToSet: {users: {$each: userId}}
            }
        ).exec();

        var userProm = dbconfig.collection_admin.update(
            {
                _id: userId
            },
            {
                departments: [newDepartmentId],
                roles: []
            }
        ).exec();

        //remove user's role when his department is changed
        var roleProm = dbconfig.collection_role.update(
            {},
            {$pull: {users: {$in: [userId]}}}
        ).exec();

        Q.all([departProm, depart1Prom, userProm, roleProm]).then(
            function (data) {
                deferred.resolve(data);
            }
        ).catch(
            function (error) {
                deferred.reject({message: "Failed to update user department!", error: error});
            });

        return deferred.promise;
    },

    /**
     * Update admin user's department
     * @param {objectId} adminId - objectId for admin user
     */
    getAdminActionLog: function (adminName, limit, start, end, action) {
        if (limit !== 0) {
            limit = limit || constSystemParam.MAX_RECORD_NUM;
        }
        var query = {
            adminName: adminName,
            level: constSystemLogLevel.ACTION
        }
        var a = {};
        try {
            if (start) {
                a.$gte = new Date(start);
            }
            if (end) {
                a.$lte = new Date(end);
            }
            if (Object.keys(a).length != 0) {
                query.operationTime = a;
            }
            if (action) {
                query.action = action;
            }
        }
        catch (e) {
            //discard if invalid data format
        }
        return dbconfig.collection_systemLog.find(query).sort({operationTime: -1}).limit(limit).exec();
    },

    getActionLogPageReport: function (action, admin, player, startTime, endTime, index, limit, sortCol) {
        var query = {};
        var sortCol = sortCol || {operationTime: -1}
        index = index || 0;
        limit = limit || 100;
        if (admin) {
            query.adminName = admin;
        }
        if (startTime) {
            query.operationTime = {$gte: new Date(startTime)}
            if (endTime) {
                query.operationTime['$lt'] = new Date(endTime);
            }
        } else if (endTime) {
            query.operationTime = {"$lt": new Date(endTime)};
        }
        if (action) {
            if (typeof action == 'string') {
                query.action = action;
            } else if (action.length > 0) {
                query.action = {$in: action};
            }
        }
        var a = dbconfig.collection_systemLog.find(query).sort(sortCol).skip(index).limit(limit).exec();
        var b = dbconfig.collection_systemLog.find(query).count();
        return Q.all([a, b]).then(
            data => {
                return {data: data[0], size: data[1]};
            }
        )
    },

    resetAdminPassword: function (adminId, newPassword) {
        var deferred = Q.defer();

        var salt = encrypt.generateSalt();
        var hashpassword = encrypt.createHash(newPassword, salt);

        dbUtility.findOneAndUpdateForShard(
            dbconfig.collection_admin,
            {_id: adminId},
            {
                password: hashpassword,
                salt: salt,
                lastPasswordUpdateTime: 0,
                failedLoginAttempts: 0
            },
            constShardKeys.collection_admin
        ).then(
            function (data) {
                deferred.resolve(newPassword);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error updating admin password.", error: error});
            }
        );

        return deferred.promise;
    },

    getAdminNameByDepartment: function (departmentId) {
        return getAllAdminFromChildDepartments([departmentId]);
    },

};

function getAllAdminFromChildDepartments (departmentIds) {
    let admins = [];
    let department;
    return dbconfig.collection_department.find({_id:{$in: departmentIds}}, {departmentName:1, children:1, users:1})
            .populate({path: "users", model: dbconfig.collection_admin, select: "adminName"})
            .lean().then(
        departments => {
            let childDeparmentProms = [];
            for (let i = 0, len = departments.length; i < len; i++) {
                department = departments[i];

                for (let j = 0, jLen = department.users.length; j < jLen; j++) {
                    let admin = department.users[j];
                    if (admin && admin._id) {
                        admins.push({
                            adminName: admin.adminName,
                            _id: admin._id,
                            department: department._id,
                            departmentName: department.departmentName,
                        });
                    }
                    else if (admin && admin[0] && admin[0]._id) {
                        // have no idea why this kind of data appear in my local db
                        admins.push({
                            adminName: admin[0].adminName,
                            _id: admin[0]._id,
                            department: department._id,
                            departmentName: department.departmentName,
                        });
                    }
                }

                if (department.children && department.children.length > 0) {
                    let childDepartmentProm = getAllAdminFromChildDepartments(department.children);
                    childDeparmentProms.push(childDepartmentProm);
                }
            }
            return Promise.all(childDeparmentProms);
        }
    ).then(
        childDepartmentAdminData => {
            for (let i = 0, len = childDepartmentAdminData.length; i < len; i++) {
                admins = admins.concat(childDepartmentAdminData[i]);
            }
            return admins;
        }
    );
}

module.exports = dbAdminInfo;
