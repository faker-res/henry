"use strict";

const pms2Services = require("./../modules/restServices/pms2Services");

function getPMS2Services (serviceName, data, paymentSystemKey) {
    return pms2Services[serviceName](data, paymentSystemKey)
}

module.exports = {
    getPMS2Services: getPMS2Services,
};