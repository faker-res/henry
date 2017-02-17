mongo $db_address << !

use playerdb
//db.playerInfo.remove({})

use logsdb
db.playerConsumptionRecord.remove({})
db.playerConsumptionSummary.remove({})
db.playerConsumptionDaySummary.remove({})
db.playerConsumptionWeekSummary.remove({})
db.playerTopUpRecord.remove({})
db.playerTopUpDaySummary.remove({})
db.playerTopUpWeekSummary.remove({})
db.playerTopUpConsumption.remove({})
!
