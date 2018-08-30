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
            question: "Please enter your user ID",
            alternativeQuestion: "forgot user ID?",
            action: "forgotPassword1"
        }
    },
    {upsert: true});

// endregion