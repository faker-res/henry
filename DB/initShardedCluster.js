//add shard
sh.addShard( "rs0/Sinonets-MacBook-Pro-3.local:27017" );
sh.addShard( "rs1/Sinonets-MacBook-Pro-3.local:27030" );

//enable shard for db
sh.enableSharding( "logsdb" );

//use logsdb;
//set shard keys for collection
sh.shardCollection( "logsdb.accessLog", { "_id" : 1 } );