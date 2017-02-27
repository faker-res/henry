/**
 * Created by hninpwinttin on 25/1/16.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerLevelConsumptionLimitSchema = new Schema({
    gameType: String,
    limitValue: String

});

module.exports = playerLevelConsumptionLimitSchema;
