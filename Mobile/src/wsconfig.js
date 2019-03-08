let WSCONFIG = {
    "pacnet": {
        "socketURL": "papi-pacnet.fpms8.me:7000",
    },
    "globe": {
        "socketURL": "papi-globe.fpms8.me:7000",
    },
    "wtt": {
        "socketURL": "papi-wtt.fpms8.me:7000",
    },
    "pccw": {
        "socketURL": "papi-pccw.fpms8.me:7000",
    },
    "lan": {
        "socketURL": "papi-lan.fpms8.me:7000",
    },
    "dev": {
        "socketURL": "devtest.fpms8.me:7000",
    },
    "dev-all": {
        "socketURL": "devtest-all.fpms8.me:7000",
    },
    "Default": {
        "NODE_ENV":"local",
        "local":{
            "MANAGEMENT_SERVER_URL":"http://localhost:7000",
            "STATISTICS_SERVER_URL":"http://localhost:8080"
        },
        "development":{
            "MANAGEMENT_SERVER_URL":"http://ec2-54-169-81-239.ap-southeast-1.compute.amazonaws.com:7000",
            "STATISTICS_SERVER_URL":"http://ec2-54-169-81-239.ap-southeast-1.compute.amazonaws.com:8080"
        },
        "production":{
            "MANAGEMENT_SERVER_URL":"http://devtest.wsweb.me:7000"
        },
        "bottesting":{
            "MANAGEMENT_SERVER_URL":"http://54.169.235.54:7000",
            "STATISTICS_SERVER_URL":"http://54.169.235.54:8080"
        }
    }
}

export default WSCONFIG;