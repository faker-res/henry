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
            alternativeQuestion: {des: "forgot user ID?", action: "forgotPassword1_2"},
            question: [{questionNo: 1, des: "Please enter your user ID:"}],
            answerInput: [{type: "text", objKey: "name", questionNo: 1, placeHolder: "Please enter player ID"}],
            action: "forgotPassword1"
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
                {questionNo: 1, des: "1. Please enter last 4 digits of bank account (must answer correctly)"},
                {questionNo: 2, des: "2. Please enter bank card name?"},
                {questionNo: 3, des: "3. Please enter bank card registration city?"},
                {questionNo: 4, des: "4. Please enter bank name?"}],
            answerInput: [
                {type: "text", objKey: "bankAccount", questionNo: 1},
                {type: "text", objKey: "bankCardName", questionNo: 2},
                {type: "select", objKey: "bankCardCity", questionNo: 3},
                {type: "select", objKey: "bankName", questionNo: 4},
                ],
            action: "forgotPassword2_2"
        }
    },
    {upsert: true});

db.clientQnATemplate.update(
    {
        processNo: "2",
        type: type1
    },
    {
        $set: {
            alternativeQuestion: {des: "forgot user ID?", action: "forgotPassword1_2"},
            question: [{questionNo: 1, des: "Please enter your user ID222222222:"}],
            answerInput: [{type: "text", objKey: "name", questionNo: 1, placeHolder: "Please enter player ID2222222"}],
            action: "forgotPassword1"
        }
    },
    {upsert: true});

// endregion

//region forgotUserID
//endregion

//region updatePhoneNumber
//endregion

//region editBankCard
//endregion

//region editName
//endregion