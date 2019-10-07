const dbconfig = require("../modules/dbproperties");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

var i = 0;

dbconfig.collection_qualityInspection.find({
    processTime: {
        $gte: new Date('2019-09-01'),
        $lt: new Date('2019-10-08')
    }
    }, {_id: 1, messageId: 1, live800Acc: 1}).lean().cursor().eachAsync(
    async (qualityInspection) => {

        if (!(qualityInspection && qualityInspection.live800Acc && qualityInspection.live800Acc.id)) {
            return Promise.resolve("No live800Acc");
        }

        let live800AccReg = new RegExp("^" + qualityInspection.live800Acc.id + "$", "i")
        let adminAcc = await dbconfig.collection_admin.findOne({live800Acc: live800AccReg}, {_id: 1}).lean();
        if (!adminAcc) {
            return Promise.resolve("Cannot find admin by live800Acc" + qualityInspection.messageId);
        }
        console.log('qualityInspection data', i, " ", qualityInspection.messageId);
        i++;

        return dbconfig.collection_qualityInspection.update({messageId: qualityInspection.messageId}, {fpmsAcc: adminAcc._id});

    })
