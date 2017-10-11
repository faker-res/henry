// https://gist.github.com/soplakanets/980737 --> see for hashing
var crypto = require('crypto');

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
        var trustLevel = data.hasOwnProperty('trustLevel') ? data.trustLevel : "";
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
        var creditOperator = data.hasOwnProperty('creditOperator') ? data.creditOperator : "";
        var creditAmountOne = data.hasOwnProperty('creditAmountOne') ? data.creditAmountOne : "";
        var creditAmountTwo = data.hasOwnProperty('creditAmountTwo') ? data.creditAmountTwo : "";
        let referral = data.hasOwnProperty('referral') ? data.referral : "";


        var query = {};
        if (playerId !== '') {
            query["playerId"] = playerId;
        }
        if (trustLevel !== '') {
            query["trustLevel"] = trustLevel;
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
            query["credibilityRemarks"] = {$all: credibilityRemarks};
        }
        if (referral !== '') {
            query["referral"] = referral;
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

        var bankAccount = data.hasOwnProperty('bankAccount') ? data.bankAccount : "";
        var partnerName = data.hasOwnProperty('partnerName') ? data.partnerName : "";
        var realName = data.hasOwnProperty('realName') ? data.realName : "";
        var partnerId = data.hasOwnProperty('partnerId') ? data.partnerId : "";
        var level = data.hasOwnProperty('level') ? data.level : "";
        var status = data.hasOwnProperty('status') ? data.status : "";

        var query = {};
        if (partnerId !== '') {
            query["partnerId"] = new RegExp('.*' + partnerId + '.*');
        }
        if (level !== '') {
            query["level"] = level;
        }
        if (status !== '') {
            query["status"] = status;
        }
        if (partnerName !== '') {
            query["partnerName"] = new RegExp('.*' + partnerName + '.*');
        }
        if (realName !== '') {
            query["realName"] = new RegExp('.*' + realName + '.*');
        }
        if (bankAccount !== '') {
            query["bankAccount"] = bankAccount;
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
            if (data.proposalTypeId) {
                query["type"] = data.proposalTypeId;
            }
            else {
                query["platformId"] = data.platformId;
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
    }

};
// https://gist.github.com/soplakanets/980737 --> see for hashing
module.exports = encrypt;
