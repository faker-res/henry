var mongoose = require('mongoose');
var constProposalPriority = require('../const/constProposalPriority');
var constProposalUserType = require('../const/constProposalUserType');
var constProposalEntryType = require('../const/constProposalEntryType');
var counterManager = require("../modules/counterManager.js");
var Schema = mongoose.Schema;

var proposalSchema = new Schema({
    //proposal unique id
    proposalId: {type: String},
    //proposal main type
    mainType: {type: String},
    //proposal type
    type: {type: Schema.Types.ObjectId, ref: 'proposalType'},
    //creator {type(system, player or admin), name, id(shortID for player, longId for admin)
    creator: {type: JSON, default: {}},
    // create Time
    createTime: {type: Date, default: Date.now},
    //proposal process info
    process: {type: Schema.Types.ObjectId, ref: 'proposalProcess', index: true},
    //proposal data
    data: {type: JSON, default: {}},
    //priority  - {0 - general , 1 - high, 2 - higher, 3 - the highest }
    priority: {type: String, default: constProposalPriority.GENERAL},
    // Determine type of entry from which submitted the proposal - 0 - client Side, 1 - admin side
    entryType: {type: String, default: constProposalEntryType.ADMIN, index: true},
    //User type - for whom create the proposal - real player/partners/system users/demoPlayers
    userType: {type: String, default: constProposalUserType.SYSTEM_USERS},
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
    expirationTime: {type: Date, default: Date.now, index: true},
    // create Time
    settleTime: {type: Date, default: Date.now, index: true},
    // times that the proposal had run
    processedTimes: {type: Number, default: 0},
    // input device
    inputDevice: {type: Number, default: 0, index: true},

    //For send email issue: audi credit change proposal email won't group as conversation, need message id as email references for gmail to group.
    // messageId: {type: String}
});

// Index for general proposalId (Descending)c
proposalSchema.index({proposalId: 1});
// Index for top up report without proposalId search
// proposalSchema.index({createTime: 1, mainType: 1}); // ERROR: add index fails, too many indexes for logsdb.proposal key: {createTime: 1, mainType:1}

proposalSchema.index({"data.bankCardNo": 1});
proposalSchema.index({"data.accountNo": 1});
proposalSchema.index({"data.alipayAccount": 1});
proposalSchema.index({"data.wechatAccount": 1});
proposalSchema.index({"data.weChatAccount": 1});

// Index for player report
// proposalSchema.index({"data.playerObjId": 1, createTime: 1, mainType: 1, status: 1, type: 1}); // ERROR: add index fails, too many indexes for logsdb.proposal key: {createTime: 1, mainType:1}
// Index based on type
// proposalSchema.index({type: 1, createTime: -1}); // ERROR: add index fails, too many indexes for logsdb.proposal key: {createTime: 1, mainType:1}
// Merchant No related
// proposalSchema.index({"data.merchantNo": 1, createTime: -1, status: 1, type: 1});  // ERROR: add index fails, too many indexes for logsdb.proposal key: {createTime: 1, mainType:1}

proposalSchema.index({"data.playerName": 1});
proposalSchema.index({"data.playerId": 1});
proposalSchema.index({"data.partnerName": 1});
proposalSchema.index({"data.eventCode": 1});
proposalSchema.index({"data.eventName": 1});
proposalSchema.index({"data.validTime": 1});
proposalSchema.index({mainType: 1, type: 1, status: 1});
proposalSchema.index({noSteps: 1, type: 1, createTime: 1});
proposalSchema.index({"data.PROMO_CODE_TYPE": 1});
proposalSchema.index({"data.name": 1});
proposalSchema.index({"data.phoneNumber": 1});
proposalSchema.index({"data.rewardAmount": 1});
proposalSchema.index({"data._id": 1});
proposalSchema.index({"data.partnerId": 1});
proposalSchema.index({"data.rewardAmount": 1});
proposalSchema.index({"data.amount": 1});
proposalSchema.index({"data.limitedOfferObjId": 1});
proposalSchema.index({"data.expirationTime": 1});
proposalSchema.index({"data.userAgent": 1});
proposalSchema.index({"data.topupType": 1});
proposalSchema.index({"data.consecutiveNumber": 1});
proposalSchema.index({"data.bConsumptionReturnRequest": 1});
proposalSchema.index({"data.eventId": 1});
proposalSchema.index({"data.alipayerAccount": 1});
proposalSchema.index({"data.alipayerNickName": 1});
proposalSchema.index({"data.line": 1});
proposalSchema.index({"data.applyTargetDate": 1});
proposalSchema.index({"data.lastLoginIp": 1});
proposalSchema.index({"data.promoCode": 1});
proposalSchema.index({"data.providerGroup": 1});
proposalSchema.index({"data.deviceId": 1});
proposalSchema.index({"data.depositMethod": 1});
proposalSchema.index({"data.platformId": 1});
proposalSchema.index({"data.line": 1});
proposalSchema.index({"data.topUpProposal": 1});
proposalSchema.index({"data.topUpProposalId": 1});
proposalSchema.index({"data.topUpRecordId": 1});
proposalSchema.index({"data.followUpContent": 1});
proposalSchema.index({"data.bankTypeId": 1});
proposalSchema.index({createTime: 1, "data.platformId": 1, mainType: 1, type: 1, status: 1, "data.depositMethod": 1});
proposalSchema.index({createTime: 1, "data.platformId": 1, mainType: 1, type: 1, status: 1, "data.topupType": 1});
// proposalSchema.index({"data.topUpSystemName": 1}); // ERROR: add index fails, too many indexes for logsdb.proposal key: {createTime: 1, mainType:1}
// proposalSchema.index({"data.merchantName": 1});  // ERROR: add index fails, too many indexes for logsdb.proposal key: {createTime: 1, mainType:1}
// note :: add index fails, to add these indexes successfully, other unnecessary indexes should be removed

// proposalSchema.index({"data.retentionApplicationDate": 1});
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
