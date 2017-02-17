var socketUtil = require('./../modules/socketutility');
var dbRole = require("./../db_modules/dbRole");
var dbAdminInfo = require("./../db_modules/dbAdminInfo");
var roleChecker = require('./../modules/roleChecker');

function socketActionRole(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create role by role data
         * @param {json} data - Role data
         */
        createRole: function createRole(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbRole.createRole, [data], actionName, isValidData);
        },

        /**
         * Create role by role data
         * @param {json} data - Role data
         */
        createRoleForDepartment: function createRoleForDepartment(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.departments && data.departments[0]);
            socketUtil.emitter(self.socket, dbRole.createRoleForDepartment, [data], actionName, isValidData);
        },

        /**
         * Get role by roleName or _id
         * @param {json} data - Query data. It has to contain roleName or _id
         */
        getRole: function getRole(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.roleName || data._id));
            socketUtil.emitter(self.socket, dbRole.getRole, [data], actionName, isValidData);
        },

        /**
         * Get all roles
         * @param {json} data - Not required
         */
        getAllRole: function getAllRole(data) {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbRole.getRoles, [{}], actionName);
        },

        /**
         * Delete Roles by Id
         * @param {json} data - data has to contain _ids
         */
        deleteRolesById: function deleteRolesById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbRole.removeRolesById, [data._ids], actionName, isValidData);
        },

        /**
         * Update Role
         * @param {json} data - data has query and updateData
         */
        updateRole: function updateRole(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbRole.updateRole, [data.query, data.updateData], actionName, isValidData);
            socketUtil.notifyClientsPermissionUpdate(self.socketIO);
        },

        /**
         * Attach role to admin user
         * @param {json} data - data has roleName and user adminName
         */
        attachRoleToUserByName: function attachRoleToUserByName(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.roleName && data.adminName);
            socketUtil.emitter(self.socket, dbRole.attachRoleToAdminByName, [data.roleName, data.adminName], actionName, isValidData);
            socketUtil.notifyClientsPermissionUpdate(self.socketIO);
        },

        /**
         * Attach role to admin user by id
         * @param {json} data - data has _id for role and admin user
         */
        attachRolesToUsersById: function attachRolesToUsersById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.RoleObjIds && data.AdminObjIds);
            socketUtil.emitter(self.socket, dbRole.attachRolesToUsersById, [data.AdminObjIds, data.RoleObjIds], actionName, isValidData);
            socketUtil.notifyClientsPermissionUpdate(self.socketIO);
        },

        /**
         * Detach role from admin user
         * @param {json} data - data has roleName and user adminName
         */
        detachRoleFromUserByName: function detachRoleFromUserByName(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.roleName && data.adminName);
            socketUtil.emitter(self.socket, dbRole.detachRoleFromAdminByName, [data.roleName, data.adminName], actionName);
            socketUtil.notifyClientsPermissionUpdate(self.socketIO);
        },

        /**
         * Detach role from admin user
         * @param {json} data - data has _id for role and admin user
         */
        detachRolesFromUsersById: function detachRolesFromUsersById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.RoleObjIds && data.AdminObjIds);
            socketUtil.emitter(self.socket, dbRole.detachRolesFromUsersById, [data.AdminObjIds, data.RoleObjIds], actionName, isValidData);
            socketUtil.notifyClientsPermissionUpdate(self.socketIO);
        },

        /**
         * Get all server actions
         */
        getAllActions: function getAllActions() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: roleChecker.getSocketActions()});
        },

        /**
         * Get all page views
         */
        getAllViews: function getAllViews() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: roleChecker.views});
        },

        /**
         * Get all the users who doesn't have the role
         * @param {json} data - data has _id for role
         */
        getUnAttachUsers: function getUnAttachUsers(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbAdminInfo.getUnAttachedUserForRoleId, [data._id], actionName, isValidData);
        },

        /**
         * Get all the departments who doesn't have the role
         * @param {json} data - data has _id for role
         */
        getUnAttachDepartments: function getUnAttachDepartments(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbRole.getUnAttachedDepartmentsForRole, [data._id], actionName, isValidData);
        }

    };

    socketActionRole.actions = this.actions;

}

module.exports = socketActionRole;

