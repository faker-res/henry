angular
.module("myApp", [])
.constant("CONFIG", {
    "NODE_ENV":"local",
    "local":{
        "MANAGEMENT_SERVER_URL":"http://localhost:9000",
        "STATISTICS_SERVER_URL":"http://localhost:8080"},
    "development":{
        "MANAGEMENT_SERVER_URL":"http://ec2-54-169-81-239.ap-southeast-1.compute.amazonaws.com:9000",
        "STATISTICS_SERVER_URL":"http://ec2-54-169-81-239.ap-southeast-1.compute.amazonaws.com:8080"},
    "production":{
        "MANAGEMENT_SERVER_URL":"http://localhost:9000"},
    "bottesting":{
        "MANAGEMENT_SERVER_URL":"http://54.169.235.54:9000",
        "STATISTICS_SERVER_URL":"http://54.169.235.54:8080"}});
