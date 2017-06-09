(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var rootObj = {};

    //create and add async function to WebSocketService
    var addServiceFunctions = function (sinonet, service, functionNames) {
        for (var i = 0; i < functionNames.length; i++) {
            service[functionNames[i]] = new sinonet.WebSocketAsyncFunction(functionNames[i]);
            service.addFunction(service[functionNames[i]]);
        }
    };

    //create and add sync function to WebSocketService
    var addServiceSyncFunctions = function (sinonet, service, functionNames, keys) {
        for (var i = 0; i < functionNames.length; i++) {
            service[functionNames[i]] = new sinonet.WebSocketSyncFunction(functionNames[i], keys);
            service.addFunction(service[functionNames[i]]);
        }
    };

    var defineConnectionService = function (sinonet) {
        var ConnectionService = function (connection) {
            sinonet.WebSocketService.call(this, "connection", connection);

            //define functions
            var functionNames = [
                "login",
                "heartBeat"

            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        ConnectionService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ConnectionService.prototype.constructor = ConnectionService;

        rootObj.ConnectionService = ConnectionService;
    };

    var defineAdminService = function (sinonet) {
        var AdminService = function (connection) {
            sinonet.WebSocketService.call(this, "admin", connection);

            //define functions
            var functionNames = [
                "createDepartment",
                "createUser"
            ];
            addServiceFunctions(sinonet, this, functionNames);

        };

        AdminService.prototype = Object.create(sinonet.WebSocketService.prototype);
        AdminService.prototype.constructor = AdminService;

        rootObj.AdminService = AdminService;
    };

    var definePlayerService = function (sinonet) {
        var PlayerService = function (connection) {
            sinonet.WebSocketService.call(this, "player", connection);

            //define functions
            var functionNames = [
                "createPlatform",
                "createPlayer",
                "createPlayerTopUpRecord",
                "createPlayerConsumptionRecord",
                "createPlayerFeedback",
                "createPlayerRewardTask",
                "createPlayerCreditChangeLog",
                "createPlayerClientSourceLog",
                "createPlayerLoginRecord",
                "createPlayerCreditTransferLog",
                "addPlayerPartner",
                "addPlayerReferral",
                "bindPartnerPlayer",
                "updateLastPlayedProvider",
                "updatePlayerCredit",
                "updatePlayerLevel",
                "updatePlayer"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PlayerService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PlayerService.prototype.constructor = PlayerService;

        rootObj.PlayerService = PlayerService;
    };

    var defineProposalService = function (sinonet) {
        var ProposalService = function (connection) {
            sinonet.WebSocketService.call(this, "proposal", connection);

            //define functions
            var functionNames = [
                "createProposal",
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        ProposalService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ProposalService.prototype.constructor = ProposalService;

        rootObj.ProposalService = ProposalService;
    };

    var definePartnerService = function (sinonet) {
        var PartnerService = function (connection) {
            sinonet.WebSocketService.call(this, "partner", connection);

            //define functions
            var functionNames = [
                "create",
                "createPartnerLoginRecord",
                "updatePartner"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PartnerService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PartnerService.prototype.constructor = PartnerService;

        rootObj.PartnerService = PartnerService;
    };

    var defineSyncDataService = function (sinonet) {
        var SyncDataService = function (connection) {
            sinonet.WebSocketService.call(this, "syncData", connection);

            //define functions
            var functionNames = [
                "syncProposal",
                "syncPlayerCreditTransferIn",
                "syncPlayerCreditTransferOut",
                "syncPlayerLoginRecord",
                "syncPlayerConsumptionRecord"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        SyncDataService.prototype = Object.create(sinonet.WebSocketService.prototype);
        SyncDataService.prototype.constructor = SyncDataService;

        rootObj.SyncDataService = SyncDataService;
    };

    if (isNode) {
        var sinonet = require("./../../server_common/WebSocketService");
        definePlayerService(sinonet);
        defineConnectionService(sinonet);
        defineAdminService(sinonet);
        defineProposalService(sinonet);
        definePartnerService(sinonet);
        defineSyncDataService(sinonet);
        module.exports = rootObj;
    } else {
        define(["common/WebSocketService"], function (sinonet) {
            defineConnectionService(sinonet);
            definePlayerService(sinonet);
            defineAdminService(sinonet);
            defineProposalService(sinonet);
            definePartnerService(sinonet);
            defineSyncDataService(sinonet);
            return rootObj;
        });
    }
})();