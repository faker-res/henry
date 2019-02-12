var dbconfig = require('./../modules/dbproperties');
var mongoose = require('mongoose');
const dbProposal = require('./../db_modules/dbProposal');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const ObjectId = mongoose.Types.ObjectId;
const constProposalType = require('./../const/constProposalType');
const constProposalStatus = require("../const/constProposalStatus");
const constPromoCodeTemplateGenre = require("./../const/constPromoCodeTemplateGenre");
const dbutility = require('./../modules/dbutility');
const dbPlayerReward = require('./../db_modules/dbPlayerReward');
const errorUtils = require("./../modules/errorUtils");
const dbPlayerUtil = require("../db_common/dbPlayerUtility");
const proposalExecutor = require('./../modules/proposalExecutor');
const dbProposalUtility = require("./../db_common/dbProposalUtility");
const constPromoCodeStatus = require("./../const/constPromoCodeStatus");
var constServerCode = require('../const/constServerCode');

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
        let productDetail = null;
        return dbconfig.collection_auctionSystem.findOne({_id: ObjectId(id)}).lean().then(
            product => {
                productDetail = product;
                if (product && product.rewardData && product.rewardData.rewardType == 'openPromoCode' && product.rewardData.promoCode){
                    let queryObj = {
                        'data.promoCodeName': product.productName,
                        'data.promoCode': product.rewardData.promoCode,
                        'data.platformId': product.platformObjId,
                    };

                    return dbconfig.collection_proposal.find(queryObj).count();
                }
            }
        ).then(
            retData => {
                if (retData){
                    productDetail.rewardData.receivedQuantity = retData;
                }

                return productDetail;
            }
        );
    },
    updateAuctionProduct: (id, updateData) => {
        let updateProm = Promise.resolve();
        let matchObj = { _id : id};
        return dbconfig.collection_auctionSystem.findOneAndUpdate(matchObj, updateData,{ new : true}).lean().then(
            retData => {
                if(!retData){
                    return Promise.reject({
                        name: "DataError",
                        message: "Failed to update auction product"
                    })
                }

                if (retData && retData.rewardData && retData.rewardData.templateObjId && retData.rewardData.rewardType){
                    if (retData.rewardData.rewardType == "promoCode"){
                        updateProm = updatePromoCodeTemplate(retData.rewardData);
                    }
                    else if (retData.rewardData.rewardType == "openPromoCode"){
                        updateProm = updateOpenPromoCodeTemplate(retData.rewardData);
                    }
                }
                return updateProm;
            },
            error => {
                return Promise.reject({name: "DBError", message: "Error updating auction product.", error: error});
            }
        )

        // to update openPromoCodeTemplate for auction system
        function updateOpenPromoCodeTemplate(rewardData){
            let allowedProviderList = [];
            if (rewardData.allowedProvider){
                allowedProviderList.push(ObjectId(rewardData.allowedProvider));
            }
            let obj = {
                allowedProviders: allowedProviderList,
                isSharedWithXIMA: rewardData.isSharedWithXima,
                isProviderGroup: true,
                expiredInDay: rewardData.dueDateInDay,
                disableWithdraw: rewardData.isForbidWithdrawal,
                minTopUpAmount: rewardData.minimumTopUpAmount,
                applyLimitPerPlayer: rewardData.upperLimitPerPlayer,
                totalApplyLimit: rewardData.totalQuantityLimit,
                ipLimit: rewardData.limitPerSameIp,
                createTime: new Date ()
            };

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

            return dbconfig.collection_openPromoCodeTemplate.findOneAndUpdate({_id: rewardData.templateObjId}, obj).lean().then(
                retTemplate => {
                    if (retTemplate && !retTemplate.isDynamicRewardAmount){
                        if (retTemplate.hasOwnProperty("maxRewardAmount")){
                            return dbconfig.collection_openPromoCodeTemplate.findOneAndUpdate({_id: ObjectId(retTemplate._id)}, {maxRewardAmount: null}, {new: true}).lean();
                        }
                    }
                    return retTemplate;
                }
            );
        }

        // to update promoCodeTemplate for auction system
        function updatePromoCodeTemplate(rewardData) {
            let allowedProviderList = [];
            if (rewardData.allowedProvider){
                allowedProviderList.push(ObjectId(rewardData.allowedProvider));
            }
            let obj = {
                allowedProviders: allowedProviderList,
                isSharedWithXIMA: rewardData.isSharedWithXima,
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

            return dbconfig.collection_promoCodeTemplate.findOneAndUpdate({_id: templateObjId}, obj).lean().then(
                retTemplate => {
                    if (retTemplate && !retTemplate.isDynamicRewardAmount){
                        if (retTemplate.hasOwnProperty("maxRewardAmount")){
                            return dbconfig.collection_openPromoCodeTemplate.findOneAndUpdate({_id: ObjectId(retTemplate._id)}, {maxRewardAmount: null}, {new: true}).lean();
                        }
                    }
                    return retTemplate;
                }
            );
        }
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
    getAuctions: (playerObjId, platformId) => {
        let platformObjId;
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean()
        .then(platformData =>{
            if (!platformData) {
                return Promise.reject({name: "DataError", message: "Cannot find platform"});
            }
            platformObjId = platformData._id;
            return dbconfig.collection_players.findOne({_id: playerObjId})
                .populate({
                    path: "csOfficer",
                    model: dbconfig.collection_admin,
                    select: 'departments roles'
                }).lean()
        }).then(
            playerData => {
                if (!playerData) {
                    return Promise.reject({name: "DataError", message: "Cannot find Player"});
                }

                let auctionQuery = {$and: []};
                auctionQuery.status = 1;
                auctionQuery.publish = true;
                auctionQuery.platformObjId = platformObjId;

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
                    orQuery.push({departments: [], roles: [], admins: []});
                    orQuery.push({admins: [], departments: {$in: playerData.csOfficer.departments}, roles: []});
                    orQuery.push({admins: [], departments: {$in: playerData.csOfficer.departments}, roles: {$in: playerData.csOfficer.roles}});
                    orQuery.push({admins: playerData.csOfficer._id, departments: {$in: playerData.csOfficer.departments}, roles: {$in: playerData.csOfficer.roles}});
                    auctionQuery.$and.push({$or: orQuery});
                } else {
                    let orQuery = [];
                    orQuery.push({departments: [], roles: [], admins: []});
                    auctionQuery.$and.push({$or: orQuery});
                }

                let orQuery = [];
                let currentTime = dbutility.getUTC8Time(new Date());
                // find which week in this year
                let isoWeek = dbutility.getCurrentWeekInYear(currentTime);
                isoWeek = parseInt(isoWeek);
                // only show when in the appearPeriod interval.
                orQuery.push({rewardAppearStartPeriod: {$lte: currentTime}, rewardAppearEndPeriod: {$gte: currentTime} });
                auctionQuery.$and.push({$or: orQuery});

                return dbconfig.collection_auctionSystem.aggregate([
                    { $match : { platformObjId: ObjectId(platformObjId), publish: true, status:1 } },
                    { $unwind : "$rewardAppearPeriod"}, //ungroup field for easy conversion at each apperPeriod.
                    { $addFields : {
                        //do a date conversion for query purpose.
                        rewardAppearStartPeriod: {
                            // find what is the start period in this weekly / month interval
                            $cond: {
                                if: { $eq: [ "$rewardInterval", "monthly" ] },
                                then: { $dateFromParts: { 'year' : new Date().getFullYear(), 'month' : new Date().getMonth()+1, 'day':"$rewardAppearPeriod.startDate", 'hour' : "$rewardAppearPeriod.startTime"  }},
                                else: { $dateFromParts: { 'isoWeekYear' : new Date().getFullYear(), 'isoWeek':isoWeek, 'isoDayOfWeek':"$rewardAppearPeriod.startDate", 'hour' : "$rewardAppearPeriod.startTime"  }}
                            }
                        },
                        rewardAppearEndPeriod: {
                            // find what is the end period in this weekly / month interval
                            $cond: {
                                if: { $eq: [ "$rewardInterval", "monthly" ] },
                                then: { $dateFromParts: { 'year' : new Date().getFullYear(), 'month' : new Date().getMonth()+1, 'day':"$rewardAppearPeriod.endDate", 'hour' : "$rewardAppearPeriod.endTime"  }},
                                else: { $dateFromParts: { 'isoWeekYear' : new Date().getFullYear(), 'isoWeek':isoWeek, 'isoDayOfWeek':"$rewardAppearPeriod.endDate", 'hour' : "$rewardAppearPeriod.endTime"  }}
                            }
                        }
                    }
                    },
                    { $match : auctionQuery },
                    {
                        $group:{
                            _id: "$_id",
                            productName: { $first: "$productName"},
                            registerStartTime: { $first: "$registerStartTime"},
                            registerEndTime: { $first: "$registerEndTime"},
                            startPeriod: {  $push: "$rewardAppearStartPeriod" }, // return a readable date to frontend
                            endPeriod: {  $push: "$rewardAppearEndPeriod" }, // return a readable date to frontend
                            reservePrice: { $first: "$reservePrice"},
                            startingPrice: { $first: "$startingPrice"},
                            priceIncrement: { $first: "$priceIncrement"},
                            directPurchasePrice: { $first: "$directPurchasePrice"},
                            productStartTime: { $first: "$productStartTime"},
                            productEndTime: { $first: "$productEndTime"},
                            rewardInterval: { $first: "$rewardInterval"},
                            seller: { $first: "$seller"},
                            rewardData: { $first: "$rewardData"},
                            isExclusive: { $first: "$isExclusive"},
                            publish: { $first: "$publish"},
                            status: { $first: "$status"}
                        }
                    }
                ]).then(data=>{
                    return data;
                })
            }
        )
    },
    applyAuction: (data) =>{
        return [];
    },
    listAuctionMonitor: function(query, limit){
        let proms = [];
        let proposalType;
        let result = [];
        let sendQuery = {
            platformId: query.platformObjId,
            name : {'$in': [constProposalType.AUCTION_PROMO_CODE, constProposalType.AUCTION_OPEN_PROMO_CODE, constProposalType.AUCTION_REWARD_PROMOTION, constProposalType.AUCTION_REAL_PRIZE, constProposalType.AUCTION_REWARD_POINT_CHANGE]}
        };
        return dbconfig.collection_proposalType.find(sendQuery).lean()
        .then(
            proposalTypeData => {
                if (proposalTypeData.length > 0) {
                    proposalType = proposalTypeData.map(item=>{
                        return item._id;
                    })
                }
                console.log('query', query);
                return dbconfig.collection_auctionSystem.find(query).lean()
            }
        ).then(auctionItems=>{
            result = auctionItems;
            // if(auctionItems.length <= 0 ){ return }
            auctionItems.forEach(item=>{
                let period = dbAuction.getPeriodTime(item);
                let prom = dbAuction.getAuctionProposal(proposalType, period, item, limit)
                .then(proposal=>{
                    item.proposal = proposal;
                    return item;
                });
                proms.push(prom);
            })

            return Promise.all(proms).then(
                data=>{
                    return result
                }
            )
        })
    },
    getAuctionProposal: function(proposalType, period, item, limit){
        let sendQuery = {
           type: {'$in': proposalType},
           createTime:{
               '$gte':period.startTime,
               '$lte':period.endTime
           },
           'data.auction':item._id
        }
        let options ={ 'proposalId':1, 'status':1, 'data.playerName':1, 'createTime':1, 'data.currentBidPrice':1 };

        if(limit){
            options ={ 'type':1, 'proposalId':1, 'status':1, 'data.playerName':1, 'createTime':1, 'data.currentBidPrice':1 };
            return dbconfig.collection_proposal.find(sendQuery, options).populate({path: "type", model: dbconfig.collection_proposalType}).limit(limit).sort('-createTime');
        }else{
            return dbconfig.collection_proposal.find(sendQuery, options).sort('-createTime');
        }
    },

    getPeriodTime: function(auctionItem){
        let period;
        if(auctionItem.rewardInterval){
            if(auctionItem.rewardInterval == 'weekly'){
                period = dbutility.getCurrentWeekSGTime();
            }else if(auctionItem.rewardInterval == 'monthly'){
                period = dbutility.getCurrentMonthSGTIme();
            }
        }else{
            period = {
                startTime: auctionItem.rewardStartTime,
                endTime: auctionItem.rewardEndTime
            }
        }
        return period;
    },
    createAuctionProduct: function (auctionProduct) {
        let templateProm = Promise.resolve(true);
        let adminName = auctionProduct && auctionProduct.adminName ? auctionProduct.adminName : "";
        let adminId = auctionProduct && auctionProduct.adminId ? auctionProduct.adminId : "";
        let templateObjId = null;

        // only promoCodeTemplate needs to be generated first
        if (auctionProduct && auctionProduct.rewardData && auctionProduct.rewardData.rewardType && auctionProduct.rewardData.rewardType == "promoCode"){
            templateProm = generatePromoCodeTemplate(auctionProduct.rewardData, auctionProduct.platformObjId, auctionProduct.productName);
        }
        else if (auctionProduct && auctionProduct.rewardData && auctionProduct.rewardData.rewardType && auctionProduct.rewardData.rewardType == "openPromoCode"){
            templateProm = generateOpenPromoCodeTemplate(auctionProduct.rewardData, auctionProduct.platformObjId, auctionProduct.productName, adminName, adminId);
        }

        return templateProm.then(
            template => {
                templateObjId =  template && template._id ? ObjectId(template._id): null;
                if (template && template._id && auctionProduct && auctionProduct.rewardData){
                    auctionProduct.rewardData.templateObjId = template._id;
                }

                if (template && template.code && auctionProduct && auctionProduct.rewardData){
                    auctionProduct.rewardData.promoCode = template.code;
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
                let deleteProm = Promise.resolve(true);
                // delete the created template if the product cannot be created successfully
                if (templateObjId){
                    if (auctionProduct && auctionProduct.rewardData && auctionProduct.rewardData.rewardType && auctionProduct.rewardData.rewardType == "promoCode"){
                        deleteProm = dbconfig.collection_promoCodeTemplate.remove({_id: templateObjId});
                    }
                    else if (auctionProduct && auctionProduct.rewardData && auctionProduct.rewardData.rewardType && auctionProduct.rewardData.rewardType == "openPromoCode"){
                        deleteProm = dbconfig.collection_openPromoCodeTemplate.remove({_id: templateObjId});
                    }
                }
                return deleteProm.then(
                    () => {
                        return Promise.reject({name: "DBError", message: "Error creating auction product.", error: error});
                    }
                )
            }
        );

        // to generate openPromoCodeTemplate for auction system
        function generateOpenPromoCodeTemplate(rewardData, platformObjId, productName, adminName, adminId){
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
                applyLimitPerPlayer: rewardData.upperLimitPerPlayer,
                totalApplyLimit: rewardData.totalQuantityLimit,
                ipLimit: rewardData.limitPerSameIp,
                status: constPromoCodeStatus.DISABLE,
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

            return dbPlayerReward.generateOpenPromoCode(platformObjId, obj, adminId, adminName);
        }

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

    auctionExecuteEnd: function() {
        console.log("Auction end executing")
        let curTime = dbutility.getLocalTime(new Date());
        let curHour = new Date().getHours();
        let curDay = new Date().getDay();
        let curDate = new Date().getDate();

        let endQuery = {
            rewardStartTime: {$lte: curTime},
            rewardEndTime: {$gte: curTime},
            $or: [{
                'rewardInterval': "weekly",
                'rewardAppearPeriod.endDate': curDay,
                'rewardAppearPeriod.endTime': curHour
            }, {
                'rewardInterval': "monthly",
                'rewardAppearPeriod.endDate': curDate,
                'rewardAppearPeriod.endTime': curHour
            }],
            publish: true,
        };

        return dbconfig.collection_auctionSystem.find(endQuery).then(auctionItems => {
            console.log("auctionItems", auctionItems.length);
            if (auctionItems.length){
                let proms = [];

                auctionItems.forEach( item => {
                    if (item && item._id && item.platformObjId) {
                        // get the highest bidder and send out the auction reward
                        proms.push(runEndingAuctionProcess(item, curDay, curHour, curDate));
                    }
                })

                return Promise.all(proms);
            }
        });

        function runEndingAuctionProcess (auctionItem, curDay, curHour, curDate){
            let updateProm = Promise.resolve([]);
            let proposalTypeId = null;
            let productName = auctionItem.productName;
            let platformObjId = auctionItem.platformObjId;

            let query = {
                '_id': auctionItem._id,
                'platformObjId': auctionItem.platformObjId,
            };

            let proposalTypeQuery = {
                name: dbAuction.getProposalTypeByRewardType(auctionItem.rewardData.rewardType),
                platformId: platformObjId
            }
            return dbconfig.collection_proposalType.findOne(proposalTypeQuery).lean().then(
                proposalType => {
                    if (proposalType){
                        proposalTypeId = proposalType._id
                    }
                    else{
                        return Promise.reject({
                            name: "DBError",
                            message: "Cannot get the proposalType."
                        })
                    }
                    // get the highest bidder and send out the auction reward
                    return dbAuction.listAuctionMonitor(query, 1);
                }
            ).then(
                proposal => {
                    //  update the highest bidder proposal that has not been processed yet
                    if (proposal && proposal[0] && proposal[0].proposal && proposal[0].proposal[0] && proposal[0].proposal[0]._id && proposal[0].proposal[0].status == constProposalStatus.PENDING){
                        let updateQuery = {
                            status: constProposalStatus.SUCCESS
                        };

                        updateProm = dbconfig.collection_proposal.findOneAndUpdate({_id: ObjectId(proposal[0].proposal[0]._id)}, updateQuery, {new: true}).populate({path: "type", model: dbconfig.collection_proposalType}).lean();
                    }
                    return updateProm
                }
            ).then(
                updatedProposal => {
                    console.log("checking updatedProposal", updatedProposal)
                    if (updatedProposal && updatedProposal.type && updatedProposal.type.executionType && updatedProposal.type.rejectionType){
                        // execute the propoasl type
                        return proposalExecutor.approveOrRejectProposal(updatedProposal.type.executionType, updatedProposal.type.rejectionType, true, updatedProposal);
                    }
                }
            ).then(
                () => {
                    // find bid proposal in pending status
                    if (platformObjId && proposalTypeId && productName){
                        let intervalTime = dbAuction.convertMatchingAuctionDateToDateFormat(auctionItem, curDay, curHour, curDate);

                        return dbconfig.collection_proposal.find(
                            {
                                type: proposalTypeId,
                                'data.platformId': platformObjId,
                                'data.productName': productName,
                                status: constProposalStatus.PENDING,
                                createTime: {
                                    $gte: new Date(intervalTime.startTime),
                                    $lt: new Date(intervalTime.endTime)
                                }
                            }
                        ).lean();
                    }

                }
            ).then(
                proposalDataList => {
                    let updateRejectProm = [];
                    if (proposalDataList && proposalDataList.length) {
                        // update the status to rejected
                        proposalDataList.forEach(
                            proposalData => {
                                if (proposalData && proposalData._id) {
                                    updateRejectProm.push(rejectProposalAndRefund(proposalData))
                                }
                            }
                        )
                    }

                    return Promise.all(updateRejectProm);
                }
            ).catch(errorUtils.reportError)
        }

        function rejectProposalAndRefund(proposalData){
           return dbconfig.collection_proposal.findOneAndUpdate(
               {
                   _id: proposalData._id,

               },
               {
                   $set: {
                       status: constProposalStatus.REJECTED
                   }
               },
               {new: true}
           ).lean().then(
               proposalDetail => {
                   if (proposalDetail && proposalDetail.data) {
                       let creator = proposalDetail.data.seller || 'System';
                       // return reward points to rejected bidder
                       return dbPlayerInfo.updatePlayerRewardPointsRecord(proposalDetail.data.playerObjId, proposalDetail.data.platformId, proposalDetail.data.currentBidPrice, 'Refund from bidding item: ' + proposalDetail.data.productName || "", null, null, creator, proposalDetail.inputDevice);
                   }
               }
           )
        }

    },

    convertMatchingAuctionDateToDateFormat: function (auctionItem, curDay, curHour, curDate){
        let periodData = null;
        let endHour = null;
        let startHour = null;
        let startDate = null;
        let endDate = null;
        let calEndTime = null
        let calStartTime = null;
        let tempDate = new Date();

        if (auctionItem.rewardInterval == "weekly" && auctionItem.rewardAppearPeriod){
            if (auctionItem.rewardAppearPeriod.length == 1){
                periodData = auctionItem.rewardAppearPeriod[0];
            }
            else{
                // search for the time interval
                let segmentIndex = auctionItem.rewardAppearPeriod.findIndex( p => p.endTime == curHour && p.endDate == curDay);
                if (segmentIndex != -1){
                    periodData = auctionItem.rewardAppearPeriod[segmentIndex];
                }
            }

            console.log("checking periodData",  periodData)
            if (periodData) {
                endHour = parseInt(periodData.endTime);
                startHour = parseInt(periodData.startTime);
                startDate = parseInt(periodData.startDate);
                endDate = parseInt(periodData.endDate);

                let diff = endDate - startDate;
                let dayDiff = diff < 0 ? diff + 7 : diff;

                calEndTime = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), endHour, 0, 0, 0);
                if (dayDiff == 0) {
                    calStartTime = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), startHour, 0, 0, 0);
                } else {
                    calStartTime = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate() - dayDiff, startHour, 0, 0, 0)
                }
            }
        }
        else if (auctionItem.rewardInterval == "monthly" && auctionItem.rewardAppearPeriod){
            if (auctionItem.rewardAppearPeriod.length == 1){
                periodData = auctionItem.rewardAppearPeriod[0];
            }
            else{
                // search for the time interval
                let segmentIndex = auctionItem.rewardAppearPeriod.findIndex( p => p.endTime == curHour && p.endDate == curDate);
                if (segmentIndex != -1){
                    periodData = auctionItem.rewardAppearPeriod[segmentIndex];
                }
            }

            console.log("checking periodData",  periodData)
            if (periodData) {
                endHour = parseInt(periodData.endTime);
                startHour = parseInt(periodData.startTime);
                startDate = parseInt(periodData.startDate);
                endDate = parseInt(periodData.endDate);

                calEndTime = new Date(tempDate.getFullYear(), tempDate.getMonth(), endDate, endHour, 0, 0, 0);
                calStartTime = new Date(tempDate.getFullYear(), tempDate.getMonth(), startDate, startHour, 0, 0, 0);
            }
        }

        if (!calStartTime || !calEndTime){
            return Promise.reject({
                name: "DBError",
                message: "Cant find the startTime and endTime of the auction item",
            })
        }

        console.log("checking calStartTime", calStartTime)
        console.log("checking calEndTime", calEndTime)
        return {startTime: calStartTime, endTime: calEndTime};
    },

    getProposalTypeByRewardType: function(rewardType){
        let proposalType = null;
        switch (rewardType) {
            case 'promoCode':
                proposalType = constProposalType.AUCTION_PROMO_CODE;
                break;
            case 'openPromoCode':
                proposalType = constProposalType.AUCTION_OPEN_PROMO_CODE;
                break;
            case 'promotion':
                proposalType = constProposalType.AUCTION_REWARD_PROMOTION;
                break;
            case 'realPrize':
                proposalType = constProposalType.AUCTION_REAL_PRIZE;
                break;
            case 'rewardPointsChange':
                proposalType = constProposalType.AUCTION_REWARD_POINT_CHANGE;
                break;
        }

        if (!proposalType){
            return Promise.reject({
                name: "DataError",
                message: "Cannot find the proposalType based on the rewardType for auction item"
            })
        }
        return proposalType
    },

    bidAuctionItem: function (inputData, platformId, productName, rewardType, playerId, inputDevice) {
        let playerProm = Promise.resolve(true);
        let auctionProm = Promise.resolve(true);
        let proposalProm = Promise.resolve(true);
        let proposalTypeProm = Promise.resolve(true);
        let bidAmount = inputData && inputData.bidAmount ? inputData.bidAmount : null;
        let proposalType = null;
        let remark = '';
        let platform = null;
        let platformObjId = null;
        let playerObjId = null;
        let playerName = null;
        let auctionProductPublishStartTime = null;
        let auctionProductPublishEndTime = null;
        let auctionProductDirectPurchasePrice = null;
        let playerBidPrice = null;
        let playerData = null;
        let auctionData = null;
        let proposalData = null;
        let proposalTypeId = null;
        let timeNow = new Date().getTime();
        let curTime = dbutility.getUTC8Time(new Date());

        if (!playerId) {
            return Promise.reject({name: "DBError", message: "Player is not found"});
        }
        if (!productName) {
            return Promise.reject({name: "DBError", message: "Product name is not found"});
        }
        if (!rewardType) {
            return Promise.reject({name: "DBError", message: "Reward type is not found"});
        }

        switch (rewardType) {
            case 'promoCode':
                proposalType = constProposalType.AUCTION_PROMO_CODE;
                remark = productName;
                break;
            case 'openPromoCode':
                proposalType = constProposalType.AUCTION_OPEN_PROMO_CODE;
                remark = productName;
                break;
            case 'promotion':
                proposalType = constProposalType.AUCTION_REWARD_PROMOTION;
                remark = productName;
                break;
            case 'realPrize':
                proposalType = constProposalType.AUCTION_REAL_PRIZE;
                remark = productName;
                break;
            case 'rewardPointsChange':
                proposalType = constProposalType.AUCTION_REWARD_POINT_CHANGE;
                remark = productName;
                break;
        }

        return dbconfig.collection_players.findOne({
            _id: playerId
        }).populate({path: "rewardPointsObjId", model: dbconfig.collection_rewardPoints}).lean().then(
            player => {
                if (!player){
                    return Promise.reject({
                        name: "DataError",
                        message: "Cannot find player"
                    })
                }

                playerData = player;
                return dbPlayerUtil.setPlayerBState(player._id, "auctionBidding", true);
            }
        ).then(
            playerState => {
                if (playerState) {
                    return dbconfig.collection_platform.findOne({platformId: platformId}).lean();
                } else {
                    return Promise.reject({
                        name: "DBError",
                        status: constServerCode.CONCURRENT_DETECTED,
                        message: "Bidding Fail, please try again later"
                    })
                }
            }
        ).then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
                platform = platformData;
                platformObjId = platformData && platformData._id ? platformData._id : null;

                if (!proposalType) {
                    return Promise.reject({name: "DBError", message: "Proposal type not found"});
                }

                return proposalTypeProm = dbconfig.collection_proposalType.findOne({
                    platformId: platformObjId,
                    name: proposalType,
                }).lean();
            }
        ).then(
            proposalTypeData => {
                proposalTypeId = proposalTypeData && proposalTypeData._id ? proposalTypeData._id : null;

                if (!proposalTypeId){
                    return Promise.reject({
                        name: "DataError",
                        message: "Cannot find the proposalTypeId"
                    })
                }

                let query = {
                    'data.platformId': platformObjId,
                    'data.productName': productName,
                    status: {$in: [constProposalStatus.APPROVE, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                    type: proposalTypeId,
                };
                return dbconfig.collection_proposal.find(query).count();
            }
        ).then(
            successCount => {
                if (successCount){
                    return Promise.reject({
                        message: "This product has already sold out"
                    })
                }

                auctionProm = dbconfig.collection_auctionSystem.findOne({
                    platformObjId: platformObjId,
                    productName: productName,
                    rewardStartTime: {$lte: new Date(timeNow)},
                    rewardEndTime: {$gte: new Date(timeNow)},
                    publish: true,
                }).lean();

                proposalProm = dbconfig.collection_proposal.findOne({
                    'data.platformId': platformObjId,
                    'data.productName': productName,
                    status: constProposalStatus.PENDING,
                    type: proposalTypeId,
                }).lean();

                return Promise.all([auctionProm, proposalProm]).then(data => {
                    if (data) {
                        auctionData = data[0];
                        proposalData = data[1];

                        if (!auctionData){
                            return Promise.reject({
                                name: "DBError",
                                message: "The bidding product is not found."
                            })
                        }

                        let isWithinInterval = false;
                        if (auctionData.rewardAppearPeriod && auctionData.rewardAppearPeriod.length){
                            for (let i = 0; i < auctionData.rewardAppearPeriod.length; i ++){
                                let interval = auctionData.rewardAppearPeriod[i];
                                if (interval && interval.hasOwnProperty('endDate') && interval.hasOwnProperty('endTime') &&interval.hasOwnProperty('startDate') && interval.hasOwnProperty('startTime')){
                                    isWithinInterval = isWithinAuctionTimeInterval(interval, auctionData.rewardInterval, curTime, new Date(timeNow))
                                    if (isWithinInterval){
                                        break;
                                    }
                                }
                            }
                        }

                        if (!isWithinInterval){
                            return Promise.reject({
                                name: "DBError",
                                message: "The bidding is not started yet or has already ended for the product."
                            })
                        }

                        // check if the same player bidding again (consecutively)
                        if (proposalData && proposalData.data && proposalData.data.playerName && playerData && playerData.name){
                            if (proposalData.data.playerName == playerData.name){
                                return Promise.reject({
                                    name: "DBError",
                                    message: "You have just bid, the highest bidder is still you."
                                })
                            }
                        }

                        playerObjId = playerData && playerData._id ? playerData._id : null;
                        playerName = playerData && playerData.name ? playerData.name : null;
                        let playerRewardPoints = playerData && playerData.rewardPointsObjId && playerData.rewardPointsObjId.points ? playerData.rewardPointsObjId.points : 0;
                        let auctionProductIsPublish = auctionData && auctionData.publish ? auctionData.publish : false;
                        /** time **/
                        let auctionProductRewardStartTime = auctionData && auctionData.rewardStartTime ? auctionData.rewardStartTime : null;
                        let auctionProductRewardEndTime = auctionData && auctionData.rewardEndTime ? auctionData.rewardEndTime : null;
                        let auctionProductProductStartTime = auctionData && auctionData.productStartTime ? auctionData.productStartTime : null; // in minutes
                        let auctionProductProductEndTime = auctionData && auctionData.productEndTime ? auctionData.productEndTime : null; // in minutes
                        auctionProductPublishStartTime = auctionProductRewardStartTime && auctionProductProductStartTime ? auctionProductRewardStartTime.getTime() - (auctionProductProductStartTime * 60 * 1000) : null; // before reward time
                        auctionProductPublishEndTime = auctionProductRewardEndTime && auctionProductProductEndTime ? auctionProductRewardEndTime.getTime() + (auctionProductProductEndTime * 60 * 1000) : null; // after reward time
                        /** price **/
                        let auctionProductStartingPrice = auctionData && auctionData.startingPrice ? auctionData.startingPrice : null;
                        let auctionProductPriceIncrement = auctionData && auctionData.priceIncrement ? auctionData.priceIncrement : null;
                        auctionProductDirectPurchasePrice = auctionData && auctionData.directPurchasePrice ? auctionData.directPurchasePrice : null;
                        let auctionProposalCurrentBidPrice = proposalData && proposalData.data && proposalData.data.currentBidPrice ? proposalData.data.currentBidPrice : null;

                        if (!bidAmount) {
                            playerBidPrice = auctionProposalCurrentBidPrice && auctionProductPriceIncrement ? parseInt(auctionProposalCurrentBidPrice) + parseInt(auctionProductPriceIncrement) : null;
                        } else {
                            playerBidPrice = parseInt(bidAmount);
                        }

                        if (timeNow < auctionProductPublishStartTime) {
                            return Promise.reject({name: "DBError", message: "Auction bidding has not started"});
                        }
                        if (timeNow > auctionProductPublishEndTime) {
                            return Promise.reject({name: "DBError", message: "Auction bidding has already ended"});
                        }
                        if (!auctionProductIsPublish) {
                            return Promise.reject({name: "DBError", message: "This product has not been published yet"});
                        }

                        if (playerBidPrice == null){
                            return Promise.reject({
                                name: "DBError",
                                message: "The bid amount is not available"}
                            )
                        }
                        if (playerRewardPoints < auctionProductStartingPrice) {
                            return Promise.reject({name: "DBError", message: "Player does not have enough reward points"});
                        }
                        // check if the bid price is larger than the startingPrice
                        if (playerBidPrice <= auctionProductStartingPrice) {
                            return Promise.reject({name: "DBError", message: "Your bid price is lower or equal to the starting price, please bid higher"});
                        }
                        if (playerBidPrice <= auctionProposalCurrentBidPrice) {
                            let msg = "Your bid price is equal or lower than current highest bid price (" + auctionProposalCurrentBidPrice + "), please bid higher";
                            return Promise.reject({name: "DBError", message: msg});
                        }
                        // check if the bid amount is smaller than the pre-set price increment
                        if (auctionProductPriceIncrement){
                            let priceDiff;
                            if (auctionProposalCurrentBidPrice){
                                // if there is current bid price, the price difference = new bid price - current bid price
                                priceDiff = playerBidPrice - auctionProposalCurrentBidPrice
                            }
                            else{
                                priceDiff = playerBidPrice - auctionProductStartingPrice
                            }

                            if (priceDiff < auctionProductPriceIncrement){
                                return Promise.reject({
                                    name: "DBError",
                                    message: "The increment in bidding is lower than the pre-set amount"
                                })
                            }
                        }

                        // deduct reward points from current bidder, if not enough reward points, will return error
                        return dbPlayerInfo.updatePlayerRewardPointsRecord(playerObjId, platformObjId, -playerBidPrice, 'Bidding item: ' + auctionData.productName || "" , null, null, playerData.name, inputDevice);
                    }
                }).then(
                    () => {
                        // find bid proposal in pending status
                        return dbconfig.collection_proposal.findOne(
                            {
                                type: proposalTypeId,
                                'data.platformId': platformObjId,
                                'data.productName': productName,
                                status: constProposalStatus.PENDING,
                                createTime: {
                                    $gte: new Date(auctionProductPublishStartTime),
                                    $lt: new Date(auctionProductPublishEndTime)
                                }
                            }
                        );
                    }
                ).then(
                    proposalData => {
                        if (!proposalData) return false; // skip reject proposal

                        // previous bid proposal will be rejected and return their reward points
                        return dbconfig.collection_proposal.findOneAndUpdate(
                            {
                                _id: proposalData._id,
                                createTime: proposalData.createTime,
                                type: proposalData.type,
                            },
                            {
                                $set: {
                                    status: constProposalStatus.REJECTED
                                }
                            },
                            {new: true}
                        ).exec();
                    }
                ).then(
                    proposalData => {
                        if (!proposalData) return true; // skip refund reward points

                        let creator = proposalData.data.seller || 'System';
                        // return reward points to rejected bidder
                        return dbPlayerInfo.updatePlayerRewardPointsRecord(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.data.currentBidPrice, 'Refund from bidding item: ' + auctionData.productName || "", null, null, creator, inputDevice);
                    }
                ).then(
                    () => {
                        let proposalStatus = constProposalStatus.PENDING;

                        // if player bid equal or higher than direct purchase price, proposal become Success
                        if (playerBidPrice >= auctionProductDirectPurchasePrice) {
                            proposalStatus = constProposalStatus.SUCCESS;
                        }

                        let newProposal = {
                            data: {
                                playerObjId: playerObjId,
                                platformId: platformObjId,
                                productName: productName,
                                currentBidPrice: playerBidPrice,
                                remark: remark,
                                auction: auctionData._id ? auctionData._id : '',
                                updateAmount: playerBidPrice
                            },
                            creator: {
                                name: auctionData && auctionData.seller ? auctionData.seller : playerName || null
                            },
                            status: proposalStatus,
                            type: proposalTypeId
                        };
                        if (inputDevice) {
                            newProposal.inputDevice = inputDevice;
                        }
                        if (auctionData && auctionData.rewardData && auctionData.rewardData.templateObjId){
                            newProposal.data.templateObjId = auctionData.rewardData.templateObjId;
                        }
                        if (auctionData && auctionData.seller){
                            newProposal.data.seller = auctionData.seller;
                        }
                        if (auctionData && auctionData.rewardData.hasOwnProperty("isSharedWithXima")){
                            newProposal.data.isSharedWithXima = auctionData.rewardData.isSharedWithXima;
                        }
                        if (auctionData && auctionData.rewardData && auctionData.rewardData.hasOwnProperty("isForbidWithdrawal")){
                            newProposal.data.isForbidWithdrawal = auctionData.rewardData.isForbidWithdrawal;
                        }
                        if (auctionData && auctionData.rewardData && auctionData.rewardData.hasOwnProperty("useConsumption")){
                            newProposal.data.useConsumption = auctionData.rewardData.useConsumption;
                        }
                        if (auctionData && auctionData.rewardData && auctionData.rewardData.gameProviderGroup){
                            newProposal.data.providerGroup = auctionData.rewardData.gameProviderGroup;
                        }
                        if (playerName){
                            newProposal.data.playerName = playerName;
                        }
                        // specially for auction product: reward promotion
                        if (auctionData && auctionData.rewardData && auctionData.rewardData.unlockAmount && proposalType == constProposalType.AUCTION_REWARD_PROMOTION){
                            newProposal.data.requiredUnlockAmount = auctionData.rewardData.unlockAmount;
                        }
                        if (auctionData && auctionData.rewardData && auctionData.rewardData.rewardAmount && proposalType == constProposalType.AUCTION_REWARD_PROMOTION){
                            newProposal.data.rewardAmount = auctionData.rewardData.rewardAmount;
                        }
                        if (auctionData && auctionData.rewardData && auctionData.rewardData.hasOwnProperty("useConsumption") && proposalType == constProposalType.AUCTION_REWARD_PROMOTION){
                            newProposal.data.useConsumption = auctionData.rewardData.useConsumption;
                        }
                        if (platform && platform.hasOwnProperty("useProviderGroup") && proposalType == constProposalType.AUCTION_REWARD_PROMOTION){
                            newProposal.data.isGroupReward = platform.useProviderGroup;
                        }
                        if (auctionData && auctionData.rewardData && auctionData.rewardData.hasOwnProperty("rewardPointsVariable")){
                            newProposal.data.rewardPointsVariable = auctionData.rewardData.rewardPointsVariable;
                        }

                        newProposal.data.isExclusive = auctionData.isExclusive;
                        newProposal.data.startingPrice = auctionData.startingPrice || null;
                        newProposal.data.directPurchasePrice = auctionData.directPurchasePrice || null;

                        return dbProposal.createProposalWithTypeId(proposalTypeId, newProposal).then(
                            data => {
                                // Reset BState
                                dbPlayerUtil.setPlayerBState(playerData._id, "auctionBidding", false).catch(errorUtils.reportError);
                                return data;
                            }
                        );
                    }
                );
            }
        ).catch(
            err => {
                if (err.status === constServerCode.CONCURRENT_DETECTED) {
                    // Ignore concurrent request for now
                } else {
                    // Set BState back to false
                    dbPlayerUtil.setPlayerBState(playerData._id, "auctionBidding", false).catch(errorUtils.reportError);
                }

                console.log('bidding error', playerId, err);
                throw err;
            }
        )

        function isWithinAuctionTimeInterval(periodData, intervalMode, currentTime, currentISOTime) {
            let intervalDate= null;
            let isWithin = false;
            let endHour = parseInt(periodData.endTime);
            let startHour = parseInt(periodData.startTime);
            let startDate = parseInt(periodData.startDate);
            let endDate = parseInt(periodData.endDate);

            if (intervalMode == "weekly") {
                intervalDate = generateDateForWeekDay(startDate, startHour, endDate, endHour, currentTime);

            } else if (intervalMode == "monthly") {
                intervalDate = generateDateForMonth(startDate, startHour, endDate, endHour, currentTime);
            }

            console.log("checking currentISOTime)", currentISOTime)
            console.log("checking intervalDate)", intervalDate)
            return intervalDate && intervalDate.startTime <= currentISOTime && intervalDate.endTime >= currentISOTime ? true : false;
        }

        function generateDateForWeekDay(startDay, startHour, endDay, endHour, currentTime) {
            let startInterval = null;
            let endInterval = null;
            let currentDay = new Date(currentTime).getDay();
            currentDay = currentDay == 0 ? 7 : currentDay; // convert the day to the standard used in db

            if (startDay < currentDay){
                let dayDiff = currentDay - startDay;
                startInterval = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() - dayDiff, startHour, 0, 0, 0)
            }
            else if (startDay > currentDay){

                if(endDay >= startDay){
                    let dayDiff = startDay - currentDay;
                    startInterval = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() + dayDiff, startHour, 0, 0, 0)
                }
                else{
                    let dayDiff2 = currentDay - startDay + 7;
                    startInterval = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() - dayDiff2, startHour, 0, 0, 0)
                }
            }
            else{
                startInterval = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startHour, 0, 0, 0)
            }

            if (endDay < startDay){
                let dayDiff = endDay - startDay + 7;
                endInterval = new Date(startInterval.getFullYear(), startInterval.getMonth(), startInterval.getDate() + dayDiff, endHour, 0, 0, 0)
            }
            else if (endDay > startDay){
                let dayDiff = endDay - startDay;
                endInterval = new Date(startInterval.getFullYear(), startInterval.getMonth(), startInterval.getDate() + dayDiff, endHour, 0, 0, 0)
            }
            else{
                endInterval = new Date(startInterval.getFullYear(), startInterval.getMonth(), startInterval.getDate(), endHour, 0, 0, 0)
            }

            return {startTime: startInterval, endTime: endInterval};
        }

        function generateDateForMonth(startDate, startHour, endDate, endHour, currentTime) {
            let startInterval = null;
            let endInterval = null;
            let currentDate = new Date(currentTime).getDate();

            if (startDate < currentDate){
                let dayDiff = currentDate - startDate;
                startInterval = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() - dayDiff, startHour, 0, 0, 0)
            }
            else if (startDate > currentDate){
                let dayDiff = startDate - currentDate;
                startInterval = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() + dayDiff, startHour, 0, 0, 0)
            }
            else{
                startInterval = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startHour, 0, 0, 0)
            }

            if (endDate < startDate){
                // which is not supposed to happen
                let dayDiff = endDate - startDate
                endInterval = new Date(startInterval.getFullYear(), startInterval.getMonth(), startInterval.getDate() - dayDiff, endHour, 0, 0, 0)
            }
            else if (endDate > startDate){
                let dayDiff = endDate - startDate;
                endInterval = new Date(startInterval.getFullYear(), startInterval.getMonth(), startInterval.getDate() + dayDiff, endHour, 0, 0, 0)
            }
            else{
                endInterval = new Date(startInterval.getFullYear(), startInterval.getMonth(), startInterval.getDate(), endHour, 0, 0, 0)
            }

            return {startTime: startInterval, endTime: endInterval}
        }
    },
};

module.exports = dbAuction;
