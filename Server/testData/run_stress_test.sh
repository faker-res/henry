#!/bin/bash

activePlayers=20
totalNumberOfPlayers=200

#activePlayers=10000
#totalNumberOfPlayers=80000

gameId=56f114025b3c956c1cac5063

#export db_address='54.169.55.138:27017'

set -e

# --debug-brk 
#TEST_COUNT=10 mocha -t 10000 testData/mocha-addTestConsumptionData.js

./clear_stress_test_records.sh >/dev/null

rewardId="$(echo -e 'use admindb;\nprint(""+db.rewardType.findOne({name:"PlayerConsumptionReturn"})._id);' | mongo $db_address | tail -n 2 | head -n 1)"
echo "[run_stress_test] rewardId: $rewardId"
platformId="$(echo -e "use admindb;\nprint(''+db.rewardEvent.findOne({type:ObjectId('$rewardId')}).platform);" | mongo $db_address | tail -n 2 | head -n 1)"
echo "[run_stress_test] platformId: $platformId"
providerId="$(echo -e "use admindb;\nprint(''+db.gameProvider.findOne({})._id);" | mongo $db_address | tail -n 2 | head -n 1)"
echo "[run_stress_test] providerId: $providerId"

mongo --eval "var platformId='$platformId', totalPlayers=$totalNumberOfPlayers;" stress-addPlatformPlayer.js
mongo --eval "var platformId='$platformId', gameId='$gameId', consumeTimes=2, playersWithConsumption=$activePlayers, providerId='$providerId';" stress-addPlayerConsumption.js
mongo --eval "var platformId='$platformId', gameId='$gameId', playersWithConsumption=$activePlayers;" stress-addPlayerConsumptionSummary.js
mongo --eval "var platformId='$platformId', gameId='$gameId', topUpTimes=8, playersWithTopUp=$activePlayers;" stress-addPlayerTopUp.js

PLATFORM="$platformId" mocha mocha-startTestTopUpSummaries.js
PLATFORM="$platformId" mocha mocha-startTestConsumptionSettlement.js

# When I did it on AWS:
# mongo --eval "var arg1=100000; var arg2='56f91a769f20b59c56d378be'; var arg3='56f8ec9503d8164a96faef02';" testData/stress-addPlatformPlayer.js
# mongo --eval "var arg1='56f91a769f20b59c56d378be'; var arg2='56f609b3a4b119fd458499d4'; var arg3=10;" stress-addPlayerConsumption.js
# PLATFORM=56f91a769f20b59c56d378be mocha mocha-startTestConsumptionSettlement.js

# stress test for full attendance reward event
# mocha mocha-addTestConsumptionEvent.js
# PLATFORM=5760ff546360cd69609ee29e
# PROVIDER 5761005eb17e8980608da330 GAME 5761005eb17e8980608da331
# PROVIDER 5761005eb17e8980608da332 GAME 5761005eb17e8980608da333
# PLATFORM=5760ff546360cd69609ee29e mocha mocha-addTestFullAttendanceEvent.js
# mongo --eval "var arg1=250; var arg2='5760ff546360cd69609ee29e';" stress-addPlatformPartner.js
# mongo --eval "var arg1=1000; var arg2='5760ff546360cd69609ee29e';" stress-addPlatformPlayer.js
# mongo --eval "var arg1='5760ff546360cd69609ee29e'; var arg2=5;" stress-addPlayerTopUpDaySummary.js
# mongo --eval "var arg1='5760ff546360cd69609ee29e'; var arg2=5;" stress-addPlayerConsumptionDaySummary.js
# mongo --eval "var arg1='5760ff546360cd69609ee29e'; var arg2='5761005eb17e8980608da330'; var arg3='5761005eb17e8980608da331'; var arg4=5;" stress-addProviderPlayerDaySummary.js
# mongo --eval "var arg1='5760ff546360cd69609ee29e'; var arg2='5761005eb17e8980608da332'; var arg3='5761005eb17e8980608da333'; var arg4=5;" stress-addProviderPlayerDaySummary.js
# PLATFORM=5760ff546360cd69609ee29e mocha mocha-startTestFullAttendance.js

# stress test for platform and provider settlement
# mocha mocha-addTestConsumptionEvent.js
# PLATFORM=572d9789c65399505fb8109c
# PLATFORM=572d9789c65399505fb8109c mocha mocha-addTestFullAttendanceEvent.js
# PROVIDER 572d97ac9d8a0b715fd3aae5 GAME 572d97ac9d8a0b715fd3aae6
# PROVIDER 572d97ac9d8a0b715fd3aae7 GAME 572d97ac9d8a0b715fd3aae8
# mongo --eval "var arg1=2500; var arg2='572d9789c65399505fb8109c';" stress-addPlatformPartner.js
# mongo --eval "var arg1=100000; var arg2='572d9789c65399505fb8109c';" stress-addPlatformPlayer.js
# mongo --eval "var platformId='572d9789c65399505fb8109c', gameId='572d97ac9d8a0b715fd3aae6', topUpTimes=10;" stress-addPlayerTopUp.js
# mongo --eval "var platformId='572d9789c65399505fb8109c', gameId='572d97ac9d8a0b715fd3aae6', consumeTimes=10, providerId='572d97ac9d8a0b715fd3aae5';" stress-addPlayerConsumption.js
# mongo --eval "var platformId='572d9789c65399505fb8109c', gameId='572d97ac9d8a0b715fd3aae6';" stress-addPlayerConsumptionSummary.js
# PROVIDER=572d97ac9d8a0b715fd3aae5 mocha mocha-startTestProviderSettlement.js
# PLATFORM=572d9789c65399505fb8109c mocha mocha-startTestPlatformSettlement.js
# PLATFORM=572d9789c65399505fb8109c mocha testAllScheduledTasks.js


#mongo --eval "var platformId='570622bcfe64c7733e0b5a6c', gameId='5706232483e630ad420fb3e3';" stress-addPlayerConsumptionSummary.js
# PLATFORM=570622bcfe64c7733e0b5a6c mocha mocha-startTestConsumptionSettlement.js


# stress test for platform and provider settlement
# mocha mocha-addTestConsumptionEvent.js
# PLATFORM=572d88493ea8d17f2f4c46b4
# PLATFORM=572d88493ea8d17f2f4c46b4 mocha mocha-addTestFullAttendanceEvent.js
# PROVIDER 572d88607c1c848f2f8f51b0 GAME 572d88607c1c848f2f8f51b1
# PROVIDER 572d88607c1c848f2f8f51b2 GAME 572d88607c1c848f2f8f51b3
# mongo --eval "var arg1=50; var arg2='572d88493ea8d17f2f4c46b4';" stress-addPlatformPartner.js
# mongo --eval "var arg1=1000; var arg2='572d88493ea8d17f2f4c46b4';" stress-addPlatformPlayer.js
# mongo --eval "var platformId='572d88493ea8d17f2f4c46b4', gameId='572d88607c1c848f2f8f51b1', topUpTimes=10;" stress-addPlayerTopUp.js
# mongo --eval "var platformId='572d88493ea8d17f2f4c46b4', gameId='572d88607c1c848f2f8f51b1', consumeTimes=10, providerId='572d88607c1c848f2f8f51b0';" stress-addPlayerConsumption.js
# mongo --eval "var platformId='572d88493ea8d17f2f4c46b4', gameId='572d88607c1c848f2f8f51b1';" stress-addPlayerConsumptionSummary.js
# PROVIDER=572d88607c1c848f2f8f51b0 mocha mocha-startTestProviderSettlement.js
# PLATFORM=572d88493ea8d17f2f4c46b4 mocha mocha-startTestPlatformSettlement.js
# PLATFORM=572d88493ea8d17f2f4c46b4 mocha testAllScheduledTasks.js


