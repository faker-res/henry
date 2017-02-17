var dbUtil = require('./../modules/dbutility');
var dbconfig = require('./../modules/dbproperties');
var log = require("./../modules/logger");
var Q = require("q");

var dbRole = {

    /**
     * Create a new role
     * @param {json} data - The data of the role. Refer to role schema.
     */
    createRole: function (roleData) {
        var role = new dbconfig.collection_role(roleData);
        return role.save();
    },

    /**
     * Create a new role for department
     * @param {json} data - The data of the role. Refer to role schema.
     */
    createRoleForDepartment: function (roleData) {
        var deferred = Q.defer();
        var role = new dbconfig.collection_role(roleData);
        role.save().then(
            function(newRole){
                if(!newRole){
                    deferred.reject({name: "DBError", message: "Failed to create new role."});
                }
                dbconfig.collection_department.update(
                    {_id: roleData.departments[0]},
                    {$addToSet: {roles: newRole._id}}
                ).exec().then(
                    function(data){
                        deferred.resolve(newRole);
                    },
                    function(err){
                        deferred.reject({name: "DBError", message: "Failed to add new role to department.", error: err});
                    }
                );
            },
            function(err){
                deferred.reject({name: "DBError", message: "Failed to create new role.", error: err});
            }
        );
        return deferred.promise;
    },

    /**
     * Get single role by roleName or _id
     * @param {String} query - The query string
     */
    getRole: function (query) {
        return dbconfig.collection_role.findOne(query)
            .populate({path: 'users', model: dbconfig.collection_admin})
            .populate({path: 'departments', model: dbconfig.collection_department}).exec();
    },

    /**
     * Remove role by query
     * @param {String} query - The query string
     */
    removeRolesById: function (roleObjIds) {
        var deferred = Q.defer();
        var roleProm = dbconfig.collection_role.remove({_id: {$in: roleObjIds}}).exec();
        var adminProm =  dbconfig.collection_admin.update(
            {
            },
            {
                $pull: {roles: {$in: roleObjIds}}
            },
            {multi: true}
        ).exec();
        var groupProm =  dbconfig.collection_department.update(
            {
            },
            {
                $pull: {roles: {$in: roleObjIds}}
            },
            {multi: true}
        ).exec();
        Q.all([roleProm, groupProm, adminProm]).then(
            function (data) {
                if (data && data[0] && data[1] && data[2]) {
                    deferred.resolve(data);
                }
                else{
                    deferred.reject({name: "DBError", message: "Incorrect return data"});
                }
            }
        ).catch(
            function (error) {
                log.conLog.error("removeRolesById error", error);
                deferred.reject(error);
            });

        return deferred.promise;
    },

    /**
     * Get multiple roles by query
     * @param {String} query - The query string
     */
    getRoles: function (query) {
        return dbconfig.collection_role.find(query).exec();
    },

    /**
     * Update single role data
     * @param {String} query - The query string
     * @param {json} data - The update data
     */
    updateRole: function (query, data) {
        return dbconfig.collection_role.findOneAndUpdate(query, data).exec();
    },

    /**
     * Get list of groups which are not attached to role
     * @param {String} roleObjId - The _id of the role
     */
    getUnAttachedDepartmentsForRole: function (roleObjId) {
        return dbconfig.collection_department.find({'roles': {$ne: roleObjId}}).exec();
    },

    /**
     * Attach roles to admin users by using object _id
     * @param {Array} adminUserObjIds - array of objectIds for admin users
     * @param {Array} roleObjIds - array of objectIds for roles.
     */
    attachRolesToUsersById: function (adminUserObjIds, roleObjIds) {
        var ops1 = {
            $addToSet: {roles: {$each: roleObjIds}}
        };
        var ops2 = {
            $addToSet: {users: {$each: adminUserObjIds}}
        };
        return dbUtil.updateManyToManyCollections(dbconfig.collection_admin, ops1, adminUserObjIds, dbconfig.collection_role, ops2, roleObjIds);
    },

    /**
     * Attach a role to admin user by using roleName and adminName
     * @param {String} roleName - role name
     * @param {String} adminName - admin user id.
     */
    attachRoleToAdminByName: function (roleName, adminName) {
        var self = dbRole;
        var deferred = Q.defer();

        var adminProm = dbconfig.collection_admin.findOne({adminName: adminName}).exec();
        var roleProm = dbconfig.collection_role.findOne({roleName: roleName}).exec();

        //find data(_id) for adminUser and role
        Q.all([adminProm, roleProm]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    self.attachRolesToUsersById([data[0]._id], [data[1]._id]).then(
                        function (data) {
                            deferred.resolve(data);
                        }
                    ).fail(
                        function (error) {
                            deferred.reject(error);
                        }
                    );
                }
                else {
                    deferred.reject({error: 'Could not find correspoding data!'});
                }
            }
        ).fail(
            function (error) {
                log.conLog.error("attachRoleToAdminByName error", error);
                deferred.reject(error);
            });

        return deferred.promise;
    },

    /**
     * Detach a role from admin user by using roleName and adminName
     * @param {String} roleName - role name
     * @param {String} adminName - admin user id.
     */
    detachRoleFromAdminByName: function (roleName, adminName) {
        var self = dbRole;
        var deferred = Q.defer();

        var adminProm = dbconfig.collection_admin.findOne({adminName: adminName}).exec();
        var roleProm = dbconfig.collection_role.findOne({roleName: roleName}).exec();

        //find data(_id) for adminUser and role
        Q.all([adminProm, roleProm]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    self.detachRolesFromUsersById([data[0]._id], [data[1]._id]).then(
                        function (data) {
                            deferred.resolve(data);
                        }
                    ).fail(
                        function (error) {
                            deferred.reject(error);
                        }
                    );
                }
                else {
                    deferred.reject({message: 'Could not find correspoding data!'});
                }
            }
        ).fail(
            function (error) {
                log.conLog.error("detachRoleNameFromAdminId error", error);
                deferred.reject(error);
            });

        return deferred.promise;
    },

    /**
     * Detach  roles from admin users by using object _id
     * @param {objectId} adminUserId - objectId for admin user
     * @param {objectId} roleId - objectId for role.
     */
    detachRolesFromUsersById: function (adminUserObjIds, roleObjIds) {
        var ops1 = {
            $pull: {roles: {$in: roleObjIds}}
        };
        var ops2 = {
            $pull: {users: {$in: adminUserObjIds}}
        };
        return dbUtil.updateManyToManyCollections(dbconfig.collection_admin, ops1, adminUserObjIds, dbconfig.collection_role, ops2, roleObjIds);
    },


};

module.exports = dbRole;
