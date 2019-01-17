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
const constPromoCodeStatus = require("./../const/constPromoCodeStatus");

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

                return dbconfig.collection_auctionSystem.find(auctionQuery).lean();
            }
        )
    },
    applyAuction: (data) =>{
        return [];
    },
    listAuctionMonitor: function(query){
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
                return dbconfig.collection_auctionSystem.find(query).lean()
            }
        ).then(auctionItems=>{
            result = auctionItems;
            // if(auctionItems.length <= 0 ){ return }
            auctionItems.forEach(item=>{
                let period = dbAuction.getPeriodTime(item);
                let prom = dbconfig.collection_proposal.find({
                    type: {'$in': proposalType},
                    createTime:{
                        '$gte':period.startTime,
                        '$lte':period.endTime
                    },
                    'data.auction':item._id
                },{ 'proposalId':1, 'status':1, 'data.playerName':1, 'createTime':1, 'data.currentBidPrice':1 }).limit(10).sort('-createTime')
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
                remark = 'Auction Promo Code';
                break;
            case 'openPromoCode':
                proposalType = constProposalType.AUCTION_OPEN_PROMO_CODE;
                remark = 'Auction Open Promo Code';
                break;
            case 'promotion':
                proposalType = constProposalType.AUCTION_REWARD_PROMOTION;
                remark = 'Auction Reward Promotion';
                break;
            case 'realPrize':
                proposalType = constProposalType.AUCTION_REAL_PRIZE;
                remark = 'Auction Real Prize';
                break;
            case 'rewardPointsChange':
                proposalType = constProposalType.AUCTION_REWARD_POINT_CHANGE;
                remark = 'Auction Reward Point Change';
                break;
        }

        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
                return platformData;
            }
        ).then(
            platformData => {
                platform = platformData;
                platformObjId = platformData && platformData._id ? platformData._id : null;

                if (!proposalType) {
                    return Promise.reject({name: "DBError", message: "Proposal type not found"});
                }

                proposalTypeProm = dbconfig.collection_proposalType.findOne({
                    platformId: platformObjId,
                    name: proposalType,
                }).lean();

                return proposalTypeProm;
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

                playerProm = dbconfig.collection_players.findOne({
                    platform: platformObjId,
                    _id: playerId,
                }).populate({path: "rewardPointsObjId", model: dbconfig.collection_rewardPoints}).exec();

                auctionProm = dbconfig.collection_auctionSystem.findOne({
                    platformObjId: platformObjId,
                    productName: productName,
                }).exec();

                proposalProm = dbconfig.collection_proposal.findOne({
                    'data.platformId': platformObjId,
                    'data.productName': productName,
                    status: constProposalStatus.PENDING,
                    type: proposalTypeId,
                }).exec();

                return Promise.all([playerProm, auctionProm, proposalProm]).then(data => {
                    if (data) {
                        playerData = data[0];
                        auctionData = data[1];
                        proposalData = data[2];

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
                        return dbPlayerInfo.updatePlayerRewardPointsRecord(playerObjId, platformObjId, -playerBidPrice, 'bid auction item', null, null, playerData.name, inputDevice);
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

                        // return reward points to rejected bidder
                        return dbPlayerInfo.updatePlayerRewardPointsRecord(proposalData.data.playerObjId, proposalData.data.platformId, proposalData.data.currentBidPrice, 'refund bid', null, null, playerData.name, inputDevice);
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
                                auction: auctionData._id ? auctionData._id : ''
                            },
                            creator: {
                                name: playerName ? playerName : ''
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
                        if (auctionData && auctionData.rewardData.hasOwnProperty("isSharedWithXima")){
                            newProposal.data.isSharedWithXima = auctionData.rewardData.isSharedWithXima;
                        }
                        if (auctionData && auctionData.rewardData.hasOwnProperty("isForbidWithdrawal")){
                            newProposal.data.isForbidWithdrawal = auctionData.rewardData.isForbidWithdrawal;
                        }
                        if (auctionData && auctionData.rewardData.hasOwnProperty("useConsumption")){
                            newProposal.data.useConsumption = auctionData.rewardData.useConsumption;
                        }
                        if (auctionData && auctionData.rewardData.gameProviderGroup){
                            newProposal.data.providerGroup = auctionData.rewardData.gameProviderGroup;
                        }
                        if (playerName){
                            newProposal.data.playerName = playerName;
                        }

                        return dbProposal.createProposalWithTypeId(proposalTypeId, newProposal).then(
                            data => {
                                return data;
                            }
                        );
                    }
                );
            }
        );
    },
};

module.exports = dbAuction;
