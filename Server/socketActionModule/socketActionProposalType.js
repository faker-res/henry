/**
 * Created by hninpwinttin on 14/1/16.
 */
var encrypt = require('./../modules/encrypt');
var dbProposalType = require('./../db_modules/dbProposalType');
var dbProposalTypeProcess = require('./../db_modules/dbProposalTypeProcess');
var dbProposalTypeProcessStep = require('./../db_modules/dbProposalTypeProcessStep');
var socketUtil = require('./../modules/socketutility');
var proposalExecutor = require('./../modules/proposalExecutor');
var constProposalType = require('./../const/constProposalType');

function socketActionProposalType(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create new ProposalType
         */
        createProposalType: function createProposalType(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name);
            socketUtil.emitter(self.socket, dbProposalType.createProposalType, [data], actionName, isValidData);
        },

        /**
         * Update ProposalType
         */
        updateProposalType: function updateProposalType(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbProposalType.updateProposalType, [data.query, data.updateData], actionName, isValidData);
        },

        /**
         * Get all ProposalType
         */
        getAllProposalType: function getAllProposalType(data) {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbProposalType.getAllProposalType, [data], actionName);
        },

        /**
         * Get proposal detail
         */
        getProposalType: function getProposalType(data) {

            var isValidData = Boolean(data && data._id);
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbProposalType.getProposalType, [data._id], actionName, isValidData);
        },

        /**
         * Get proposal detail for specific platform and type name
         */
        getProposalTypeByType: function getProposalTypeByType(data) {

            var isValidData = Boolean(data && data.platformId && data.type && constProposalType[data.type]);
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbProposalType.getProposalType, [{
                platformId: data.platformId,
                name: constProposalType[data.type]
            }], actionName, isValidData);
        },


        /**
         * Get proposal types for platform
         */
        getProposalTypeByPlatformId: function getProposalTypeByPlatformId(data) {
            var isValidData = Boolean(data && data.platformId);
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbProposalType.getProposalTypeByPlatformId, [data.platformId], actionName, isValidData);
        },

        /**
         * Delete proposal types
         */
        deleteProposalTypes: function deleteProposalTypes(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbProposalType.removeProposalTypes, [data._ids], actionName, isValidData);
        },

        /**
         * Get all Proposal execution Type
         */
        getAllProposalExecutionType: function getAllProposalExecutionType() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: proposalExecutor.getAllExecutionTypes()});
        },

        /**
         * Get all Proposal rejection Type
         */
        getAllProposalRejectionType: function getAllProposalRejectionType() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: proposalExecutor.getAllRejectionTypes()});
        },

        /**
         * Get all Proposal type expiration duration
         */
        getProposalTypeExpirationDuration: function getProposalTypeExpirationDuration(data) {
            var isValidData = Boolean(data && data.query);
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbProposalType.getProposalTypeExpirationDuration, [data.query], actionName, isValidData);
        },

        /**
         * Create new ProposalTypeProcess by ProposalTypeProcess data
         * @param {json} data - ProposalTypeProcess data. It has to contain correct data format
         */
        createProposalTypeProcess: function createProposalTypeProcess(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name);
            socketUtil.emitter(self.socket, dbProposalTypeProcess.createProposalTypeProcess, [data], actionName, isValidData);
        },

        /**
         * add a ProposalTypeProcessStep into a ProposalTypeProcess by ObjectId of step
         * @param {json} data - ObjectId of ProposalTypeProcess and ProposalTypeProcessStep
         */
        addStepToProposalTypeProcess: function addStepToProposalTypeProcess(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.processId && data.stepId);
            socketUtil.emitter(self.socket, dbProposalTypeProcess.addStepToProcess, [data.processId, [data.stepId]], actionName, isValidData);
        },

        /**
         * Update proposal type
         * @param {json} data -It has to contain processId, steps data and links data
         */
        updateProposalTypeProcessSteps: function updateProposalTypeProcessSteps(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.processId && data.steps && data.links);
            socketUtil.emitter(self.socket, dbProposalTypeProcess.updateProcessSteps, [data.processId, data.steps, data.links], actionName, isValidData);
        },

        /**
         * Update proposal type
         * @param {json} data -It has to contain processId, steps data and links data
         */
        updateProposalTypeExpiryDuration: function updateProposalTypeExpiryDuration(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.expiryDuration);
            socketUtil.emitter(self.socket, dbProposalType.updateProposalTypeExpiryDuration, [data.query, data.expiryDuration], actionName, isValidData);
        },

        /**
         * Get proposal type process
         * @param {json} data -It has to contain processId
         */
        getProposalTypeProcess: function getProposalTypeProcess(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.processId);
            socketUtil.emitter(self.socket, dbProposalTypeProcess.getProposalTypeProcess, [data.processId], actionName, isValidData);
        },

        /**
         * Get proposal type process full info
         * @param {json} data -It has to contain processId
         */
        getProposalTypeProcessSteps: function getProposalTypeProcessSteps(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.processId);
            socketUtil.emitter(self.socket, dbProposalTypeProcess.getProposalTypeProcessSteps, [data.processId], actionName, isValidData);
        },


        /**
         * Create new ProposalTypeProcessStep
         * @param {json} data - ProposalTypeProcessStep data. It has to contain correct data format
         */
        createProposalTypeProcessStep: function createProposalTypeProcessStep(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbProposalTypeProcessStep.createProposalTypeProcessStep, [data], actionName, isValidData);
        },

        /**
         * Update ProposalTypeProcessStep
         * @param {json} data - ProposalTypeProcessStep data. It has to contain query condition and updateData
         */
        updateProposalTypeProcessStep: function updateProposalTypeProcessStep(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbProposalTypeProcessStep.updateProposalTypeProcessStep, [data.query, data.updateData], actionName, isValidData);
        },

        /**
         * Delete ProposalTypeProcessStep
         * @param {json} data - ProposalTypeProcessStep data. It has to contain correct data format
         */
        deleteProposalTypeProcessStepById: function deleteProposalTypeProcessStepById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbProposalTypeProcessStep.deleteProposalTypeProcessStep, [data._ids], actionName, isValidData);
        }
    };
    socketActionProposalType.actions = this.actions;
};

module.exports = socketActionProposalType;

