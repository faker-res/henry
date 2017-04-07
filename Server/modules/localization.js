// var localization = new (require('i18n-2'))({
//
//     // setup some locales - other locales default to the first locale
//     locales: ['en', 'de'],
//     setLocal: 'en'
//
// });

var simplifiedChinese = require('../locales/ch_SP');

var lang = {
    ch_SP: 1,
    en: 2
};

var localization = {

    translate: function(message, languages){
        if( languages == lang.en  ){
            return message;
        }
        else{
            if(simplifiedChinese[message]){
                return simplifiedChinese[message];
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
