// var localization = new (require('i18n-2'))({
//
//     // setup some locales - other locales default to the first locale
//     locales: ['en', 'de'],
//     setLocal: 'en'
//
// });

var simplifiedChinese = require('../locales/ch_SP');
var simplifiedChinese1 = require('../locales/ch_SP_1');
var simplifiedChinese2 = require('../locales/ch_SP_2');
var simplifiedChinese3 = require('../locales/ch_SP_3');
var simplifiedChinese4 = require('../locales/ch_SP_4');
var simplifiedChinese5 = require('../locales/ch_SP_5');
var simplifiedChinese6 = require('../locales/ch_SP_6');
var simplifiedChinese7 = require('../locales/ch_SP_7');
var simplifiedChinese8 = require('../locales/ch_SP_8');
var simplifiedChinese9 = require('../locales/ch_SP_9');

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
                    resMessage = simplifiedChinese1[message];
                    break;
                case "2":
                    resMessage = simplifiedChinese2[message];
                    break;
                case "3":
                    resMessage = simplifiedChinese3[message];
                    break;
                case "4":
                    resMessage = simplifiedChinese4[message];
                    break;
                case "5":
                    resMessage = simplifiedChinese5[message];
                    break;
                case "6":
                    resMessage = simplifiedChinese6[message];
                    break;
                case "7":
                    resMessage = simplifiedChinese7[message];
                    break;
                case "8":
                    resMessage = simplifiedChinese8[message];
                    break;
                case "9":
                    resMessage = simplifiedChinese9[message];
                    break;
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
