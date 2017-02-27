var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var roleSchema = new Schema({
    //primary key for policy schema
    roleName: {type: String, unique: true, required: true, dropDups: true, index: true},
    //access level info for server actions
    icon: {type: String, default: null},
    //actions: {type: JSON, default: null},
    //access level info for front end web
    views: {type: JSON, default: null},
    //attached admin users
    users: [{type: Schema.ObjectId, ref: 'adminInfo'}],
    //attached groups
    departments: [{type: Schema.ObjectId, ref: 'department'}],
});

module.exports = roleSchema;