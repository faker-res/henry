/*
 * Game types FOR TESTING ONLY
 */

"use strict";

const dbGameType = require("../db_modules/dbGameType.js");
const errorUtils = require("../modules/errorUtils.js");

// These are the default game types we start with
const testGameTypes = { CASUAL: "1", CARD: "2", SPORTS: "3" };

// However on a running system, they could be different.
// So let's load the real gametypes from the DB and fix the values above, as soon as possible.
// This means testGameTypes might be incorrect for a few seconds, while the real types load from the DB.
// But for now, that is easier than refactoring!  :-p
dbGameType.getGameTypeList().sort('gameTypeId').then(
    allGameTypes => {
        const realGameTypes = {};
        allGameTypes.forEach(gameType => {
            realGameTypes[gameType.code] = gameType.gameTypeId;
        });

        if (JSON.stringify(testGameTypes) !== JSON.stringify(realGameTypes)) {
            // In practice this data appears to load so quickly, that I think we can remove this warning.
            //console.warn("(testGameTypes and realGameTypes differ!  If testGameTypes have been used before now, things may go wrong.)");
            //console.warn("| testGameTypes:", testGameTypes);
            //console.warn("| realGameTypes:", realGameTypes);
        }

        // We don't replace the testGameTypes variable, we change its contents, because other modules may have a reference to it already.
        for (let key in testGameTypes) {
            delete testGameTypes[key];
        }
        Object.assign(testGameTypes, realGameTypes);

        ensureExpectedTypesExist();
    }
).catch(err => errorUtils.reportError(err));

function ensureExpectedTypesExist () {
    // Our test suite *needs* CASUAL, CARD and SPORTS types.  Some of the tests expect them to exist.
    // So if any of them don't exist, we will just point that type to a type which does exist.

    let fallbackType;
    for (var key in testGameTypes) {
        fallbackType = testGameTypes[key];
    }

    if (!testGameTypes.CASUAL) {
        testGameTypes.CASUAL = fallbackType;
    }
    if (!testGameTypes.CARD) {
        testGameTypes.CARD = fallbackType;
    }
    if (!testGameTypes.SPORTS) {
        testGameTypes.SPORTS = fallbackType;
    }
}

module.exports = testGameTypes;
