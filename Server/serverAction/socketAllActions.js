var socketActionModules = [
    require('./../socketActionModule/socketActionApiUser'),
    require('./../socketActionModule/socketActionAdmin'),
    require('./../socketActionModule/socketActionDepartment'),
    require('./../socketActionModule/socketActionRole'),
    require('./../socketActionModule/socketActionGame'),
    require('./../socketActionModule/socketActionGameGroup'),
    require('./../socketActionModule/socketActionBankCardGroup'),
    require('./../socketActionModule/socketActionMerchantGroup'),
    require('./../socketActionModule/socketActionAlipayGroup'),
    require('./../socketActionModule/socketActionWechatPayGroup'),
    require('./../socketActionModule/socketActionLogger'),
    require('./../socketActionModule/socketActionGameProvider'),
    require('./../socketActionModule/socketActionPlatform'),
    require('./../socketActionModule/socketActionPlatformGameStatus'),
    require('./../socketActionModule/socketActionPlayer'),
    require('./../socketActionModule/socketActionPlayerLevel'),
    require('./../socketActionModule/socketActionPlayerTrustLevel'),
    require('./../socketActionModule/socketActionPlayerFeedback'),
    require('./../socketActionModule/socketActionPlayerLoginRecord'),
    require('./../socketActionModule/socketActionPlayerTopUpIntentRecord'),
    require('./../socketActionModule/socketActionPlayerRegistrationIntentRecord'),
    require('./../socketActionModule/socketActionPartner'),
    require('./../socketActionModule/socketActionProposal'),
    require('./../socketActionModule/socketActionProposalType'),
    require('./../socketActionModule/socketActionRewardRule'),
    require('./../socketActionModule/socketActionRewardType'),
    require('./../socketActionModule/socketActionRewardEvent'),
    require('./../socketActionModule/socketActionRewardTask'),
    require('./../socketActionModule/socketActionMessageTemplate'),
    require('./../socketActionModule/socketActionPlatformAnnouncement'),
    require('./../socketActionModule/socketActionPlayerMail'),
    require('./../socketActionModule/socketActionReport'),
    require('./../socketActionModule/socketActionTestRewardEvent'),
    require('./../socketActionModule/socketActionQuickPayGroup'),
    require('./../socketActionModule/socketActionUtility'),
    require('./../socketActionModule/socketActionPromoCode'),
    require('./../socketActionModule/socketActionCsOfficer'),
    require('./../socketActionModule/socketActionPlayerFeedbackResult'),
    require('./../socketActionModule/socketActionPlayerFeedbackTopic'),
    require('./../socketActionModule/socketActionRewardPointsLvlConfig'),
    require('../socketActionModule/socketActionRewardPointsRanking'),
    require('./../socketActionModule/socketActionRewardPointsEvent'),
];

var socketActions = [
    require('./../socketActionModule/socketActionPartnerLevel')
];

module.exports.listen = function (io, socket) {

    // Used to ensure that we never create two actions with the same name
    var actionsCreated = {};

    for (var i = 0; i < socketActionModules.length; i++) {
        var socketAction = new socketActionModules[i](io, socket);

        for (var action in socketAction.actions) {
            //if action exist and it is a function
            if (socketAction.actions[action] && typeof socketAction.actions[action] === "function") {
                if (actionsCreated[action]) {
                    throw Error("There are multiple actions with the same name: " + action);
                }
                actionsCreated[action] = true;

                socket.on(action, socketAction.actions[action]);
            }
        }
    }

    // TODO: Sometimes clients request an action which does not exist
    //       Because we have no socket.on() for that action, we don't respond at all!
    //       It would be friendlier to respond with an error, saying "That action does not exist"
    //       The code for this could be found here: http://stackoverflow.com/questions/10405070/socket-io-client-respond-to-all-events-with-one-handler

    for (var j = 0; j < socketActions.length; j++) {
        var socketAction = new socketActions[j](io, socket);
        socketAction.registerAPI();
    }

};

module.exports.allSocketActionModules = socketActionModules;
