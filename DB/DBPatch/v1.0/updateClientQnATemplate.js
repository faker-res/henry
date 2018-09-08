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
var type2 = "forgotUserID";
db.clientQnATemplate.update(
    {
        processNo: "1_1",
        type: type2
    },
    {
        $set: {
            alternativeQuestion: {des: "Cannot receive SMS?", action: "rejectFailedRetrieveAccount"},
            question: [{questionNo: 1, des: "Please enter phone number of the account, a sms verification code will be sent"}],
            answerInput: [{type: "text", objKey: "phoneNumber", questionNo: 1, placeHolder: "Please enter phone number"}],
            action: "forgotUserID1_1"
        }
    },
    {upsert: true});

db.clientQnATemplate.update(
    {
        processNo: "2_1",
        type: type2
    },
    {
        $set: {
            alternativeQuestion: {des: "Didn't receive? Send again", action: "forgotUserID1_2"},
            question: [{questionNo: 1, des: "Please enter the verification code"}],
            answerInput: [{type: "text", objKey: "smsCode", questionNo: 1, placeHolder: "Verification code"}],
            action: "forgotUserID2_1"
        }
    },
    {upsert: true});
//endregion

//region updatePhoneNumber
var type3 = "updatePhoneNumber";
//endregion

//region editBankCard
var type4 = "editBankCard";
//endregion

//region editName
var type5 = "editName";
db.clientQnATemplate.update(
    {
        processNo: "1",
        type: type5
    },
    {
        $set: {
            question: [{questionNo: 1, des: "Please enter your user ID to modify the name:"}],
            answerInput: [{type: "text", objKey: "name", questionNo: 1, placeHolder: "Please enter player ID"}],
            action: "editName1"
        }
    },
    {upsert: true});

db.clientQnATemplate.update(
    {
        processNo: "2",
        type: type5
    },
    {
        $set: {
            alternativeQuestion: {des: "Inconvenient to accept?", action: "editName4"},
            question: [{questionNo: 1, des: "Please enter phone number of the account, a sms verification code will be sent"}],
            answerInput: [{type: "text", objKey: "phoneNumber", questionNo: 1, placeHolder: "Please enter phone number"}],
            action: "editName2"
        }
    },
    {upsert: true});

db.clientQnATemplate.update(
    {
        processNo: "3",
        type: type5
    },
    {
        $set: {
            question: [{questionNo: 1, des: "Please enter the sms verification code and the new name."}],
            answerInput: [
                {type: "text", objKey: "newName", questionNo: 1, placeHolder: "Please enter the new name"},
                {type: "text", objKey: "smsCode", questionNo: 1, placeHolder: "Please enter the sms verification code"}
            ],
            action: "editName3"
        }
    },
    {upsert: true});

db.clientQnATemplate.update(
    {
        processNo: "4_2",
        type: type5
    },
    {
        $set: {
            isSecurityQuestion: true,
            questionTitle: "Please answer the question below to validate your identity:",
            question: [
                {questionNo: 1, des: "Please enter your phone number"},
                {questionNo: 2, des: "Please enter your bank account"},
                {questionNo: 3, des: "Please enter your last withdrawal amount"},
            ],
            answerInput: [
                {type: "number", objKey: "phoneNumber", questionNo: 1},
                {type: "text", objKey: "bankAccount", questionNo: 2},
                {type: "number", objKey: "lastWithdrawalAmount", questionNo: 3},
            ],
            action: "editName4_2"
        }
    },
    {upsert: true});

db.clientQnATemplate.update(
    {
        processNo: "5_2",
        type: type5
    },
    {
        $set: {
            questionTitle: "Please answer the question below to validate your identity:",
            question: [
                {questionNo: 3, des: "Please enter the balance of your bank account"},
            ],
            answerInput: [
                {type: "number", objKey: "phoneNumber", questionNo: 1},
            ],
            action: "editName5_2"
        }
    },{upsert: true});

db.clientQnATemplate.update(
    {
        processNo: "2_1",
        type: type2
    },
    {
        $set: {
            alternativeQuestion: {des: "Didn't receive? Send again", action: "resendSMSVerificationCode"},
            question: [{questionNo: 1, des: "Please enter the verification code"}],
            answerInput: [{type: "text", objKey: "smsCode", questionNo: 1, placeHolder: "Verification code"}],
            action: "forgotUserID2_1"
        }
    },
    {upsert: true});

db.clientQnATemplate.update(
    {
        processNo: "3_2",
        type: type2
    },
    {
        $set: {
            alternativeQuestion: {des: "Didn't receive? Send again", action: "resendSMSVerificationCode"},
            question: [{questionNo: 1, des: "Please enter the verification code"}],
            answerInput: [{type: "text", objKey: "smsCode", questionNo: 1, placeHolder: "Verification code"}],
            action: "forgotUserID2_1"
        }
    },
    {upsert: true});
//endregion

