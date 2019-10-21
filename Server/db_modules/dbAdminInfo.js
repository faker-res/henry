var dbconfig = require('./../modules/dbproperties');
var constSystemLogLevel = require('./../const/constSystemLogLevel');
var constSystemParam = require('./../const/constSystemParam');
var constShardKeys = require('../const/constShardKeys');
var dbUtility = require('./../modules/dbutility');
var encrypt = require('./../modules/encrypt');
const request = require('request');
var Q = require("q");
const ObjectId = mongoose.Types.ObjectId;

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
     * Update all admin users
     * @param {String} query - Query string
     */
    updateAllAdminInfo: function (query, data) {
        return dbconfig.collection_admin.update(query, data, {multi: true, new: true}).exec();
    },

    /**
     * Get all live800 account
     * @param live800Acc
     */
    checkLive800AccValidity: function(live800Acc,adminName){
        if (live800Acc && live800Acc.length) {
            live800Acc.forEach((acc, index) => {
                live800Acc[index] = new RegExp("^" + acc + "$", "i")
            })
        }

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

    getDepartmentRolesForAdmin: function (adminObjId) {
        let attachedRoleIds = [];
        let departmentRolesData;
        let departmentPathData;

        return dbconfig.collection_admin.findOne({_id: adminObjId}).populate({
            path: 'departments',
            model: dbconfig.collection_department,
            select: {_id: 1, departmentName: 1, roles: 1}
        }).then(
            result => {
                if (result && result.departments) {
                    attachedRoleIds = result.roles;
                    let proms = [];

                    for (let i = 0, len = result.departments.length; i < len; i++) {
                        if (result.departments[i] && result.departments[i].roles) {
                            proms.push(dbconfig.collection_role.find({_id: {$in: result.departments[i].roles}}, {_id: 1, roleName: 1}).lean().then(
                                rolesData => {
                                    let list = [];
                                    if (rolesData && rolesData.length > 0) {
                                        if (attachedRoleIds && attachedRoleIds.length > 0) {
                                            rolesData.map(roles => {
                                                roles.isAttach = false;

                                                if (attachedRoleIds.indexOf(roles._id) > -1) {
                                                    roles.isAttach = true;
                                                }
                                            });
                                        }
                                        list = rolesData;
                                    }
                                    return {departmentObjId: result.departments[i]._id, departmentName: result.departments[i].departmentName, roles: list};
                                }
                            ));
                        }
                    }
                    return Promise.all(proms);
                } else {
                    return Promise.reject({name: "DBError", message: "Failed to find all departments"});
                }
            }
        ).then(data => {
            departmentRolesData = data ? data : [];

            let proms = [];
            if (departmentRolesData && departmentRolesData.length > 0) {
                departmentRolesData.forEach(department => {
                    if (department && department.departmentObjId) {
                        let parentPath = "";

                        function getParentName(departmentId, count) {
                            count = count || 0;
                            count++;
                            return dbconfig.collection_department.findOne({_id: departmentId}).then(
                                departmentData => {
                                    if (departmentData){
                                        parentPath = "/" + departmentData.departmentName + parentPath;
                                        if(departmentData.parent && count <= 7){
                                            return getParentName(departmentData.parent, count);
                                        }
                                        return parentPath;
                                    }
                                }
                            )
                        }

                        proms.push(getParentName(department.departmentObjId).then(data => {
                            if (data) {
                                data = data.replace(data.substring(0,1),'').trim();
                            }
                            return {_id: department.departmentObjId, path: data};
                        }));
                    }
                })
            }
            return Promise.all(proms);
        }).then(data => {
            departmentPathData = data ? data : [];

            if (departmentRolesData && departmentRolesData.length > 0) {
                departmentRolesData.map(department => {
                    if(department && department.departmentObjId && departmentPathData && departmentPathData.length > 0) {
                        departmentPathData.forEach(departmentPath => {
                            if (departmentPath && departmentPath._id && department.departmentObjId.toString() == departmentPath._id.toString()) {
                                department.departmentPath = departmentPath.path;
                            }
                        });
                    }
                });
            }

            return departmentRolesData;
        });
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
     * @param {objectId} toBeDeletedDepartmentList - department id list to be deleted
     * @param {objectId} newDepartmentList - new department id list
     */
    updateAdminDepartment: function (userId, toBeDeletedDepartmentList, newDepartmentList) {
        let departRemoveUserPromList = [];
        let departAddUserPromList = [];
        let departmentDataObj;

        if(toBeDeletedDepartmentList && toBeDeletedDepartmentList.length > 0){
            toBeDeletedDepartmentList.forEach(toBeDeletedDepartmentId => {
                if(toBeDeletedDepartmentId){
                    let departRemoveUserProm = dbconfig.collection_department.findOneAndUpdate(
                        {
                            _id: toBeDeletedDepartmentId
                        },
                        {
                            //Todo::have to pull from an array?...mongoose bug? need to check later
                            $pull: {users: {$in: [userId]}}
                        }
                    ).then(
                        departmentData => {
                            departmentDataObj = departmentData;
                            if(departmentData && departmentData.roles && departmentData.roles.length > 0){
                                return dbconfig.collection_admin.findOneAndUpdate(
                                    {
                                        _id: userId
                                    },
                                    {
                                        $pull: {roles: {$in: departmentData.roles}}}
                                    )
                            }
                        }
                    ).then(
                        adminData => {
                            if(departmentDataObj && departmentDataObj.roles && departmentDataObj.roles.length > 0){
                                let prom = [];

                                departmentDataObj.roles.forEach(
                                    roleId => {
                                        if(roleId){
                                            //remove user's role when his department is changed
                                            prom.push(dbconfig.collection_role.findOneAndUpdate(
                                                {_id: roleId},
                                                {$pull: {users: {$in: [userId]}}}
                                            ));
                                        }
                                    }
                                );

                                return Promise.all(prom);
                            }
                        }
                    );

                    departRemoveUserPromList.push(departRemoveUserProm);
                }
            })
        }

        if(newDepartmentList && newDepartmentList.length > 0){
            newDepartmentList.forEach(newDepartmentId => {
                if(newDepartmentId){
                    let departAddUserProm = dbconfig.collection_department.update(
                        {
                            _id: newDepartmentId
                        },
                        {
                            $addToSet: {users: {$each: [userId]}}
                        }
                    );

                    departAddUserPromList.push(departAddUserProm);
                }
            })
        }

        return Promise.all(departRemoveUserPromList).then(
            () => {
                return Promise.all(departAddUserPromList);
            }
        ).then(
            () => {
                return dbconfig.collection_admin.update(
                    {
                        _id: userId
                    },
                    {
                        departments: newDepartmentList,
                    }
                );
            }
        ).then(
            () => {
                return;
            },
            error => {
                return Promise.reject({message: "Failed to update user department!", error: error});
            }
        );

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

    getActionLogPageReport: function (action, admin, player, startTime, endTime, index, limit, sortCol, platformObjIdList) {
        var query = {};
        var sortCol = Object.keys(sortCol).length > 0 ? sortCol : {operationTime: -1}
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
        if(platformObjIdList && platformObjIdList.length > 0) {
            query.platforms = {$in: platformObjIdList.map(p => ObjectId(p))}
        }

        var a = dbconfig.collection_systemLog.find(query).sort(sortCol).skip(index).limit(limit)
            .populate({path: "platforms", model: dbconfig.collection_platform, select: "name"});
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

    callTell400: function(url){
        var deferred = Q.defer();
        request(url, function (error, response, body) {
            let bodyJSON = {};
            if( body && typeof body == "string"){
                bodyJSON = body.replace(/'/g, '"');

                try {
                    bodyJSON = JSON.parse(String(bodyJSON));
                } catch (e) {
                    console.error(e);
                    console.error('bodyJson parse failure', bodyJSON);
                }
            }
            if( error ){
                console.log("callTell400 error", url, error);
                deferred.reject(error);
                return;
            }
            if(response){
                deferred.resolve( {statusCode: response.statusCode, result: bodyJSON.result} );
            }
            else{
                deferred.reject({name: "DBError", message: "No response"});
            }
        });
        return deferred.promise;
    },

    getPaymentMonitorLockedAdmin: function(platformObjId) {
        return dbconfig.collection_paymentMonitorFollowUp.distinct('lockedAdminId', {
            platformObjId: platformObjId
        }).lean().then(
            data => {
                if (data && data.length > 0) {
                    let adminIds = data.map(id => ObjectId(id));

                    return dbconfig.collection_admin.find({_id: {$in: adminIds}}, {_id:1, adminName: 1}).lean();
                }

                return data;
            }
        )
    },

    getAdminsByPermission: function (platformObjId, permission) {
        // permission should be listed from parent category to specific, separated with dot
        // (e.g. "Platform.Config.CanReceiveLargeWithdrawalEmail")
        let roleObjIds = [];
        let path = "views." + permission;
        let query = {};
        query[path] = true;
        return dbconfig.collection_role.find(query, {departments: 1}).lean().then(
            roles => {
                let departments = [];
                if (!roles || !roles.length) {
                    return [];
                }

                for (let i = 0; i < roles.length; i++) {
                    let role = roles[i];
                    roleObjIds.push(role._id);
                    if (role.departments && role.departments.length) {
                        departments = departments.concat(role.departments);
                    }
                }

                return dbconfig.collection_department.find({_id: {$in: departments}, $or:[{platforms: platformObjId}, {parent: null}]}).lean();
            }
        ).then(
            departments => {
                let departmentObjIds = departments.map(department => department._id);

                return dbconfig.collection_admin.find({departments: {$in: departmentObjIds}, roles: {$in: roleObjIds}}).lean();
            }
        );
    },

};

function getAllAdminFromChildDepartments (departmentIds, count) {
    count = count || 0;
    count++;

    let admins = [];
    let department;
    return dbconfig.collection_department.find({_id:{$in: departmentIds}}, {departmentName:1, children:1, users:1})
            .populate({path: "users", model: dbconfig.collection_admin, select: "adminName roles email"})
            .lean().then(
        departments => {
            let childDeparmentProms = [];
            if (departments.length) {
                return dbconfig.collection_role.populate(departments, {
                    path: 'users.roles',
                    model: dbconfig.collection_role,
                    select: "roleName"
                }).then(
                    populatedData => {
                        for (let i = 0, len = populatedData.length; i < len; i++) {
                            department = populatedData[i];

                            for (let j = 0, jLen = department.users.length; j < jLen; j++) {
                                let admin = department.users[j];
                                if (admin && admin._id) {
                                    admins.push({
                                        adminName: admin.adminName,
                                        _id: admin._id,
                                        department: department._id,
                                        departmentName: department.departmentName,
                                        email: admin.email,
                                        roleName: admin.roles.map(role => role.roleName)
                                    });
                                }
                        else if (admin && admin[0] && admin[0]._id) {
                                    admins.push({
                                        adminName: admin[0].adminName,
                                        _id: admin[0]._id,
                                        department: department._id,
                                        departmentName: department.departmentName,
                                        email: admin.email,
                                        roleName: admin.roles.map(role => role.roleName)
                                    });
                                }
                            }

                            if (department.children && department.children.length > 0 && count <= 10) {
                                let childDepartmentProm = getAllAdminFromChildDepartments(department.children, count);
                                childDeparmentProms.push(childDepartmentProm);
                            }
                        }
                        return Promise.all(childDeparmentProms);
                    }
                )
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
