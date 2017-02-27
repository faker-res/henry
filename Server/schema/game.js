var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var constGameStatus = require("./../const/constGameStatus");
var counterManager = require("../modules/counterManager.js");

var gameSchema = new Schema({
    //simplified gameId
    gameId: {type: String, unique: true, index: true},
    //game name
    name: {type: String, required: true},
    //game title
    title: {type: String},
    //code
    code: {type: String, required: true},
    //aliasCode ["g1","g2","g3"]
    aliasCode: String,
    //big Game Icon
    bigShow: String,
    //small game icon
    smallShow: String,
    //if game is visible
    visible: {type: Boolean, default: false},
    //if this game has trial account
    canTrial: {type: Boolean, default: false},
    //Game Type
    type: {type: String, required: true},
    //game description
    description: {type: String, default: null},
    //game provider
    provider: {type: Schema.ObjectId, ref: 'gameProvider'},
    //status
    status: {type: Number, default: constGameStatus.ENABLE},
    //display order
    showPriority: {type: Number},
    //1: flash, 2: html5
    playGameType: {type: String},
    //progressive game code
    progressivegamecode: {type: String}
});

//game is unique by provider and code
gameSchema.index({ provider: 1, code: 1 }, {unique: true});

//add game id before save
//gameSchema.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('gameId'));

/*
gameSchema.pre('save', function (next) {
    var game = this;
    counterModel.findByIdAndUpdate(
        {_id: 'gameId'},
        {$inc: { seq: 1}},
        {upsert: true}
    ).then(
        function(counter){
            game.gameId = counter ? counter.seq : 0;
            return next();
        },
        function(error){
            return next(error);
        }
    );
});
*/

module.exports = gameSchema;