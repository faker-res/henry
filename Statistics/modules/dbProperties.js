var mongoose = require('mongoose');
var env = require('./../config/env').config();

//player db properties
var playerdb = 'mongodb://' + env.db.playerDBUrl;
var dbPlayer = mongoose.createConnection(playerdb);
var playerSchema = require('./../schema/player');
var playerModel = dbPlayer.model('playerInfo', playerSchema, 'playerInfo');

//logs db properties
var logsdb = 'mongodb://' + env.db.logsDBUrl;
var dbLogs = mongoose.createConnection(logsdb);
var paymentLogSchema = require('./../schema/paymentLog');
var paymentLogModel = dbLogs.model('paymentLog', paymentLogSchema, 'paymentLog');

//logs db properties
//var logsdb = 'mongodb://' + env.db.logsDBUrl;
//var dbLogs = mongoose.createConnection(logsdb);
var accessLogSchema = require('./../schema/accessLog');
var accessLogModel = dbLogs.model('accessLog', accessLogSchema, 'accessLog');

var activeAccessLogSchema = require('./../schema/activeAccessLog');
var activeAccessLogModel = dbLogs.model('activeAccessLog', activeAccessLogSchema, 'activeAccessLog');

var dbProperties = {
    collectionPlayer: playerModel,
    collectionPaymentLog: paymentLogModel,
    collectionAccessLog: accessLogModel,
    collectionActiveAccessLog: activeAccessLogModel
};

module.exports = dbProperties;