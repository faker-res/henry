/**
 * Created by anyone on 6/4/17.
 */

const Q = require("q");
const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");


const cursor = dbconfig.collection_partner.find({partnerName: "pjason88"}).cursor();
var i = 0;
cursor.eachAsync(
    partnerData => {
        console.log(i + ") updating ownDomain of " + partnerData.partnerName);
        var newDomains = [];
        partnerData.ownDomain.forEach(function (item, index) {
            var filteredDomain = item.replace("https://www.", "").replace("http://www.", "").replace("https://", "").replace("http://", "").replace("www.", "");
            while (filteredDomain.indexOf("/") != -1) {
                filteredDomain = filteredDomain.replace("/", "");
            }
            newDomains.push(item);
            if (item !== filteredDomain) {
                newDomains.push(filteredDomain);
            }
            console.log("newDomains: " + JSON.stringify(newDomains));
            dbconfig.collection_partner.findOneAndUpdate(
                {_id: partnerData._id},
                {ownDomain: newDomains}
            ).then(updatedData => {
                console.log(updatedData.partnerName + "'s ownDomain updated");
            });
        });
        i++;
    }
);