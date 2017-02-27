var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var departmentSchema = new Schema({
    //primary key for group schema
    departmentName: {type: String, unique: true, required: true, dropDups: true, index: true},
    //department icon
    icon: {type: String, default: null},
    //policy info attached to this user
    roles: [{type: Schema.ObjectId, ref: 'role'}],
    //users info in this group
    users: [{type: Schema.ObjectId, ref: 'adminInfo'}],
    //child departments
    children: [{type: Schema.ObjectId, ref: 'department'}],
    //parent department
    parent: {type: Schema.ObjectId, ref: 'department', default: null},
    //platforms this department has
    platforms: [{type: Schema.ObjectId, ref: 'platform'}]
});

module.exports = departmentSchema;