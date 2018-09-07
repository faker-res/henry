// const constClientQnA = require('./../../../Server/const/constClientQnA');
var db = db.getSiblingDB("admindb");

// region forgot password - type 1
var type1 = "forgotPassword";
db.clientQnATemplate.update(
    {
        processNo: "1",
        type: type1
    },
    {
        $set: {
            alternativeQuestion: {des: "forgot user ID?"},
            question: [{questionNo: 1, des: "Please enter your user ID:"}],
            answerInput: [{type: "text", objKey: "name", questionNo: 1, placeHolder: "Please enter player ID"}],
            action: "forgotPassword1"
        }
    },
    {upsert: true});

db.clientQnATemplate.update(
    {
        processNo: "2_1",
        type: type1
    },
    {
        $set: {
            alternativeQuestion: {des: "Inconvenient to accept?", action: "forgotPassword2"},
            question: [{questionNo: 1, des: "Please enter phone number of the account, a sms verification code will be sent"}],
            answerInput: [{type: "text", objKey: "phoneNumber", questionNo: 1, placeHolder: "Please enter phone number"}],
            action: "forgotPassword2_1"
        }
    },
    {upsert: true});

db.clientQnATemplate.update(
    {
        processNo: "2_2",
        type: type1
    },
    {
        $set: {
            isSecurityQuestion: true,
            questionTitle: "Please answer the question below",
            question: [
                {questionNo: 1, des: "Please enter last 4 digits of bank account (must answer correctly)"},
                {questionNo: 2, des: "Please enter bank card name?"},
                {questionNo: 3, des: "Please enter bank card registration city?"},
                {questionNo: 4, des: "Please enter bank name?"}],
            answerInput: [
                {type: "text", objKey: "bankAccount", questionNo: 1},
                {type: "text", objKey: "bankCardName", questionNo: 2},
                {type: "select", objKey: "bankCardProvince", questionNo: 3, options: "qnaProvinceList"},
                {type: "select", objKey: "bankCardCity", questionNo: 3, options: "qnaCityList"},
                {type: "select", objKey: "bankName", questionNo: 4, options: "qnaAllBankTypeList"},
                ],
            action: "forgotPassword2_2"
        }
    },
    {upsert: true});

// db.clientQnATemplate.update(
//     {
//         processNo: "2",
//         type: type1
//     },
//     {
//         $set: {
//             alternativeQuestion: {des: "forgot user ID?", action: "forgotPassword1_2"},
//             question: [{questionNo: 1, des: "Please enter your user ID222222222:"}],
//             answerInput: [{type: "text", objKey: "name", questionNo: 1, placeHolder: "Please enter player ID2222222"}],
//             action: "forgotPassword1"
//         }
//     },
//     {upsert: true});

// endregion

//region forgotUserID
//endregion

//region updatePhoneNumber
//endregion

//region editBankCard
//endregion

//region editName
//endregion