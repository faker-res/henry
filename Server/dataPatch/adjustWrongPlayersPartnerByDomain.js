/**
 * Created by anyone on 6/4/17.
 */

const Q = require("q");
const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");


var domain = ['http://www.ms981.com', 'www.ms981.com', 'ms981.com'];
var partner = 'pjason88';

dbconfig.collection_partner.findOne({partnerName: partner}).then(partnerData => {
    console.log(partnerData.partnerName + " found");
    const cursor = dbconfig.collection_players.find({"domain": {$in: domain}}).cursor();
    var i = 0;
    cursor.eachAsync(
        playerData => {
            console.log(i + ") updating " + playerData.name);
            dbconfig.collection_players.findOneAndUpdate(
                {_id: playerData._id},
                {partner: partnerData._id}
            ).then(updatedData => {
                console.log(updatedData.name + "'s data updated");
            });
            i++;
        }
    );

})