var dbconfig = require('./../modules/dbproperties');
var mongoose = require('mongoose');
const dbProposal = require('./../db_modules/dbProposal');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const ObjectId = mongoose.Types.ObjectId;
const constPromoCodeTemplateGenre = require("./../const/constPromoCodeTemplateGenre");

var dbAuction = {
    /**
     * List All Auction Items
     */
    listAuctionItems: (query) => {
        return dbconfig.collection_auctionSystem.find(query).exec();
    },
    addAuctionItem: (data) => {
        return [];
    },
    loadAuctionItem: (id) => {
        return dbconfig.collection_auctionSystem.findOne({_id: ObjectId(id)}).exec();
    },
    updateAuctionProduct: (id, updateData) => {
        let matchObj = { _id : id};
        return dbconfig.collection_auctionSystem.findOneAndUpdate(matchObj, updateData,{ new : true}).exec();
    },
    moveTo: (data) => {

        let isActive;
        let proms = [];
        let updateData = {};
        if(data.direction == 'notAvailableItem'){
            updateData.publish = false; // let auction item inactive
        }else if(data.direction == 'exclusiveItem'){
            updateData.publish = true; // let auction item active
        }else if(data.direction == 'removeExclusiveAuction' || data.direction == 'removeNotAvailableAuction'){
            updateData.status = 0; // remove auction data
        }

        if(data.auctionItems && data.auctionItems.length > 0){
            let matchObj = {
                'platformObjId':ObjectId(data.platformId),
                '_id':{ $in: data.auctionItems }
            }
            return dbconfig.collection_auctionSystem.update(matchObj, updateData, {multi:true, new: true});
        };
    },

    isQualify: (playerObjId) => {
        return dbconfig.collection_players.findOne({_id: playerObjId})
            .populate({
                path: "csOfficer",
                model: dbconfig.collection_admin,
                select: 'departments roles'
            }).lean().then(
            playerData => {
                if (!playerData) {
                    return Promise.reject({name: "DataError", message: "Cannot find Player"});
                }

                let auctionQuery = {$and: []};

                if (!playerData.isRealPlayer) {
                    auctionQuery.playerType = 'Test Player';
                } else {
                    let orQuery = [];
                    orQuery.push({playerType: 'Real Player (all)'});
                    if (playerData.partner) {
                        orQuery.push({playerType: 'Real Player (Under Partner)'});
                    } else {
                        orQuery.push({playerType: 'Real Player (Individual)'});
                    }
                    auctionQuery.$and.push({$or: orQuery});
                }

                if (playerData.playerLevel) {
                    let orQuery = [];
                    orQuery.push({playerLevel: null});
                    orQuery.push({playerLevel: playerData.playerLevel});
                    auctionQuery.$and.push({$or: orQuery});
                }

                if (playerData.credibilityRemarks && playerData.credibilityRemarks.length) {
                    let orQuery = [];
                    orQuery.push({credibilityRemarks: []});
                    orQuery.push({credibilityRemarks: {$in: playerData.credibilityRemarks}});
                    // orQuery.push({filterCredibilityRemarks: []});
                    orQuery.push({filterCredibilityRemarks: {$nin: playerData.credibilityRemarks}});
                    auctionQuery.$and.push({$or: orQuery});
                } else {
                    let orQuery = [];
                    orQuery.push({credibilityRemarks: []});
                    orQuery.push({credibilityRemarks: null});
                    auctionQuery.$and.push({$or: orQuery});
                }

                if (playerData.lastAccessTime) {
                    let orQuery = [];
                    let daysDiff = Math.abs(new Date().getTime() - playerData.lastAccessTime.getTime());
                    daysDiff = Math.floor(daysDiff / (1000 * 3600 * 24));
                    orQuery.push({lastAccessOperator: null});
                    orQuery.push({lastAccessFormal: {$gte: daysDiff}});
                    orQuery.push({lastAccessLatter: {$lte: daysDiff}});
                    if (daysDiff >= 0 && daysDiff <=7) {
                        orQuery.push({lastAccessOperator: "0-7"});
                    } else if (daysDiff >= 8 && daysDiff <=14) {
                        orQuery.push({lastAccessOperator: "8-14"});
                    } else if (daysDiff >= 15 && daysDiff <=28) {
                        orQuery.push({lastAccessOperator: "15-28"});
                    } else if (daysDiff >= 29) {
                        orQuery.push({lastAccessOperator: "29"});
                    }
                    auctionQuery.$and.push({$or: orQuery});
                } else {
                    auctionQuery.lastAccessOperator = null;
                }

                if (playerData.lastFeedbackTime) {
                    let orQuery = [];
                    let feedbackDaysDiff = Math.abs(new Date().getTime() - playerData.lastFeedbackTime.getTime());
                    feedbackDaysDiff = Math.floor(feedbackDaysDiff / (1000 * 3600 * 24));
                    orQuery.push({filterFeedback: null});
                    orQuery.push({filterFeedback: {$gte: feedbackDaysDiff}});
                    auctionQuery.$and.push({$or: orQuery});
                } else {
                    let orQuery = [];
                    orQuery.push({filterFeedback: null});
                    orQuery.push({filterFeedback: 0});
                    auctionQuery.$and.push({$or: orQuery});
                }

                if (playerData.lastFeedbackTopic) {
                    let orQuery = [];
                    orQuery.push({filterFeedbackTopic: []});
                    orQuery.push({filterFeedbackTopic: {$ne: playerData.lastFeedbackTopic}});
                    auctionQuery.$and.push({$or: orQuery});
                } else {
                    let orQuery = [];
                    orQuery.push({filterFeedbackTopic: []});
                    orQuery.push({filterFeedbackTopic: null});
                    auctionQuery.$and.push({$or: orQuery});
                }

                if (playerData.topUpTimes) {
                    let orQuery = [];
                    orQuery.push({depositCountOperator: null});
                    orQuery.push({depositCountOperator: ">=", depositCountFormal: {$gte: playerData.topUpTimes}});
                    orQuery.push({depositCountOperator: "=", depositCountFormal: playerData.topUpTimes});
                    orQuery.push({depositCountOperator: "<=", depositCountFormal: {$lte: playerData.topUpTimes}});
                    orQuery.push({depositCountOperator: "range", depositCountFormal: {$gte: playerData.topUpTimes}, depositCountLatter: {$lte: playerData.topUpTimes}});
                } else {
                    let orQuery = [];
                    orQuery.push({depositCountOperator: null});
                    orQuery.push({depositCountFormal: 0});
                    auctionQuery.$and.push({$or: orQuery});
                }

                if (playerData.valueScore) {
                    let orQuery = [];
                    orQuery.push({playerValueOperator: null});
                    orQuery.push({playerValueOperator: ">=", playerValueFormal: {$gte: playerData.valueScore}});
                    orQuery.push({playerValueOperator: "=", playerValueFormal: playerData.valueScore});
                    orQuery.push({playerValueOperator: "<=", playerValueFormal: {$lte: playerData.valueScore}});
                    orQuery.push({playerValueOperator: "range", playerValueFormal: {$gte: playerData.valueScore}, playerValueLatter: {$lte: playerData.valueScore}});
                } else {
                    let orQuery = [];
                    orQuery.push({playerValueOperator: null});
                    orQuery.push({playerValueFormal: 0});
                    auctionQuery.$and.push({$or: orQuery});
                }

                if (playerData.consumptionTimes) {
                    let orQuery = [];

                    orQuery.push({consumptionTimesOperator: null});
                    orQuery.push({consumptionTimesOperator: ">=", consumptionTimesFormal: {$gte: playerData.consumptionTimes}});
                    orQuery.push({consumptionTimesOperator: "=", consumptionTimesFormal: playerData.consumptionTimes});
                    orQuery.push({consumptionTimesOperator: "<=", consumptionTimesFormal: {$lte: playerData.consumptionTimes}});
                    orQuery.push({consumptionTimesOperator: "range", consumptionTimesFormal: {$gte: playerData.consumptionTimes}, consumptionTimesLatter: {$lte: playerData.consumptionTimes}});
                } else {
                    let orQuery = [];
                    orQuery.push({consumptionTimesOperator: null});
                    orQuery.push({consumptionTimesFormal: 0});
                    auctionQuery.$and.push({$or: orQuery});
                }

                if (playerData.bonusAmountSum) {
                    let orQuery = [];
                    orQuery.push({bonusAmountOperator: ">=", bonusAmountFormal: {$gte: playerData.bonusAmountSum}});
                    orQuery.push({bonusAmountOperator: "=", bonusAmountFormal: playerData.bonusAmountSum});
                    orQuery.push({bonusAmountOperator: "<=", bonusAmountFormal: {$lte: playerData.bonusAmountSum}});
                    orQuery.push({bonusAmountOperator: "range", bonusAmountFormal: {$gte: playerData.bonusAmountSum}, bonusAmountLatter: {$lte: playerData.bonusAmountSum}});
                } else {
                    let orQuery = [];
                    orQuery.push({bonusAmountOperator: null});
                    orQuery.push({bonusAmountFormal: 0});
                    auctionQuery.$and.push({$or: orQuery});
                }

                if (playerData.withdrawTimes) {
                    let orQuery = [];
                    orQuery.push({withdrawTimesOperator: ">=", withdrawTimesFormal: {$gte: playerData.withdrawTimes}});
                    orQuery.push({withdrawTimesOperator: "=", withdrawTimesFormal: playerData.withdrawTimes});
                    orQuery.push({withdrawTimesOperator: "<=", withdrawTimesFormal: {$lte: playerData.withdrawTimes}});
                    orQuery.push({withdrawTimesOperator: "range", withdrawTimesFormal: {$gte: playerData.withdrawTimes}, withdrawTimesLatter: {$lte: playerData.withdrawTimes}});
                } else {
                    let orQuery = [];
                    orQuery.push({withdrawTimesOperator: null});
                    orQuery.push({withdrawTimesFormal: 0});
                    auctionQuery.$and.push({$or: orQuery});
                }

                if (playerData.topUpSum) {
                    let orQuery = [];
                    orQuery.push({topUpSumOperator: ">=", topUpSumFormal: {$gte: playerData.topUpSum}});
                    orQuery.push({topUpSumOperator: "=", topUpSumFormal: playerData.topUpSum});
                    orQuery.push({topUpSumOperator: "<=", topUpSumFormal: {$lte: playerData.topUpSum}});
                    orQuery.push({topUpSumOperator: "range", topUpSumFormal: {$gte: playerData.topUpSum}, topUpSumLatter: {$lte: playerData.topUpSum}});
                } else {
                    let orQuery = [];
                    orQuery.push({topUpSumOperator: null});
                    orQuery.push({topUpSumFormal: 0});
                    auctionQuery.$and.push({$or: orQuery});
                }

                if (playerData.gameProviderPlayed && playerData.gameProviderPlayed.length) {
                    let orQuery = [];
                    orQuery.push({gameProviderId: []});
                    orQuery.push({gameProviderId: {$in: playerData.gameProviderPlayed}});
                    auctionQuery.$and.push({$or: orQuery});
                } else {
                    let orQuery = [];
                    orQuery.push({gameProviderId: []});
                    orQuery.push({gameProviderId: null});
                    auctionQuery.$and.push({$or: orQuery});
                }

                if (playerData.registrationTime) {
                    let orQuery = [];
                    orQuery.push({registerStartTime: {$lte: playerData.registrationTime}, registerEndTime: {$gte: playerData.registrationTime}});
                    auctionQuery.$and.push({$or: orQuery});
                } else {
                    let orQuery = [];
                    orQuery.push({registerStartTime: null});
                    orQuery.push({registerEndTime: null});
                    auctionQuery.$and.push({$or: orQuery});
                }

                if (playerData.csOfficer && playerData.csOfficer.departments && playerData.csOfficer.departments.length
                    && playerData.csOfficer.roles && playerData.csOfficer.roles.length) {
                    let orQuery = [];
                    orQuery.push({admins: [], departments: {$in: playerData.csOfficer.departments}, roles: []});
                    orQuery.push({admins: [], departments: {$in: playerData.csOfficer.departments}, roles: {$in: playerData.csOfficer.roles}});
                    orQuery.push({admins: playerData.csOfficer._id, departments: {$in: playerData.csOfficer.departments}, roles: {$in: playerData.csOfficer.roles}});
                    auctionQuery.$and.push({$or: orQuery});
                } else {
                    let orQuery = [];
                    orQuery.push({departments: [], roles: [], admins: []});
                    auctionQuery.$and.push({$or: orQuery});
                }

                return dbconfig.collection_auctionSystem.find(auctionQuery).lean();
            }
        )
    },

    applyAuction: (data) =>{
        return [];
    },
    listAuctionMonitor: function(query){
        return dbconfig.collection_auctionSystem.find(query).then(
            data=>{
                console.log(data);
                return data;
            }
        )
    },
    createAuctionProduct: function (auctionProduct) {
        let templateProm = Promise.resolve(true);
        // only promoCodeTemplate needs to be generated first
        if (auctionProduct && auctionProduct.rewardData && auctionProduct.rewardData.rewardType && auctionProduct.rewardData.rewardType == "promoCode"){
            templateProm = generatePromoCodeTemplate(auctionProduct.rewardData, auctionProduct.platformObjId, auctionProduct.productName);
        }

        return templateProm.then(
            template => {
                if (template && template._id && auctionProduct && auctionProduct.rewardData){
                    auctionProduct.rewardData.templateObjId = template._id;
                }
                return dbconfig.collection_auctionSystem(auctionProduct).save();
            }
        ).then(
            data => {
                if (data) {
                    return JSON.parse(JSON.stringify(data));
                }
            },
            error => {
                return Promise.reject({name: "DBError", message: "Error creating auction product.", error: error});
            }
        );

        // to generate promoCodeTemplate for auction system
        function generatePromoCodeTemplate(rewardData, platformObjId, productName) {
            let allowedProviderList = [];
            if (rewardData.allowedProvider){
                allowedProviderList.push(ObjectId(rewardData.allowedProvider));
            }
            let obj = {
                platformObjId: platformObjId,
                allowedProviders: allowedProviderList,
                name: productName,
                isSharedWithXIMA: rewardData.isSharedWithXima,
                isProviderGroup: true,
                genre: constPromoCodeTemplateGenre.AUCTION,
                expiredInDay: rewardData.dueDateInDay,
                disableWithdraw: rewardData.isForbidWithdrawal,
                minTopUpAmount: rewardData.minimumTopUpAmount,
                createTime: new Date ()
            }

            if (rewardData.isDynamicRewardAmount){
                obj.amount = rewardData.rewardPercentage*100;
                obj.maxRewardAmount = rewardData.maximumRewardAmount;
                obj.requiredConsumption = rewardData.spendingTimes;
                obj.type = 3; // dynamic case
            }
            else{
                obj.amount = rewardData.rewardAmount;
                obj.requiredConsumption = rewardData.spendingAmount;
                obj.type = 1; // with top up requirement + fixed reward amount
            }

            let record = new dbconfig.collection_promoCodeTemplate(obj);
            return record.save();
        }
    },
};

module.exports = dbAuction;
