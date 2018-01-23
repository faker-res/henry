var dbDepartment = require('./../db_modules/dbDepartment');
var socketUtil = require('./../modules/socketutility');

function socketActionDepartment(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {
        /**
         * Create admin department by department data
         * @param {json} data - Department data
         */
        createDepartment: function createDepartment(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbDepartment.createDepartment, [data], actionName, isValidData);
        },

        /**
         * Create new department with parent department id
         * @param {json} data - new Department data with parentId
         */
        createDepartmentWithParent: function createDepartmentWithParent(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.departmentName && data.parent);
            socketUtil.emitter(self.socket, dbDepartment.createDepartmentWithParent, [data], actionName, isValidData);
        },

        /**
         * Get admin department by departmentName or _id
         * @param {json} data - Query data. It has to contain departmentName or _id
         */
        getDepartment: function getDepartment(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.departmentName || data._id));
            socketUtil.emitter(self.socket, dbDepartment.getDepartment, [data], actionName, isValidData);
        },

        /**
         * Get all admin departments
         */
        getAllDepartments: function getAllDepartments() {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbDepartment.getDepartments, [{}], actionName);
        },
        getDepartmentsbyPlatformObjId: function getDepartmentsbyPlatformObjId(data) {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbDepartment.getDepartmentsbyPlatformObjId, [data], actionName);
        },

        /**
         * Update admin department
         * @param {json} data - data has query and updateData
         */
        updateDepartment: function updateDepartment(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbDepartment.updateDepartment, [data.query, data.updateData], actionName, isValidData);
        },

        /**
         * Delete admin departments by id
         * @param {json} data - It has to contain admin id
         */
        deleteDepartmentsById: function deleteDepartmentsById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbDepartment.removeDepartmentsById, [data._ids], actionName, isValidData);
        },

        /**
         * Add admins users to admin departments
         * @param {json} data - It has to contain adminNames and departmentIds
         */
        addUsersToDepartmentsById: function addUsersToDepartmentsById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.adminIds && data.departmentIds && data.adminIds.length > 0 && data.departmentIds.length > 0);
            socketUtil.emitter(self.socket, dbDepartment.addUsersToDepartmentsById, [data.adminIds, data.departmentIds], actionName, isValidData);
        },

        /**
         * Add admins users to admin departments
         * @param {json} data - It has to contain adminNames and departmentIds
         */
        removeUsersFromDepartmentsById: function removeUsersFromDepartmentsById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.adminIds && data.departmentIds && data.adminIds.length > 0 && data.departmentIds.length > 0);
            socketUtil.emitter(self.socket, dbDepartment.removeUsersFromDepartmentsById, [data.adminIds, data.departmentIds], actionName);
        },

        /**
         * Get unattached roles from admin department
         * @param {json} data - It has to contain _id for department
         */
        getUnAttachedUsersForDepartment: function getUnAttachedUsersForDepartment(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbDepartment.getUnAttachedAdminsForDepartment, [data._id], actionName, isDataValid);
        },

        /**
         * Get attached roles from admin department
         * @param {json} data - It has to contain _id for department
         */
        getAttachedRolesForDepartment: function getAttachedRolesForDepartment(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbDepartment.getAttachedRolesForDepartment, [data._id], actionName, isDataValid);
        },

        /**
         * Get unattached roles from admin department
         * @param {json} data - It has to contain _id for department
         */
        getUnAttachedRolesForDepartment: function getUnAttachedRolesForDepartment(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbDepartment.getUnattachedRolesForDepartment, [data._id], actionName, isDataValid);
        },

        /**
         * Attach roles to admin departments
         * @param {json} data - It has to contain roles _Ids and departments _Ids
         */
        attachRolesToDepartmentsById: function attachRolesToDepartmentsById(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.roleIds && data.departmentIds && data.roleIds.length > 0 && data.departmentIds.length > 0);
            socketUtil.emitter(self.socket, dbDepartment.attachRolesToDepartmentsById, [data.roleIds, data.departmentIds], actionName, isDataValid);
        },

        /**
         * Detach roles from admin departments
         * @param {json} data - It has to contain roles _Ids and departments _Ids
         */
        detachRolesFromDepartmentsById: function detachRolesFromDepartmentsById(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.roleIds && data.departmentIds && data.roleIds.length > 0 && data.departmentIds.length > 0);
            socketUtil.emitter(self.socket, dbDepartment.detachRolesFromDepartmentsById, [data.roleIds, data.departmentIds], actionName, isDataValid);
        },

        /**
         * Add child departments to department by id
         * @param {json} data - It has to contain roles childrenIds and departmentId
         */
        addChildrenById: function addChildrenById(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.departmentId && data.childrenIds && data.childrenIds.length > 0 && data.childrenIds.indexOf(data.departmentId) < 0);
            socketUtil.emitter(self.socket, dbDepartment.addChildrenById, [data.departmentId, data.childrenIds], actionName, isDataValid);
        },

        /**
         * Remove child departments from department by id
         * @param {json} data - It has to contain roles _Ids and departments _Ids
         */
        removeChildrenById: function removeChildrenById(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.departmentId && data.childrenIds && data.childrenIds.length > 0);
            socketUtil.emitter(self.socket, dbDepartment.removeChildrenById, [data.departmentId, data.childrenIds], actionName, isDataValid);
        },

        /**
         * Get departments that can be added to child departments for department
         * @param {json} data - It has to contain roles _Ids and departments _Ids
         */
        getPotentialChildren: function getPotentialChildren(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.departmentId);
            socketUtil.emitter(self.socket, dbDepartment.getPotentialChildren, [data.departmentId], actionName, isDataValid);
        },

        /**
         * Update department's parent
         * @param {json} data - It has to contain departmentId curParentId and newParentId
         */
        updateDepartmentParent: function updateDepartmentParent(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.departmentId  && data.newParentId
                                      && (data.curParentId != data.newParentId) && (data.departmentId != data.newParentId));
            socketUtil.emitter(self.socket, dbDepartment.updateDepartmentParent, [data.departmentId, data.curParentId, data.newParentId], actionName, isDataValid);
        },

        /**
         * Get department tree data for departmentId
         * @param {json} data - It has to contain departmentId
         */
        getDepartmentTreeById: function getDepartmentTreeById(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.departmentId);
            socketUtil.emitter(self.socket, dbDepartment.getDepartmentTreeById, [data.departmentId], actionName, isDataValid);
        },
        /**
         * Get department tree data for departmentId With User Data
         * @param {json} data - It has to contain departmentId
         */
        getDepartmentTreeByIdWithUser: function getDepartmentTreeByIdWithUser(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.departmentId);
            socketUtil.emitter(self.socket, dbDepartment.getDepartmentTreeByIdWithUser, [data.departmentId], actionName, isDataValid);
        },

        /**
         * Get departments data for platform
         * @param {json} data - It has to contain platformId
         */
        getDepartmentsByPlatformId: function getDepartmentsByPlatformId(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbDepartment.getDepartmentsByPlatformId, [data.platformId], actionName, isDataValid);
        },

        getDepartmentDetailsByPlatformObjId: function getDepartmentDetailsByPlatformObjId(data) {
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbDepartment.getDepartmentDetailsByPlatformObjId, [data.platformObjId], actionName, isDataValid);
        }
    };

    socketActionDepartment.actions = this.actions;
};

module.exports = socketActionDepartment;