# NinjaPandaManagement
The Ninja Panda Game Management System v0.1

# Setp up enviorment
Install Mongodb [https://docs.mongodb.org/v3.0/installation/](https://docs.mongodb.org/v3.0/installation/)

Install NodeJS [https://nodejs.org/en/download/](https://nodejs.org/en/download/)

For node server scaling, use nginx or haproxy 
Install haproxy(optional for local env) [http://nepalonrails.tumblr.com/post/9674428224/setup-haproxy-for-development-environment-on-mac](http://nepalonrails.tumblr.com/post/9674428224/setup-haproxy-for-development-environment-on-mac) 

	Optional
	For FPMS server scaling
	Install redis [http://redis.io/download](http://redis.io/download)

	For auto-restart of servers
	sudo npm install -g nodemon
	
Task automation tool for FPMS web client
sudo npm install -g gulp [https://github.com/gulpjs/gulp](https://github.com/gulpjs/gulp)

	For unit test
	sudo npm install -g mocha

# Production Deployment

    Set up DB servers and Init DB data
        Set up Mongodb
        Connect to your DB server
        Initialize shard keys if it is sharded cluster
        mongo initShardKeys.js
        cd DB
        sh initMongodb.sh
        mongo initCounter.js

	Set up DB and server urls
		Modify Server/config/env.js
		//for release production
		var prodConfig = {
    		mode: "production",
    		db: {
    			// admin database url
        		adminDBUrl: 'adminsinonet:passwordsinonet@10.167.11.108:27017/admindb/',
        		// player database url 
        		playerDBUrl: 'playersinonet:passwordsinonet@10.167.11.108:27017/playerdb/',
        		// log database url
        		logsDBUrl: 'logsinonet:passwordsinonet@10.167.11.108:27017/logsdb'
    		},
    		//client api server url
    		clientAPIServerUrl : "ws://10.167.11.109:9280",
    		//provider api server url
    		providerAPIServerUrl : "ws://10.167.11.109:9380",
    		//payment api server url
    		paymentAPIServerUrl: "ws://10.167.11.109:9480"
    		//message server url
    		messageServerUrl: "ws://10.167.11.109:9580"，
    		//CPMS server url
    		cpAPIUrl : "ws://10.167.11.229:9020/websocket",
    		//PMS server url
            paymentAPIUrl: "ws://10.167.11.135:8558/acc",
    		//sms server url
    		smsAPIUrl: "ws://203.192.151.12:8560/sms"
		};
		
		Modify Server/config/settlementEnv.js
		//for release production
		var prodConfig = {
    		mode: "production",
    		//settlement server urls
    		wss: [
        		"ws://10.167.11.109:8001"
    		],
    		//number of settlement server process
    		numOfProcess: 16
		};
	 	
	 	Modify Client/public/js/config.js
	 	"production": {
	 		//management server url
            "MANAGEMENT_SERVER_URL": "http://10.167.11.109:9000"
        }

    Install Dependencies
        cd Client
        npm install
        cd ..
        cd Server
        npm install

    Start all servers
    	//start message server (can add "PORT=9000" for customization)
    	NODE_ENV=production forever start -a -l message.log -o messgsageOut.log -e messageErr.log Server/messageServer.js
    	
    	//start management api server
    	NODE_ENV=production forever start -a -l app.log -o appOut.log -e appErr.log Server/app.js
    	
    	//start management web server
    	cd Client
    	NODE_ENV=production forever start -a -l app.log -o appOut.log -e appErr.log app.js
    	
    	//start client api server
    	NODE_ENV=production forever start -a -l client.log -o clientOut.log -e clientErr.log Server/clientAPIServer.js
    	
    	//start payment api server
    	NODE_ENV=production forever start -a -l payment.log -o paymentOut.log -e paymentErr.log Server/paymentAPIServer.js
    	
    	//start provider api server
    	NODE_ENV=production forever start -a -l provider.log -o providerOut.log -e providerErr.log Server/providerAPIServer.js

    	//start settlement server
    	NODE_ENV=production forever start -a -l settlement.log -o settlementOut.log -e settlementErr.log Server/settlementServer.js
	 
	 	//start schedule server
	 	NODE_ENV=production forever start -a -l schedule.log -o scheduleOut.log -e scheduleErr.log Server/scheduleServer.js

	 	//start data migration server
	 	NODE_ENV=production forever start -a -l mig.log -o migOut.log -e migErr.log Server/dataMigrationServer.js

# Start local develop env
	Under Project directory
	
		//start mongodb server (simple)
		//sudo sh DB/startMongodb.sh
		//start mongodb server (sharded, preferred)
		sudo sh DB/startLocalShard.sh
		//init mongodb data
		sh DB/initMongodb.sh
		
		//run client
		cd Client
		node app.js
		
		//debug client
		From webStorm, right click Client/app.js
		Debug app.js
		
		//run server (auto-restart on file changes)
		cd Server
		nodemon -i public/js/config.js app.js
		
		//run clientAPI server
		cd Server
		nodemon -d 2 clientAPIServer.js
		
		//debug server
		From webStorm, right click Server/app.js
		Debug app.js
		
		//run all unit test for server
		mocha -R spec
		//run single unit test for server
		mocha test/<fileName>.js
		// add -b if you want to bail out on the first error
		
		//debug mocha
		From webStorm, right click test/<fileName>.js
		Debug test/<fileName>.js

# Start all servers for AWS development

	Start mongodb servers(Modified the IP in sartShardedCluster.sh to your IP)
		sudo sh DB/startShardedCluster.sh
		
	Setup mongodb replica set
		mongo 192.168.1.2:27020
		rs.initiate()
		rs.add("192.168.1.2:27021");
		rs.add("192.168.1.2:27022");
		exit 
		
		mongo 192.168.1.2:27030
		rs.initiate()
		rs.add("192.168.1.2:27031");
		rs.add("192.168.1.2:27032");
		exit 
		
	Setup sharding
		mongo
		sh.addShard( "rs0/Sinonets-MacBook-Pro-3.local:27020" )
		sh.addShard( "rs1/Sinonets-MacBook-Pro-3.local:27030" )
		
		sh.enableSharding("logsdb")
		sh.shardCollection("logsdb.accessLog", { "_id": "hashed" } )
		
	Init mongodb admin data
		sh DB/initMongodb.sh		
		
	Start redis, haproxy and all node servers(change NODE_ENV to local)	
		sh ci_update_dev.sh
		
	Create test data for statistics
		mongo Statistics/testData/addTestPlayers.js
		mongo Statistics/testData/addTestAccessLogs.js
		mongo Statistics/testData/addTestPaymentLogs.js

## Directory Layout
    
    Client/           	--> Web front end for FPMS
    Server/        		--> All node servers 
    DB/					--> Mongodb related scripts
    LoadBalancer/		--> Config file for node server loadbalancer
    CodeStyleGuid.md	--> General code style guide
    LICENSE.md			--> License
    README.md			--> Readme
    ci_test.sh			--> Unit test script for CI
    ci_update_dev.sh	--> Automatic update script for CI
    redis.conf			--> Config file for redis server	 
    
## Documents
[System requirement and design](https://docs.google.com/document/d/18w4QLPj4i88SKjNTdJ2RvZXhgqntAoWCOeiO3GARSwM/edit)

[System UI designs](https://docs.google.com/presentation/d/1ADzdnXkrxAgTy34lxFFdb7iKtpwrEG6tmCcbYaNXTLE)

[Project development plan](https://docs.google.com/presentation/d/1bOexFWW8Jl0WAvblEZiyZWQiKLqKqpi9eN3jJyamYUc/)
    
## [Development Site](http://ec2-54-169-3-146.ap-southeast-1.compute.amazonaws.com:3000)

Login User: admin

Password: Sinonet@2016