/**
 * Created by hninpwinttin on 22/1/16.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var constGameStatus = require("./../const/constGameStatus");

var platformGameStatusSchema = new Schema({
    //platform obj id
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    //game obj id
    game: {type: Schema.ObjectId, ref: 'game', index: true},
    //platform game name
    name: {type: String, required: true, index: true},
    //platform game status
    status: {type: Number, default: constGameStatus.ENABLE, index: true},
    //big Game Icon
    bigShow: String,
    //small game icon
    smallShow: String,
    //if game is visible
    visible: {type: Boolean, default: false, index: true},
    //game display order for client
    displayOrder: {type: String, index: true},
    //maintenance time, hour(0-23) Minutes(0-59)
    maintenanceHour: {type: Number, min: 0, max: 23, default: null},
    maintenanceMinute: {type: Number, min: 0, max: 59, default: null}
});

//record is unique by platform and game
platformGameStatusSchema.index({platform: 1, game: 1}, {unique: true});


module.exports = platformGameStatusSchema;
