var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var counterManager = require("../modules/counterManager.js");
var dbconfig = require("../modules/dbproperties");

var platformGameGroupSchema = new Schema({
    //group id
    groupId: {type: String, unique: true, index: true},
    //group code
    code: {type: Number, index: true},
    //group name
    name: {type: String, required: true},
    //group name
    displayName: {type: String, required: true},
    //platform obj id
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},
    //group games
    games: [{index: {type: Number}, game: {type: Schema.ObjectId, ref: 'game'}}],
    //child departments
    children: [{type: Schema.ObjectId, ref: 'platformGameGroup'}],
    //parent department
    parent: {type: Schema.ObjectId, ref: 'platformGameGroup', default: null}
});

//game is unique by provider and code
platformGameGroupSchema.index({platform: 1, code: 1}, {unique: true});

platformGameGroupSchema.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('groupId'));

platformGameGroupSchema.pre('save', function (next) {
    var group = this;

    if (!group.isNew) {
        next();
        return;
    }

    if (group.code) {
        next(new Error("New game group should not have its code field set!"));
        return;
    }

    dbconfig.collection_platformGameGroup.find({platform: group.platform, code: {$type: "number"}}).sort({code: -1}).limit(1).then(
        maxGroup => {
            if (maxGroup && maxGroup[0]) {
                group.code = maxGroup[0].code + 1;
            }
            else {
                group.code = 1;
            }
            next();
        },
        error => next(error)
    );

});

module.exports = platformGameGroupSchema;
