var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var constGameStatus = require("./../const/constGameStatus");
var counterManager = require("../modules/counterManager.js");

var gameSchema = new Schema({
    //simplified gameId
    gameId: {type: String, unique: true, index: true},
    //game name
    name: {type: String, required: true, index: true},
    //customized game name list by platform
    changedName: {type: JSON},
    //game title
    title: {type: String, index: true},
    //code
    code: {type: String, required: true, index: true},
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
    type: {type: String, required: true, index: true},
    //game description
    description: {type: String, default: null, index: true},
    //game provider
    provider: {type: Schema.ObjectId, ref: 'gameProvider', index: true},
    //status
    status: {type: Number, default: constGameStatus.ENABLE, index: true},
    //display order
    showPriority: {type: Number},
    //1: flash, 2: html5
    playGameType: {type: String, index: true},
    //progressive game code
    progressivegamecode: {type: String},
    //game images
    images: {type: JSON},
    // sourceURL to add in front of images url if CDN not set up
    sourceURL: {type: String},
    // game display : 1.horizontal 2.vertical 3. horizontal/vertical
    gameDisplay: {type: String}
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
