module.exports = {

    byKey: (array, keyName) => {
        var obj = {};
        array.forEach(
            item => obj[item[keyName]] = item
        );
        return obj;
    },

    pluck: (array, field) => array.map( item => item[field] ),

    sum: (array) => array.reduce((a, b) => a + (b === undefined ? 0 : b), 0),

};