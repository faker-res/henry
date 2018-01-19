var encrypt = require('./../modules/encrypt');
var dbAdminInfo = require('./../db_modules/dbAdminInfo');
var roleChecker = require('./../modules/roleChecker');
var socketUtil = require('./../modules/socketutility');
var constSystemParam = require('../const/constSystemParam');
var Chance = require('chance');
var chance = new Chance();
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

function socketActionAdmin(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {
        /**
         * Create new admin user by admin user data
         * @param {json} data - Admin user data. It has to contain correct data format
         */
        createAdmin: function createAdmin(data) {
            var actionName = arguments.callee.name;
            if (data && data.password) {
                var salt = encrypt.generateSalt();
                var hashpassword = encrypt.createHash(data.password, salt);

                var adminObj = data;
                adminObj['password'] = hashpassword;
                adminObj['salt'] = salt;

                socketUtil.emitter(self.socket, dbAdminInfo.createAdminUser, [data], actionName);
            }
            else {
                self.socket.emit("_" + actionName, {
                    success: false,
                    error: {name: "DataError", message: "Incorrect data!"}
                });
            }
        },

        /**
         * Create new admin user by admin user data
         * @param {json} data - Admin user data. It has to contain correct data format
         */
        createAdminForDepartment: function createAdminForDepartment(data) {
            var actionName = arguments.callee.name;
            if (data && data.password && data.departments && data.departments[0]) {
                var salt = encrypt.generateSalt();
                var hashpassword = encrypt.createHash(data.password, salt);

                var adminObj = data;
                adminObj['password'] = hashpassword;
                adminObj['salt'] = salt;

                socketUtil.emitter(self.socket, dbAdminInfo.createAdminUserWithDepartment, [data], actionName);
            }
            else {
                self.socket.emit("_" + actionName, {
                    success: false,
                    error: {name: "DataError", message: "Incorrect data!"}
                });
            }
        },

        /**
         * Get the full information of the admin user by adminName or _id
         * @param {json} data - It has to contian adminName or _id
         */
        getFullAdminInfo: function getFullAdminInfo(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.adminName || data._id));
            socketUtil.emitterWithoutRoleCheck(self.socket, dbAdminInfo.getFullAdminInfo, [data], actionName, isValidData);
        },

        /**
         * Get the full information of multiple admin users by _id list
         * @param {json} data - It has to contian _id list
         */
        getFullAdminInfos: function getFullAdminInfos(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbAdminInfo.getFullAdminInfos, [{_id: {$in: data._ids}}], actionName, isValidData);
        },

        /**
         * Get the information of the admin user by adminName or _id
         * @param {json} data - It has to contian adminName or _id
         */
        getAdminInfo: function getAdminInfo(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.adminName || data._id));
            socketUtil.emitter(self.socket, dbAdminInfo.getAdminInfo, [data], actionName, isValidData);
        },

        /**
         * Get all admin users info
         */
        getAllAdminInfo: function getAllAdminInfo() {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbAdminInfo.getFullAdminInfos, [{}], actionName);
        },

        /**
         * Update admin users info
         * @param {json} data - It has to contain query or updateData
         */
        updateAdmin: function updateAdmin(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            if (data && data.updateData && data.updateData.password) {
                var salt = encrypt.generateSalt();
                var hashpassword = encrypt.createHash(data.updateData.password, salt);

                data.updateData['password'] = hashpassword;
                data.updateData['salt'] = salt;

                data.updateData.lastPasswordUpdateTime = Date.now();
            }
            socketUtil.emitter(self.socket, dbAdminInfo.updateAdminInfo, [data.query, data.updateData], actionName, isValidData);
        },

        /**
         * Get all live800 account
         */
        checkLive800AccValidity: function checkLive800AccValidity(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.live800Acc);
            socketUtil.emitter(self.socket, dbAdminInfo.checkLive800AccValidity, [data.live800Acc], actionName, isValidData);
        },

        /**
         * Delete admin users info
         * @param {json} data - It has to contain admin id
         */
        deleteAdminInfosById: function deleteAdminInfosById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbAdminInfo.removeAdminInfosById, [data._ids], actionName, isValidData);
        },

        /**
         * Get all roles not attached to current admin
         * @param {json} data - It has to contain query
         */
        getUnAttachedRolesforAdmin: function getUnAttachedRolesforAdmin(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbAdminInfo.getUnAttachedRolesForAdmin, [data._id], actionName, isValidData);
        },

        /**
         * Get all roles not attached to current admin
         * @param {json} data - It has to contain query
         */
        getUnAttachedDepartmentsforAdmin: function getUnAttachedDepartmentsforAdmin(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbAdminInfo.getUnAttachedDepartmentsForAdmin, [data._id], actionName, isValidData);
        },

        /**
         * Get all roles attached to a current admin
         * @param {json} data - It has to contain query
         */
        getAttachedRolesforAdmin: function getAttachedRolesforAdmin(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbAdminInfo.getAttachedRolesForAdmin, [ObjectId(data._id)], actionName, isValidData);
        },

        /**
         * Get all roles attached to a current admin
         * @param {json} data - It has to contain query
         */
        getAttachedDepartmentRolesforAdmin: function getAttachedDepartmentRolesforAdmin(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbAdminInfo.getAttachedDepartmentRolesForAdmin, [ObjectId(data._id)], actionName, isDataValid);
        },

        /**
         * Get all roles NOT attached to a current admin
         * @param {json} data - It has to contain query
         */
        getUnAttachedDepartmentRolesForAdmin: function getUnAttachedDepartmentRolesForAdmin(data) {

            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbAdminInfo.getUnAttachedDepartmentRolesForAdmin, [data._id], actionName, isDataValid);
        },

        /**
         * Get all roles attached to a current admin and admin's department
         * @param {json} data - It has to contain query
         */
        getAllRolesforAdmin: function getAllRolesforAdmin(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbAdminInfo.getAllRolesForAdmin, [data._id], actionName, isDataValid);
        },

        /**
         * Update user's department
         * @param {json} data - It has to contain departmentId curDepartmentId and newDepartmentId
         */
        updateAdminDepartment: function updateAdminDepartment(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.adminId && data.curDepartmentId && data.newDepartmentId && (data.curDepartmentId != data.newDepartmentId));
            socketUtil.emitter(self.socket, dbAdminInfo.updateAdminDepartment, [data.adminId, data.curDepartmentId, data.newDepartmentId], actionName, isDataValid);
        },

        /**
         * Get admin user's action log
         * @param {json} data - It has to contain _id
         */
        getAdminActionLog: function getAdminActionLog(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.adminName);
            socketUtil.emitter(self.socket, dbAdminInfo.getAdminActionLog, [data.adminName, data.limit, data.startDate, data.endDate, data.action], actionName, isDataValid);
        },

        getActionLogPageReport: function getActionLogPageReport(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbAdminInfo.getActionLogPageReport, [data.action, data.admin, data.player, data.startTime, data.endTime, data.index, data.limit, data.sortCol], actionName, isDataValid);
        },

        /**
         * Get all actions available to admin user
         * @param {json} data
         */
        getAllAdminActions: function getAllAdminActions(data) {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: roleChecker.filterActions});
        },

        resetAdminPassword: function resetAdminPassword(data) {
            var actionName = arguments.callee.name;
            var randomPSW = chance.hash({length: constSystemParam.PASSWORD_LENGTH});
            var isValidData = Boolean(data && data.adminId);
            socketUtil.emitter(self.socket, dbAdminInfo.resetAdminPassword, [data.adminId, randomPSW], actionName, isValidData);
        },

        getAdminNameByDepartment: function getAdminNameByDepartment(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.departmentId);
            socketUtil.emitter(self.socket, dbAdminInfo.getAdminNameByDepartment, [data.departmentId], actionName, isValidData);
        },

    };

    socketActionAdmin.actions = this.actions;
};

module.exports = socketActionAdmin;