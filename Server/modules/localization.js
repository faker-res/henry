// var localization = new (require('i18n-2'))({
//
//     // setup some locales - other locales default to the first locale
//     locales: ['en', 'de'],
//     setLocal: 'en'
//
// });

var simplifiedChinese = require('../locales/ch_SP');
// var simplifiedChinese2 = require('../locales/ch_SP2');

var lang = {
    ch_SP: 1,
    en: 2
};

var localization = {

    translate: function(message, languages, platformId){
        if( languages == lang.en  ){
            return message;
        }
        else{
            let resMessage;

            switch (platformId) {
                case "1":
                    resMessage = simplifiedChinese[message];
                    break;
                // case "2":
                //     resMessage = simplifiedChinese[message];
                //     break;
                default:
                    resMessage = simplifiedChinese[message];
                    break;
            }

            if(resMessage){
                return resMessage;
            }
            else{
                //handle dynamic error messages
                if( message && message.indexOf("Request timeout") >= 0 ){
                    return "请求超时";
                }
                console.warn("Missing ch_SP for:", message);
                return message;
            }
        }
    }

};

module.exports = {
    lang: lang,
    localization: localization
};
