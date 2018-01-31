var dbconfig = require('./../modules/dbproperties');
var log = require("./../modules/logger");
var Q = require("q");
var dbUtil = require('./../modules/dbutility');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

var dbDepartment = {

    /**
     * Create a new admin department
     * @param {Object} departmentData - The data of the department. Refer to department schema.
     */
    createDepartment: function (departmentData) {
        var department = new dbconfig.collection_department(departmentData);
        return department.save();
    },

    /**
     * Create a new admin department
     * @param {json} data - The data of the department. Refer to department schema.
     */
    createDepartmentWithParent: function (departmentData) {
        var deferred = Q.defer();
        var department = new dbconfig.collection_department(departmentData);
        department.save().then(
            function(newData){
                if(!newData){
                    deferred.reject({name: "DBError", message: "Failed to create new department."});
                }
                dbconfig.collection_department.update(
                    {_id: departmentData.parent},
                    {$addToSet: {children: newData._id}}
                ).exec().then(
                    function(data){
                        deferred.resolve(newData);
                    },
                    function(err){
                        deferred.reject({name: "DBError", message: "Failed to add new department as child.", error: err});
                    }
                );
            },
            function(err){
                deferred.reject({name: "DBError", message: "Failed to create new department.", error: err});
            }
        );
        return deferred.promise;
    },

    /**
     * Get single admin department by departmentName or _id
     * @param {String} query - The query string
     */
    getDepartment: function (query) {
        return dbconfig.collection_department.findOne(query)
            .populate({path: "users", model: dbconfig.collection_admin})
            .populate({path: "roles", model: dbconfig.collection_role}).exec();
    },

    /**
     * Remove admin department by object _id
     * @param {String} query - The query string
     */
    removeDepartmentsById: function (departmentObjIds) {
        var deferred = Q.defer();
        var departmentProm = dbconfig.collection_department.remove({_id: {$in: departmentObjIds}}).exec();
        var childrenProm = dbconfig.collection_department.update(
            {parent: {$in: departmentObjIds}},
            {parent: null},
            {multi: true}
        ).exec();
        var parentProm = dbconfig.collection_department.update(
            {},
            {$pull: {children: {$in: departmentObjIds}}},
            {multi: true}
        ).exec();
        var adminProm = dbconfig.collection_admin.update(
            {},
            {
                $pull: {departments: {$in: departmentObjIds}}
            },
            {multi: true}
        ).exec();
        var roleProm = dbconfig.collection_role.update(
            {},
            {
                $pull: {departments: {$in: departmentObjIds}}
            },
            {multi: true}
        ).exec();
        Q.all([departmentProm, childrenProm, parentProm, adminProm, roleProm]).then(
            function (data) {
                if (data && data[0] && data[1] && data[2] && data[3] && data[4]) {
                    deferred.resolve(data);
                }
                else {
                    deferred.reject({name: "DBError", message: "Incorrect return data"});
                }
            }
        ).catch(
            function (error) {
                log.conLog.error("removeDepartmentsById error", error);
                deferred.reject(error);
            });

        return deferred.promise;
    },

    /**
     * Get multiple admin departments by query
     * @param {String} query - The query string
     */
    getDepartments: function (query) {
        return dbconfig.collection_department.find(query).exec();
    },

    getDepartmentsbyPlatformObjId: function (data) {
        if (data) {
            data=[data];
            data = data.map(id => ObjectId(id));
            return dbconfig.collection_department.find({platforms: {$in: data}}).lean().then(data => {
                if (data) {
                    let departmentsObjId = [];
                    data.forEach(item => {
                        departmentsObjId.push(item._id);
                    });
                    return departmentsObjId;
                }
            });
        }else {
            //data = data.map(id => ObjectId(id));
            return dbconfig.collection_department.find({}).lean().then(data => {
                console.log("innder",data)
                if (data) {
                    let departmentsObjId = [];
                    data.forEach(item => {
                        departmentsObjId.push(item._id);
                    });
                    return departmentsObjId;
                }
            });
        }
    },

    getDepartmentsbyPlatformObjId: function (data) {
        if (data) {
            data=[data];
            data = data.map(id => ObjectId(id));
            return dbconfig.collection_department.find({platforms: {$in: data}}).lean().then(data => {
                if (data) {
                    let departmentsObjId = [];
                    data.forEach(item => {
                        departmentsObjId.push(item._id);
                    });
                    return departmentsObjId;
                }
            });
        }else {
            //data = data.map(id => ObjectId(id));
            return dbconfig.collection_department.find({}).lean().then(data => {
                console.log("innder",data)
                if (data) {
                    let departmentsObjId = [];
                    data.forEach(item => {
                        departmentsObjId.push(item._id);
                    });
                    return departmentsObjId;
                }
            });
        }
    },

    /**
     * Update admin department data
     * @param {String} query - The query string
     * @param {json} data - The update data
     */
    updateDepartment: function (query, data) {
        return dbconfig.collection_department.findOneAndUpdate(query, data).exec();
    },

    /**
     * Get list of admin users who are not attached to a current department
     * @param {String} departmentId - The _id of the department
     */
    getUnAttachedAdminsForDepartment: function (departmentId) {
        return dbconfig.collection_admin.find({'departments': {$ne: departmentId}}).exec();
    },

    /**
     * Attach users to admin department by using object _id
     * @param {array} adminUsers objectId - objectIds for admin users
     * @param {array} departmentId - array of objectIds for admin department.
     */
    addUsersToDepartmentsById: function (adminUserIds, departmentIds) {
        var deferred = Q.defer();

        var adminProm = dbconfig.collection_admin.update(
            {
                _id: {$in: adminUserIds}
            },
            {
                $addToSet: {departments: {$each: departmentIds}}
            },
            {multi: true}
        ).exec();

        var departmentProm = dbconfig.collection_department.update(
            {
                _id: {$in: departmentIds}
            },
            {
                $addToSet: {users: {$each: adminUserIds}}
            },
            {multi: true}
        ).exec();

        Q.all([adminProm, departmentProm]).then(
            function (data) {
                deferred.resolve(data);
            }
        ).catch(
            function (error) {
                log.conLog.error("addUsersToDepartmentById error", error);
                deferred.reject({message: 'Failed to add users!', error: error});
            });

        return deferred.promise;
    },

    /**
     * Remove admin users from admin department by using object _id
     * @param {array} adminUserIds - array of objectId for admin users
     * @param {array} departmentIds - array of objectId objectId for admin departments.
     */
    removeUsersFromDepartmentsById: function (adminUserIds, departmentIds) {
        var deferred = Q.defer();

        var adminProm = dbconfig.collection_admin.update(
            {
                _id: {$in: adminUserIds}
            },
            {
                $pull: {departments: {$in: departmentIds}}
            },
            {multi: true}
        ).exec();

        var departmentProm = dbconfig.collection_department.update(
            {
                _id: {$in: departmentIds}
            },
            {
                $pull: {users: {$in: adminUserIds}}
            },
            {multi: true}
        ).exec();

        Q.all([adminProm, departmentProm]).then(
            function (data) {
                deferred.resolve(data);
            }
        ).catch(
            function (error) {
                log.conLog.error("removeUsersFromDepartmentsById error", error);
                deferred.reject({message: 'Failed to remove users from departments!', error: error});
            });

        return deferred.promise;
    },

    /**
     * Get unattached roles from admin department by using object _id
     * @param {array} departmentId - objectId for admin department
     */
    getUnattachedRolesForDepartment: function (departmentId) {
        return dbconfig.collection_role.find({'departments': {$ne: departmentId}}).exec();
    },

    /**
     * Get attached roles from admin department by using object _id
     * @param {array} departmentId - objectId for admin department
     */
    getAttachedRolesForDepartment: function (departmentId) {
        return dbconfig.collection_role.find({'departments': departmentId}).exec();
    },

    /**
     * Attach roles to admin departments by using object _id
     * @param {objectId} departmentIds - array of objectIds for admin departments
     * @param {objectId} roleIds - array of objectIds for roles.
     */
    attachRolesToDepartmentsById: function (roleIds, departmentIds) {
        var deferred = Q.defer();

        var departmentProm = dbconfig.collection_department.update(
            {
                _id: {$in: departmentIds}
            },
            {
                $addToSet: {roles: {$each: roleIds}}
            }
        ).exec();

        var roleProm = dbconfig.collection_role.update(
            {
                _id: {$in: roleIds}
            },
            {
                $addToSet: {departments: {$each: departmentIds}}
            }
        ).exec();

        Q.all([departmentProm, roleProm]).then(
            function (data) {
                deferred.resolve(data);
            }
        ).catch(
            function (error) {
                log.conLog.error("attachRolesFromDepartmentsById error", error);
                deferred.reject({message: 'Failed to attach roles!', error: error});
            });

        return deferred.promise;
    },

    /**
     * Detach roles from admin departments by using object _id
     * @param {objectId} departmentIds - array of objectIds for admin departments
     * @param {objectId} roleIds - array of objectIds for roles.
     */
    detachRolesFromDepartmentsById: function (roleIds, departmentIds) {
        var deferred = Q.defer();

        var departmentProm = dbconfig.collection_department.update(
            {
                _id: {$in: departmentIds}
            },
            {
                $pull: {roles: {$in: roleIds}}
            }
        ).exec();

        var roleProm = dbconfig.collection_role.update(
            {
                _id: {$in: roleIds}
            },
            {
                $pull: {departments: {$in: departmentIds}}
            }
        ).exec();

        Q.all([departmentProm, roleProm]).then(
            function (data) {
                deferred.resolve(data);
            }
        ).catch(
            function (error) {
                log.conLog.error("attachRolesToDepartmentsById error", error);
                deferred.reject({message: 'Failed to attach roles!', error: error});
            });

        return deferred.promise;
    },

    /**
     * Add child departments to department by id
     * @param {objectId} departmentId - objectId for admin department
     * @param {objectId} childrenIds - array of objectIds for child departments.
     */
    addChildrenById: function (departmentId, childrenIds) {
        var ops1 = {
            $addToSet: {children: {$each: childrenIds}}
        };
        var ops2 = {
            parent: departmentId
        };
        return dbUtil.updateManyToManyCollections(dbconfig.collection_department, ops1, [departmentId], dbconfig.collection_department, ops2, childrenIds);
    },

    /**
     * Get departments that can be added to child departments for department
     * @param {objectId} departmentId - objectId for admin department
     */
    getPotentialChildren: function(departmentId){
        return dbconfig.collection_department.find(
            {
                $or : [ { parent : {$ne: departmentId} }, { parent : null }, {parent: {$exists: false}} ]
            }
        ).populate({path: "users", model: dbconfig.collection_admin})
            .populate({path: "roles", model: dbconfig.collection_role}).exec()
    },

    /**
     * Remove child departments to department by id
     * @param {objectId} departmentId - objectId for admin department
     * @param {objectId} childrenIds - array of objectIds for child departments
     */
    removeChildrenById: function (departmentId, childrenIds) {
        var ops1 = {
            $pull: {children: {$in: childrenIds}}
        };
        var ops2 = {
            parent: null
        };
        return dbUtil.updateManyToManyCollections(dbconfig.collection_department, ops1, [departmentId], dbconfig.collection_department, ops2, childrenIds);
    },

    /**
     * Update department's parent
     * @param {objectId} departmentId - objectId for admin department
     * @param {objectId} curParentId - current parent
     * @param {objectId} newParentId - new parent
     */
    updateDepartmentParent: function(departmentId, curParentId, newParentId){
        var deferred = Q.defer();
        var parentProm = dbconfig.collection_department.update(
            {
                _id: curParentId
            },
            {
                //Todo::have to pull from an array?...mongoose bug? need to check later
                $pull: {children: {$in: [departmentId]}}
            }
        ).exec();
        var parent1Prom = dbconfig.collection_department.update(
            {
                _id: newParentId
            },
            {
                $addToSet: {children: departmentId}
            }
        ).exec();
        var departProm = dbconfig.collection_department.update(
            {
                _id: departmentId
            },
            {
                parent: newParentId
            }
        ).exec();
        Q.all([parentProm, parent1Prom, departProm]).then(
            function (data) {
                deferred.resolve(data);
            }
        ).catch(
            function (error) {
                log.conLog.error("updateDepartmentParent error", error);
                deferred.reject({message: "Failed to update department parent!", error: error});
            });

        return deferred.promise;
    },

    /**
     * get department tree by id
     * @param {objectId} departmentId - objectId for admin department
     */
    getDepartmentTreeById: function(departmentId){
        var deferred = Q.defer();
        dbconfig.collection_department.find().populate({
            path: "roles",
            model: dbconfig.collection_role,
            populate: {
                path: "users",
                model: dbconfig.collection_admin
            }
        }).then(
            function(data){
                if( data && data.length > 0 ){
                    var allDepartments = {};
                    //add all departments data to key map
                    for( var i = 0; i < data.length; i++ ){
                        allDepartments[data[i]._id] = data[i];
                    }
                    var departmentsTree = [];
                    //build subtree for department
                    for( var j = 0; j < data.length; j++ ){
                        var department = data[j];
                        var parent = department;
                        let count = 0;
                        while( parent && count < 30){
                            count++;
                            if( String(parent._id) == departmentId ){
                                departmentsTree.push(department);
                                break;
                            }
                            else{
                                parent = parent.parent ? allDepartments[parent.parent] : null;
                            }
                        }
                    }
                    deferred.resolve(departmentsTree);
                }
                else{
                    deferred.reject({name: "DataError", message: "Can't find all departments"});
                }
            },
            function(error){
                deferred.reject({name: "DBError", message: "Failed to find all departments", error: error});
            }
        );
        return deferred.promise;
    },

    getDepartmentTreeByIdWithUser: function(departmentId){
        var deferred = Q.defer();
        dbconfig.collection_department.find()
        .populate({path: 'users', model: dbconfig.collection_admin})
        .then(
            function(data){
                if( data && data.length > 0 ){
                    var allDepartments = {};
                    //add all departments data to key map
                    for( var i = 0; i < data.length; i++ ){
                        allDepartments[data[i]._id] = data[i];
                    }
                    var departmentsTree = [];
                    //build subtree for department
                    for( var j = 0; j < data.length; j++ ){
                        var department = data[j];
                        var parent = department;
                        while( parent ){
                            if( String(parent._id) == departmentId ){
                                departmentsTree.push(department);
                                break;
                            }
                            else{
                                parent = parent.parent ? allDepartments[parent.parent] : null;
                            }
                        }
                    }
                    deferred.resolve(departmentsTree);
                }
                else{
                    deferred.reject({name: "DataError", message: "Can't find all departments"});
                }
            },
            function(error){
                deferred.reject({name: "DBError", message: "Failed to find all departments", error: error});
            }
        );
        return deferred.promise;
    },
    /**
     * get departments by platformId
     * @param {objectId} platformId - objectId for platform
     */
    getDepartmentsByPlatformId: function(platformId){
        return dbconfig.collection_department.find(
            {
                platforms: platformId
            }
        ).exec();
    },

    getDepartmentDetailsByPlatformObjId: (platformObjId) => {
        return dbconfig.collection_department.find({
            platforms: platformObjId,
            parent: {$exists: true}
        }).populate({
            path: "roles",
            model: dbconfig.collection_role,
            populate: {
                path: "users",
                model: dbconfig.collection_admin
            }
        }).then(
            data => {
                if (data && data.length > 0) {
                    return data
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't find all departments"});
                }
            },
            error => {
                return Q.reject({name: "DBError", message: "Failed to find all departments", error: error});
            }
        );
    }

};

module.exports = dbDepartment;
