rs.initiate();
rs.add("192.168.1.17:27018"); 
rs.add("192.168.1.17:27019");
rs.status();
cfg = rs.conf();
cfg.members[0].priority = 2;
cfg.members[1].priority = 1;
cfg.members[2].priority = 1;
rs.reconfig(cfg);