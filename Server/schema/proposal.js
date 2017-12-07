/**
 * Created by hninpwinttin on 23/11/15.
 */
var mongoose = require('mongoose');
var constProposalPriority = require('../const/constProposalPriority');
var constProposalUserType = require('../const/constProposalUserType');
var constProposalEntryType = require('../const/constProposalEntryType');
var constProposalStatus = require('../const/constProposalStatus');
var counterManager = require("../modules/counterManager.js");
const dbutility = require('../modules/dbutility');
var Schema = mongoose.Schema;

var proposalSchema = new Schema({
    //proposal unique id
    proposalId: {type: String, index: true},
    //proposal main type
    mainType: {type: String, index: true},
    //proposal type
    type: {type: Schema.Types.ObjectId, ref: 'proposalType', index: true},
    //creator {type(system, player or admin), name, id(shortID for player, longId for admin)
    creator: {type: JSON, default: {}},
    // create Time
    createTime: {type: Date, default: Date.now, index: true},
    //proposal process info
    process: {type: Schema.Types.ObjectId, ref: 'proposalProcess', index: true},
    //proposal data
    data: {type: JSON, default: {}},
    //priority  - {0 - general , 1 - high, 2 - higher, 3 - the highest }
    priority: {type: String, default: constProposalPriority.GENERAL},
    // Determine type of entry from which submitted the proposal - 0 - client Side, 1 - admin side
    entryType: {type: String, default: constProposalEntryType.ADMIN, index: true},
    //User type - for whom create the proposal - real player/partners/system users/demoPlayers
    userType: {type: String, default: constProposalUserType.SYSTEM_USERS, index: true},
    //if this proposal has any step
    noSteps: {type: Boolean, default: false, index: true},
    //status
    status: {type: String, index: true},
    // remark: [{
    //     addTime: {type: Date, default: Date.now},
    //     admin: {type: Schema.Types.ObjectId, ref: 'admin'},
    //     content: {type: String}
    // }],
    isLocked: {type: Schema.Types.ObjectId, ref: 'adminInfo'},
    //expiry date for each proposal
    expirationTime: {type: Date, default: Date.now},
    // create Time
    settleTime: {type: Date, default: Date.now, index: true},
    // input device
    inputDevice: {type: Number, default: 0}
});

proposalSchema.index({"data.playerName": 1});
proposalSchema.index({"data.playerId": 1});
proposalSchema.index({"data.playerObjId": 1});
proposalSchema.index({"data.partnerName": 1});
proposalSchema.index({"data.eventCode": 1});
proposalSchema.index({"data.eventName": 1});
proposalSchema.index({"data.validTime": 1});
proposalSchema.index({mainType: 1, type: 1, status: 1});
proposalSchema.index({noSteps: 1, type: 1, createTime: 1});
proposalSchema.index({"data.merchantNo": 1});
proposalSchema.index({"data.alipayAccount": 1});
proposalSchema.index({"data.PROMO_CODE_TYPE": 1});
proposalSchema.index({"data.name": 1});
proposalSchema.index({"data.phoneNumber": 1});

/*
 // Ensure that the caller does not accidentally save an ObjectId in proposal.data.playerId
 proposalSchema.pre('validate', function (next) {
 var doc = this;
 if (doc.data && doc.data.playerId && doc.data.playerId instanceof mongoose.Types.ObjectId) {
 next(Error("The proposal's data.playerId should be the player.playerId, NOT the player._id"))
 } else {
 next();
 }
 });
 */

proposalSchema.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('proposalId'));

/*
 proposalSchema.pre('save', function(next) {
 var doc = this;
 counterModel.findByIdAndUpdate(
 {_id: 'proposalId'},
 {$inc: { seq: 1}},
 {upsert: true}
 ).then(
 function(counter){
 doc.proposalId = counter ? counter.seq : 0;
 next();
 },
 function(error){
 return next(error);
 }
 );
 });
 */

module.exports = proposalSchema;
