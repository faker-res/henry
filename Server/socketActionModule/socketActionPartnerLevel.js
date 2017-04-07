var CommonAPIs = require('./../modules/commonAPIs');
var dbPartnerLevel = require('./../db_modules/dbPartnerLevel');
var socketUtil = require('./../modules/socketutility');

function SocketActionPartnerLevel(socketIO, socket) {
    this.socketIO = socketIO;
    this.socket = socket;
};

//Common
var proto = SocketActionPartnerLevel.prototype;

/**
 * Create new partnerLevel by partner data
 * @param {json} data - partnerLevel data. It has to contain correct data format. Refer "partnerLevel" schema
 */
proto.create = function (data) {
    var actionName = CommonAPIs.partnerLevel.create;
    var isValidData = Boolean(data && data.name);
    socketUtil.emitter(this.socket, dbPartnerLevel.createPartnerLevel, [data], actionName, isValidData);
};

/**
 * get partnerLevel by partner name or _id
 * @param {json} data - query data
 */
proto.get = function (data) {
    var actionName = CommonAPIs.partnerLevel.get;
    var isValidData = Boolean(data && (data.name || data._id));
    socketUtil.emitter(this.socket, dbPartnerLevel.getPartnerLevel, [data], actionName, isValidData);
};

/**
 * update partnerLevel by  _id or name
 * @param {json} data - query and updateData
 *
 */
proto.update = function (data) {
    var actionName = CommonAPIs.partnerLevel.update;
    var isValidData = Boolean(data && data.query && data.updateData);
    socketUtil.emitter(this.socket, dbPartnerLevel.updatePartnerLevel, [data.query, data.updateData], actionName, isValidData);

};

/**
 * get all partner Levels
 */
proto.getAll = function () {
    var actionName = CommonAPIs.partnerLevel.getAll;
    socketUtil.emitter(this.socket, dbPartnerLevel.getAllPartnerLevels, [{}], actionName);
};

/**
 * get all partner Levels
 */
proto.delete = function (data) {
    var actionName = CommonAPIs.partnerLevel.delete;
    var isValidData = Boolean(data && data._id);
    socketUtil.emitter(this.socket, dbPartnerLevel.deletePartnerLevel, [data._id], actionName, isValidData);
};

/**
 * get all partner Levels
 */
proto.getByPlatform = function (data) {
    var actionName = CommonAPIs.partnerLevel.getByPlatform;
    var isValidData = Boolean(data && data.platformId);
    socketUtil.emitter(this.socket, dbPartnerLevel.getPartnerLevel, [{platform: data.platformId}], actionName, isValidData);
};

SocketActionPartnerLevel.prototype.registerAPI = function () {
    this.socket.on(CommonAPIs.partnerLevel.create, this.create.bind(this));
    this.socket.on(CommonAPIs.partnerLevel.get, this.get.bind(this));
    this.socket.on(CommonAPIs.partnerLevel.update, this.update.bind(this));
    this.socket.on(CommonAPIs.partnerLevel.getAll, this.getAll.bind(this));
    this.socket.on(CommonAPIs.partnerLevel.delete, this.delete.bind(this));
    this.socket.on(CommonAPIs.partnerLevel.getByPlatform, this.getByPlatform.bind(this));
};

module.exports = SocketActionPartnerLevel;

