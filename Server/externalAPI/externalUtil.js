/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var errorUtils = require("../modules/errorUtils");

var externalUtil = {

    request: function(prom) {
        if( prom ){
            prom.then().catch(errorUtils.reportError).done();
        }
    }

};

module.exports = externalUtil;
