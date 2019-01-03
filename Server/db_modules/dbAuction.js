var dbconfig = require('./../modules/dbproperties');
var mongoose = require('mongoose');
const dbProposal = require('./../db_modules/dbProposal');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const ObjectId = mongoose.Types.ObjectId;
const constProposalType = require('./../const/constProposalType');
const constProposalStatus = require("../const/constProposalStatus");
const constPromoCodeTemplateGenre = require("./../const/constPromoCodeTemplateGenre");
const dbutility = require('./../modules/dbutility');

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
    isQualify: (data) => {
        return [];
        // return dbconfig.collection_auctions.find();
    },
    applyAuction: (data) =>{
        return [];
    },
    listAuctionMonitor: function(query){
        let proms = [];
        let proposalType;
        let result = [];

        return dbconfig.collection_proposalType.findOne({
            platformId: query.platformObjId,
            name: constProposalType.PLAYER_TOP_UP
        }).lean()
        .then(
            proposalTypeData => {
                if (proposalTypeData) {
                    proposalType = proposalTypeData;
                }
                return dbconfig.collection_auctionSystem.find(query).lean()
            }
        ).then(auctionItems=>{
            result = auctionItems;
            // if(auctionItems.length <= 0 ){ return }
            auctionItems.forEach(item=>{
                let period = dbAuction.getPeriodTime(item);
                let prom = dbconfig.collection_proposal.find({
                    type: proposalType._id,
                    $or: [{status: constProposalStatus.APPROVED}, {status: constProposalStatus.SUCCESS}],
                    createTime:{
                        '$gte':period.startTime,
                        '$lte':period.endTime
                    }
                },{ 'proposalId':1, 'status':1, 'data.playerName':1, 'createTime':1 }).limit(10).sort('-createTime')
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
            }else if(auctionItem.rewardInterval == 'monthly'){
                period = {
                    startTime: auctionItem.rewardStartTime,
                    endTime: auctionItem.rewardEndTime
                }
            }
        }
        return period;
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
