(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var rootObj = {};

    //create and add async function to WebSocketService
    var addServiceFunctions = function(sinonet, service, functionNames){
        for( var i = 0; i < functionNames.length; i++ ){
            service[functionNames[i]] = new sinonet.WebSocketAsyncFunction(functionNames[i]);
            service.addFunction(service[functionNames[i]]);
        }
    };

    //define player service functions
    var definePlayerService = function(sinonet){
        var PlayerService = function(connection){
            sinonet.WebSocketService.call(this, "player", connection);

            //define functions
            var functionNames = [
                "calculatePlayersDaySummaryForTimeFrame",
                "checkPlatformWeeklyConsumptionReturnForPlayers",
                "gameTypeConsumption_calculatePlatformWeekSummaryForPlayers",
                "playerConsumption_calculatePlatformWeekSummaryForPlayers",
                "playerTopUpDaySummary_calculatePlatformDaySummaryForPlayers",
                "playerReportDaySummary_calculatePlatformDaySummaryForPlayers",
                "winRateReportDaySummary_calculateWinRateReportDaySummaryForPlayers",
                "calculateDaySummary",
                "playerTopUpDaySummary_calculatePlatformDaySummaryForActiveValidPlayer",
                "playerTopUpWeekSummary_calculatePlatformWeekSummaryForPlayers",
                "checkPlatformFullAttendanceForPlayers",
                "settlePartnersBillBoard",
                "settlePartnersActivePlayer",
                "calculateProviderPlayersDaySummaryForTimeFrame",
                "calculatePartnerWeekSummaryForPartners",
                "calculatePartnerChildWeekSummaryForPartners",
                "performPartnerLevelMigrationForPartners",
                "checkPlatformWeeklyConsumptionReturnForPartners",
                "checkPartnerWeeklyReferralRewardForPartners",
                "checkPartnerWeeklyIncentiveRewardForPartners",
                "createExternalPlayerConsumptionList",
                "calculatePlatformConsumptionIncentiveForPlayers",
                "checkPlayerLevelDownForPlayers",
                "checkPlatformWeeklyTopUpReturnForPartners",
                "updateExternalPlayerConsumptionList",
                "getPlatformWeeklyConsumptionReturnInfoForPlayers",
                "calculatePartnersCommission",
                "calculatePartnersChildrenCommission",
                "getPartnerPlayersCommissionInfo",
                "savePlayerCredit",
                "markDuplicatedConsumptionRecords",
                "processAutoProposals",
                "processPartnerAutoProposals",
                "sendPlayerMailFromAdminToAllPlayers",
                "sendPlayerMailFromAdminToPlayer",
                "performPlatformPlayerLevelSettlement",
                "getConsumptionDetailOfPlayers",
                "getConsumptionDetailOfPlayerByLoginDevice",
                "calculatePlatformConsecutiveConsumptionForPlayers",
                "getDXNewPlayerDetail",
                "autoConvertPlayerRewardPoints",
                "bulkPlayerApplyReward",
                "batchCreditTransferOut",
                "performUnlockPlatformProviderGroup",
                "settlePartnersCommission",
                "getCurrentPartnersCommission",
                "getAllPlayerCommissionRawDetails",
                "getConsumptionActivePlayerAfterTopupQueryMatch",
                "findPartnersForCommissionReport",
                "generatePromoCodes",
                "tsPhoneCheckIsExistsAllPlatform",
                "generateCurrentPartnersCommissionDetail",
                "settlePartnersComm",
                "topupRecordInsertRepeatCount",
                "calculateProposalsTotalAmount",
                "getDXTrackingData"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PlayerService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PlayerService.prototype.constructor = PlayerService;

        rootObj.PlayerService = PlayerService;
    };

    var definePlatformService = function(sinonet){
        var PlatformService = function(connection){
            sinonet.WebSocketService.call(this, "platform", connection);

            //define functions
            var functionNames = [
                "updateRSAKeys"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PlatformService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PlatformService.prototype.constructor = PlatformService;

        rootObj.PlatformService = PlatformService;
    };


    // Individual services should be declared above, and called in here
    var defineServices = function(sinonet){
        definePlayerService(sinonet);
        definePlatformService(sinonet);
    };

    if(isNode){
        var sinonet = require("./../server_common/WebSocketService");
        defineServices(sinonet);
        module.exports = rootObj;
    } else {
        define(["common/WebSocketService"], function(sinonet){
            defineServices(sinonet);
            return rootObj;
        });
    }
})();