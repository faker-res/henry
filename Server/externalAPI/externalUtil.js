var errorUtils = require("../modules/errorUtils");

var externalUtil = {

    request: function(prom) {
        if( prom ){
            prom.then().catch(errorUtils.reportError).done();
        }
    }

};

module.exports = externalUtil;
