/*
 * This schema is to ensure the uniqueness of domain name
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var partnerOwnDomainSchema = new Schema({
    name: {type: String, required: true, index: true, unique: true},
    partnerName: {type: String, required: true, index: true, unique: true},
});

module.exports = partnerOwnDomainSchema;