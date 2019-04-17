const PlatformService = require("./../../settlementService/SettlementServices").PlatformService;

const rsaCrypto = require('./../../modules/rsaCrypto');

let PlatformServiceImplement = function () {
    PlatformService.call(this);

    this.updateRSAKeys.addListener(() => rsaCrypto.refreshKeys());
};

let proto = PlatformServiceImplement.prototype = Object.create(PlatformService.prototype);
proto.constructor = PlatformServiceImplement;

module.exports = PlatformServiceImplement;