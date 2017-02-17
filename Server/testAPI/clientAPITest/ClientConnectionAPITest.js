/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/


(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ConnectionAPITest = function (service) {
        this._service = service;
    };
    var proto = ConnectionAPITest.prototype;

    proto.setLang = function (callback, requestData) {
        var usersPreferredLanguage = 1;

        if (!isNode && typeof window === 'object' && window.$) {
            var val = $('#preferredLanguageSelector').val();
            if (val !== "") {
                usersPreferredLanguage = Number(val);
            }
        }

        var data = requestData || {lang: usersPreferredLanguage};
        this._service.setLang.request(data);
        this._service.setLang.once(function (data) {
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = ConnectionAPITest;
    } else {
        define([], function () {
            return ConnectionAPITest;
        });
    }

})();