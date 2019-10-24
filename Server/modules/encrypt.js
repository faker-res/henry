// https://gist.github.com/soplakanets/980737 --> see for hashing
var crypto = require('crypto');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

var encrypt = {

    saltLength: 9,

    createHash: function (password, salt) {
        var hash = this.md5(password + salt);
        return salt + hash;
    },

    generateSalt: function () {
        var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ',
            setLen = set.length,
            salt = '';
        for (var i = 0; i < this.saltLength; i++) {
            var p = Math.floor(Math.random() * setLen);
            salt += set[p];
        }
        return salt;
    },

    // Hashing
    md5: function (string) {
        return crypto.createHash('md5').update(string).digest('hex');
    },

    validateHash: function (hashpassword, plainpassword) {

        var salt = hashpassword.substr(0, this.saltLength);
        var validHash = salt + this.md5(plainpassword + salt);
        return hashpassword === validHash;
    },

    randomValueBase64: function (length) {
        return crypto.randomBytes(Math.ceil(length * 3 / 4))
            .toString('base64')   // convert to base64 format
            .slice(0, length)        // return required number of characters
            .replace(/\+/g, '0')  // replace '+' with '0'
            .replace(/\//g, '0'); // replace '/' with '0'
    },

    /* build query string for advanced search of Players */
    buildPlayerQueryString: function (data) {

        var playerId = data.hasOwnProperty('playerId') ? data.playerId : "";
        var playerType = data.hasOwnProperty('playerType') ? data.playerType : "";
        var trustLevel = data.hasOwnProperty('trustLevel') ? data.trustLevel : "";
        var csOfficer = data.hasOwnProperty('csOfficer') ? data.csOfficer : "";
        var playerLevel = data.hasOwnProperty('playerLevel') ? data.playerLevel : "";
        var isTestPlayer = data.hasOwnProperty('isTestPlayer') ? data.isTestPlayer : "";
        var isRealPlayer = data.hasOwnProperty('isRealPlayer') ? data.isRealPlayer : "";
        var name = data.hasOwnProperty('name') ? data.name.toLowerCase() : "";
        var email = data.hasOwnProperty('email') ? data.email : "";
        var realName = data.hasOwnProperty('realName') ? data.realName : "";
        var nickName = data.hasOwnProperty('nickName') ? data.nickName : "";
        var validCredit = data.hasOwnProperty('validCredit') ? data.validCredit : "";
        var phoneNumber = data.hasOwnProperty('phoneNumber') ? data.phoneNumber : "";
        var lastAccessTime = data.hasOwnProperty('lastAccessTime') ? data.lastAccessTime : "";
        var registrationTime = data.hasOwnProperty('registrationTime') ? data.registrationTime : "";
        var bankAccount = data.hasOwnProperty('bankAccount') ? data.bankAccount : "";
        var topUpTimes = data.hasOwnProperty('topUpTimes') ? data.topUpTimes : "";
        var status = data.hasOwnProperty('status') ? data.status : "";
        var domain = data.hasOwnProperty('domain') ? data.domain : "";
        var partner = data.hasOwnProperty('partner') ? data.partner : "";
        var loginIps = data.hasOwnProperty('loginIps') ? data.loginIps : "";
        var credibilityRemarks = data.hasOwnProperty('credibilityRemarks') && data.credibilityRemarks.length !== 0 ? data.credibilityRemarks : "";
        let credibilityRemarksFilter = data.hasOwnProperty('credibilityRemarksFilter') && data.credibilityRemarksFilter.length !== 0 ? data.credibilityRemarksFilter : "";
        var creditOperator = data.hasOwnProperty('creditOperator') ? data.creditOperator : "";
        var creditAmountOne = data.hasOwnProperty('creditAmountOne') ? data.creditAmountOne : "";
        var creditAmountTwo = data.hasOwnProperty('creditAmountTwo') ? data.creditAmountTwo : "";
        let referral = data.hasOwnProperty('referral') ? data.referral : "";
        let loginTimes = data.hasOwnProperty('loginTimes') ? data.loginTimes : "";
        let phoneLocation = data.hasOwnProperty('phoneLocation') ? data.phoneLocation : "";
        let ipLocation = data.hasOwnProperty('ipLocation') ? data.ipLocation : "";


        var query = {};
        if (playerId !== '') {
            query["playerId"] = playerId;
        }
        if(playerType !== "") {
            switch (playerType) {
                case 'Test Player':
                    query.isRealPlayer = false;
                    break;
                case 'Real Player (all)':
                    query.isRealPlayer = true;
                    break;
                case 'Real Player (Individual)':
                    query.isRealPlayer = true;
                    query.partner = null;
                    break;
                case 'Real Player (Under Partner)':
                    query.isRealPlayer = true;
                    query.partner = {$ne: null};
            }
        }
        if (trustLevel !== '') {
            query["trustLevel"] = trustLevel;
        }
        if (csOfficer !== '') {
            query["csOfficer"] = csOfficer;
        }
        if (playerLevel !== '') {
            query["playerLevel"] = playerLevel;
        }
        if (isTestPlayer !== '') {
            query["isTestPlayer"] = isTestPlayer;
        }
        if (isRealPlayer !== '') {
            query["isRealPlayer"] = isRealPlayer;
        }
        if (name !== '') {
            query["name"] = name; //new RegExp('.*' + name + '.*');
        }
        if (email !== '') {
            query["email"] = new RegExp('.*' + email + '.*');
        }
        if (realName !== '') {
            query["realName"] = realName;
        }
        if (domain !== '') {
            query["domain"] = domain;
        }
        if (nickName !== '') {
            query["nickName"] = new RegExp('.*' + nickName + '.*');
        }
        if (bankAccount !== '') {
            query["bankAccount"] = new RegExp('.*' + bankAccount + '.*');
        }
        if (phoneNumber !== '') {
            query["phoneNumber"] = phoneNumber;
        }
        if (lastAccessTime !== '') {
            query["lastAccessTime"] = lastAccessTime;
        }
        if (topUpTimes !== '') {
            query["topUpTimes"] = topUpTimes;
        }
        if (status !== '') {
            query["status"] = parseInt(status);
        }
        if (registrationTime !== '') {
            query["registrationTime"] = registrationTime;
        }
        if (partner !== '') {
            query["partner"] = partner;
        }
        if (loginIps !== '') {
            query["loginIps"] = new RegExp('.*' + loginIps + '.*');
        }
        if (credibilityRemarks && credibilityRemarks !== '' && credibilityRemarks.length !== 0) {
            let tempArr = [];
            let isNoneExist = false;

            credibilityRemarks.forEach(remark => {
                if (remark == "") {
                    isNoneExist = true;
                } else {
                    tempArr.push(remark);
                }
            });

            if (isNoneExist && tempArr.length > 0) {
                query.$or = [{credibilityRemarks: []}, {credibilityRemarks: {$exists: false}}, {credibilityRemarks: {$in: tempArr}}];
            } else if (isNoneExist && !tempArr.length) {
                query.$or = [{credibilityRemarks: []}, {credibilityRemarks: {$exists: false}}];
            } else if (tempArr.length > 0 && !isNoneExist) {
                query["credibilityRemarks"] = {$in: tempArr};
            }
        }
        if (credibilityRemarksFilter && credibilityRemarksFilter !== '' && credibilityRemarksFilter.length !== 0) {
            let tempArr = [];
            if (credibilityRemarksFilter.includes("")) {
                credibilityRemarksFilter.forEach(remark => {
                    if (remark != "") {
                        tempArr.push(remark);
                    }
                });
                query.$and = [{credibilityRemarks: {$ne: []}}, {credibilityRemarks: {$exists: true}}, {credibilityRemarks: {$nin: tempArr}}];
            } else {
                if (query.credibilityRemarks && query.credibilityRemarks.$in) {
                    query.$and = [{credibilityRemarks: {$nin: credibilityRemarksFilter}}];
                }
                else {
                    query.credibilityRemarks = {$nin: credibilityRemarksFilter};
                }
            }
        }
        if (referral !== '') {
            query["referral"] = referral;
        }
        if (playerType !== '' && playerType == 'Partner') {
            query["playerType"] = playerType;
        }
        if (loginTimes !== '') {
            query["loginTimes"] = loginTimes;
        }
        if (phoneLocation !== '') {
            query["phoneLocation"] = phoneLocation;
        }
        if (ipLocation !== '') {
            query["ipLocation"] = ipLocation;
        }

        if (validCredit !== '') {
            // We can accept the following forms for validCredit parameter:
            //   0-100
            //   >25
            //   <-10
            // We CANNOT currently accept the following:
            //   -100-+100
            if (validCredit.indexOf('-') > -1) {
                var split = validCredit.split('-');
                var min = Number(split[0]);
                var max = Number(split[1]);
                query["validCredit"] = {$gte: min, $lte: max};
            } else if (validCredit.charAt(0) === '>') {
                var min = Number(validCredit.substring(1));
                query["validCredit"] = {$gt: min};
            } else if (validCredit.charAt(0) === '<') {
                var max = Number(validCredit.substring(1));
                query["validCredit"] = {$lt: max};
            } else {
                // error: Don't know how to interpret this query
            }
        }

        if (creditOperator && creditAmountOne) {
            switch (creditOperator) {
                case '<=':
                    query["validCredit"] = {$lte: creditAmountOne};
                    break;
                case '>=':
                    query["validCredit"] = {$gte: creditAmountOne};
                    break;
                case '=':
                    query["validCredit"] = creditAmountOne;
                    break;
                case 'range':
                    if (creditAmountTwo) query["validCredit"] = {$gte: creditAmountOne, $lte: creditAmountTwo};
                    break;
            }
        }

        return query;

    },

    /* build query string for advanced search of Partners */
    buildPartnerQueryString: function (data) {
        let partnerName = data.hasOwnProperty('partnerName') ? data.partnerName : "";
        let realName = data.hasOwnProperty('realName') ? data.realName : "";
        let partnerId = data.hasOwnProperty('partnerId') ? data.partnerId : "";
        let commissionType = data.hasOwnProperty('commissionType') ? data.commissionType : "";
        let creditsOperator = data.hasOwnProperty('creditsOperator') ? data.creditsOperator : "";
        let creditsInput1 = data.hasOwnProperty('creditsInput1') ? data.creditsInput1 : "";
        let creditsInput2 = data.hasOwnProperty('creditsInput2') ? data.creditsInput2 : "";
        let registrationTime = data.hasOwnProperty('registrationTime') ? data.registrationTime : "";
        let lastAccessTime = data.hasOwnProperty('lastAccessTime') ? data.lastAccessTime : "";
        let phoneNumber = data.hasOwnProperty('phoneNumber') ? data.phoneNumber : "";
        let dailyActivePlayerOperator = data.hasOwnProperty('dailyActivePlayerOperator') ? data.dailyActivePlayerOperator : "";
        let dailyActivePlayerInput1 = data.hasOwnProperty('dailyActivePlayerInput1') ? data.dailyActivePlayerInput1 : "";
        let dailyActivePlayerInput2 = data.hasOwnProperty('dailyActivePlayerInput2') ? data.dailyActivePlayerInput2 : "";
        let weeklyActivePlayerOperator = data.hasOwnProperty('weeklyActivePlayerOperator') ? data.weeklyActivePlayerOperator : "";
        let weeklyActivePlayerInput1 = data.hasOwnProperty('weeklyActivePlayerInput1') ? data.weeklyActivePlayerInput1 : "";
        let weeklyActivePlayerInput2 = data.hasOwnProperty('weeklyActivePlayerInput2') ? data.weeklyActivePlayerInput2 : "";
        let monthlyActivePlayerOperator = data.hasOwnProperty('monthlyActivePlayerOperator') ? data.monthlyActivePlayerOperator : "";
        let monthlyActivePlayerInput1 = data.hasOwnProperty('monthlyActivePlayerInput1') ? data.monthlyActivePlayerInput1 : "";
        let monthlyActivePlayerInput2 = data.hasOwnProperty('monthlyActivePlayerInput2') ? data.monthlyActivePlayerInput2 : "";
        let validPlayersOperator = data.hasOwnProperty('validPlayersOperator') ? data.validPlayersOperator : "";
        let validPlayersInput1 = data.hasOwnProperty('validPlayersInput1') ? data.validPlayersInput1 : "";
        let validPlayersInput2 = data.hasOwnProperty('validPlayersInput2') ? data.validPlayersInput2 : "";
        let totalPlayerDownlineOperator = data.hasOwnProperty('totalPlayerDownlineOperator') ? data.totalPlayerDownlineOperator : "";
        let totalPlayerDownlineInput1 = data.hasOwnProperty('totalPlayerDownlineInput1') ? data.totalPlayerDownlineInput1 : "";
        let totalPlayerDownlineInput2 = data.hasOwnProperty('totalPlayerDownlineInput2') ? data.totalPlayerDownlineInput2 : "";
        let totalChildrenDepositOperator = data.hasOwnProperty('totalChildrenDepositOperator') ? data.totalChildrenDepositOperator : "";
        let totalChildrenDepositInput1 = data.hasOwnProperty('totalChildrenDepositInput1') ? data.totalChildrenDepositInput1 : "";
        let totalChildrenDepositInput2 = data.hasOwnProperty('totalChildrenDepositInput2') ? data.totalChildrenDepositInput2 : "";
        let totalChildrenBalanceOperator = data.hasOwnProperty('totalChildrenBalanceOperator') ? data.totalChildrenBalanceOperator : "";
        let totalChildrenBalanceInput1 = data.hasOwnProperty('totalChildrenBalanceInput1') ? data.totalChildrenBalanceInput1 : "";
        let totalChildrenBalanceInput2 = data.hasOwnProperty('totalChildrenBalanceInput2') ? data.totalChildrenBalanceInput2 : "";
        let totalSettledCommissionOperator = data.hasOwnProperty('totalSettledCommissionOperator') ? data.totalSettledCommissionOperator : "";
        let totalSettledCommissionInput1 = data.hasOwnProperty('totalSettledCommissionInput1') ? data.totalSettledCommissionInput1 : "";
        let totalSettledCommissionInput2 = data.hasOwnProperty('totalSettledCommissionInput2') ? data.totalSettledCommissionInput2 : "";

        let query = {};
        if (partnerId !== '') {
            query["partnerId"] = new RegExp('.*' + partnerId + '.*');
        }
        if (partnerName !== '') {
            query["partnerName"] = new RegExp('.*' + partnerName + '.*');
        }
        if (realName !== '') {
            query["realName"] = new RegExp('.*' + realName + '.*');
        }
        if (commissionType !== '') {
            query["commissionType"] = parseInt(commissionType);
        }
        if (creditsOperator && creditsInput1) {
            switch (creditsOperator) {
                case '<=':
                    query["credits"] = {$lte: creditsInput1};
                    break;
                case '>=':
                    query["credits"] = {$gte: creditsInput1};
                    break;
                case '=':
                    query["credits"] = creditsInput1;
                    break;
                case 'range':
                    if (creditsInput2) query["credits"] = {$gte: creditsInput1, $lte: creditsInput2};
                    break;
            }
        }
        if (registrationTime !== '') {
            query["registrationTime"] = registrationTime;
        }
        if (lastAccessTime !== '') {
            query["lastAccessTime"] = lastAccessTime;
        }
        if (phoneNumber !== '') {
            query["phoneNumber"] = phoneNumber;
        }
        if (dailyActivePlayerOperator && dailyActivePlayerInput1) {
            switch (dailyActivePlayerOperator) {
                case '<=':
                    query["dailyActivePlayer"] = {$lte: dailyActivePlayerInput1};
                    break;
                case '>=':
                    query["dailyActivePlayer"] = {$gte: dailyActivePlayerInput1};
                    break;
                case '=':
                    query["dailyActivePlayer"] = dailyActivePlayerInput1;
                    break;
                case 'range':
                    if (dailyActivePlayerInput2) query["dailyActivePlayer"] = {$gte: dailyActivePlayerInput1, $lte: dailyActivePlayerInput2};
                    break;
            }
        }
        if (weeklyActivePlayerOperator && weeklyActivePlayerInput1) {
            switch (weeklyActivePlayerOperator) {
                case '<=':
                    query["weeklyActivePlayer"] = {$lte: weeklyActivePlayerInput1};
                    break;
                case '>=':
                    query["weeklyActivePlayer"] = {$gte: weeklyActivePlayerInput1};
                    break;
                case '=':
                    query["weeklyActivePlayer"] = weeklyActivePlayerInput1;
                    break;
                case 'range':
                    if (weeklyActivePlayerInput2) query["weeklyActivePlayer"] = {$gte: weeklyActivePlayerInput1, $lte: weeklyActivePlayerInput2};
                    break;
            }
        }
        if (monthlyActivePlayerOperator && monthlyActivePlayerInput1) {
            switch (monthlyActivePlayerOperator) {
                case '<=':
                    query["monthlyActivePlayer"] = {$lte: monthlyActivePlayerInput1};
                    break;
                case '>=':
                    query["monthlyActivePlayer"] = {$gte: monthlyActivePlayerInput1};
                    break;
                case '=':
                    query["monthlyActivePlayer"] = monthlyActivePlayerInput1;
                    break;
                case 'range':
                    if (monthlyActivePlayerInput2) query["monthlyActivePlayer"] = {$gte: monthlyActivePlayerInput1, $lte: monthlyActivePlayerInput2};
                    break;
            }
        }
        if (validPlayersOperator && validPlayersInput1) {
            switch (validPlayersOperator) {
                case '<=':
                    query["validPlayers"] = {$lte: validPlayersInput1};
                    break;
                case '>=':
                    query["validPlayers"] = {$gte: validPlayersInput1};
                    break;
                case '=':
                    query["validPlayers"] = validPlayersInput1;
                    break;
                case 'range':
                    if (validPlayersInput2) query["validPlayers"] = {$gte: validPlayersInput1, $lte: validPlayersInput2};
                    break;
            }
        }
        if (totalPlayerDownlineOperator && totalPlayerDownlineInput1) {
            switch (totalPlayerDownlineOperator) {
                case '<=':
                    query["totalPlayerDownline"] = {$lte: totalPlayerDownlineInput1};
                    break;
                case '>=':
                    query["totalPlayerDownline"] = {$gte: totalPlayerDownlineInput1};
                    break;
                case '=':
                    query["totalPlayerDownline"] = totalPlayerDownlineInput1;
                    break;
                case 'range':
                    if (totalPlayerDownlineInput2) query["totalPlayerDownline"] = {$gte: totalPlayerDownlineInput1, $lte: totalPlayerDownlineInput2};
                    break;
            }
        }
        if (totalChildrenDepositOperator && totalChildrenDepositInput1) {
            switch (totalChildrenDepositOperator) {
                case '<=':
                    query["totalChildrenDeposit"] = {$lte: totalChildrenDepositInput1};
                    break;
                case '>=':
                    query["totalChildrenDeposit"] = {$gte: totalChildrenDepositInput1};
                    break;
                case '=':
                    query["totalChildrenDeposit"] = totalChildrenDepositInput1;
                    break;
                case 'range':
                    if (totalChildrenDepositInput2) query["totalChildrenDeposit"] = {$gte: totalChildrenDepositInput1, $lte: totalChildrenDepositInput2};
                    break;
            }
        }
        if (totalChildrenBalanceOperator && totalChildrenBalanceInput1) {
            switch (totalChildrenBalanceOperator) {
                case '<=':
                    query["totalChildrenBalance"] = {$lte: totalChildrenBalanceInput1};
                    break;
                case '>=':
                    query["totalChildrenBalance"] = {$gte: totalChildrenBalanceInput1};
                    break;
                case '=':
                    query["totalChildrenBalance"] = totalChildrenBalanceInput1;
                    break;
                case 'range':
                    if (totalChildrenBalanceInput2) query["totalChildrenBalance"] = {$gte: totalChildrenBalanceInput1, $lte: totalChildrenBalanceInput2};
                    break;
            }
        }
        if (totalSettledCommissionOperator && totalSettledCommissionInput1) {
            switch (totalSettledCommissionOperator) {
                case '<=':
                    query["totalSettledCommission"] = {$lte: totalSettledCommissionInput1};
                    break;
                case '>=':
                    query["totalSettledCommission"] = {$gte: totalSettledCommissionInput1};
                    break;
                case '=':
                    query["totalSettledCommission"] = totalSettledCommissionInput1;
                    break;
                case 'range':
                    if (totalSettledCommissionInput2) query["totalSettledCommission"] = {$gte: totalSettledCommissionInput1, $lte: totalSettledCommissionInput2};
                    break;
            }
        }
        return query;
    },
    /*

     */
    buildProposalReportQueryString: function (data) {
        var query = {};
        if (data) {

            if (data.proposalId) {
                query["proposalId"] = data.proposalId;
            }
            if (data.playerId) {
                query["data.playerId"] = data.playerId;
            }
            if (data.startTime && data.endTime) {

                query ["createTime"] = {
                    $gte: data.startTime,
                    $lt: data.endTime
                }
            }
            if (data.creator) {
                query["creator"] = new RegExp('.*' + data.creator + '.*');
            }
            if (data.status) {
                query["status"] = data.status;
            }

            if (data.proposalTypeId && data.proposalTypeId.length > 0) {
                // data.proposalTypeId = data.proposalTypeId.map(id => ObjectId(id));
                query["type"] = {$in: data.proposalTypeId};
                query["platformList"] = data.platformList;
            }
            else {
                query["platformList"] = data.platformList;
            }

            if (data.rewardTypeName && data.rewardTypeName.length > 0) {
                query["data.eventName"] = {$in: data.rewardTypeName};
            }

            if (data.promoTypeName && data.promoTypeName.length > 0) {
                query["data.PROMO_CODE_TYPE"] = {$in: data.promoTypeName};
            }

            if (data.inputDevice && data.inputDevice == -1){
                data.inputDevice = null;
            }

            if (data.inputDevice) {
                query.inputDevice = data.inputDevice;
            }

            if (data.relatedAccount) {
                switch (data.inputDevice) {
                    case 1:
                    case 3:
                    case 5:
                        query["data.playerName"] = data.relatedAccount;
                        break;
                    case 2:
                    case 4:
                    case 6:
                        query["data.partnerName"] = data.relatedAccount;
                        break;
                    default:
                        query.$or = query.$or ? query.$or : [];
                        query.$or.push({"data.playerName": data.relatedAccount});
                        query.$or.push({"data.partnerName": data.relatedAccount});
                }
            }

            if (data.remark) {
                query["data.remark"] = data.remark;
            }

            if (data.loginDevice && data.loginDevice.length){
                query.device = data.loginDevice;
            }
        }
        return query;
    },

    isEmptyObject: function (obj) {
        for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                return false;
            }
        }
        return true;
    },

};
// https://gist.github.com/soplakanets/980737 --> see for hashing
module.exports = encrypt;
