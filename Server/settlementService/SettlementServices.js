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
                "playerTopUpDaySummary_calculatePlatformDaySummaryForActiveValidPlayer",
                "playerTopUpWeekSummary_calculatePlatformWeekSummaryForPlayers",
                "checkPlatformFullAttendanceForPlayers",
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
                "checkPlatformPlayersRewardTask",
                "getPartnerPlayersCommissionInfo",
                "savePlayerCredit",
                "markDuplicatedConsumptionRecords",
                "processAutoProposals",
                "sendPlayerMailFromAdminToAllPlayers",
                "sendPlayerMailFromAdminToPlayer",
                "performPlatformPlayerLevelSettlement",
                "getConsumptionDetailOfPlayers",
                "calculatePlatformConsecutiveConsumptionForPlayers",
                "getDXNewPlayerDetail",
                "batchCreditTransferOut"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PlayerService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PlayerService.prototype.constructor = PlayerService;

        rootObj.PlayerService = PlayerService;
    };


    // Individual services should be declared above, and called in here
    var defineServices = function(sinonet){
        definePlayerService(sinonet);
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