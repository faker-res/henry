const dbConfig = require('./../../modules/dbproperties');
const proposalExecutor = require('./../../modules/proposalExecutor');

const constPlayerTopUpType = require('./../../const/constPlayerTopUpType');
const constProposalStatus = require('./../../const/constProposalStatus');

var dbPaymentProposal = {
    updateFKPTopupProposal: function (proposalId, requestId, orderStatus) {
        let proposalObj;
        let type = constPlayerTopUpType.FUKUAIPAY;
        let bSuccess = orderStatus === constProposalStatus.SUCCESS;
        let lastSettleTime = new Date();

        return dbConfig.collection_proposal.findOne({proposalId: proposalId}).populate({
            path: "type", model: dbConfig.collection_proposalType
        }).then(
            proposalData => {
                if (proposalData && proposalData.data) {
                    proposalObj = proposalData;

                    if (proposalData.status === constProposalStatus.PENDING) {
                        if (orderStatus === constProposalStatus.SUCCESS || orderStatus === constProposalStatus.FAIL) {
                            return dbConfig.collection_proposal.findOneAndUpdate(
                                {_id: proposalObj._id, createTime: proposalObj.createTime},
                                {
                                    status: orderStatus,
                                    "data.lastSettleTime": lastSettleTime
                                }
                            )
                        }
                        else {
                            return Promise.reject({
                                name: 'DataError',
                                message: 'Invalid order status!'
                            })
                        }
                    }
                    else {
                        return Promise.reject({
                            name: 'DataError',
                            message: 'Invalid order!'
                        })
                    }
                } else {
                    return Promise.reject({
                        name: 'DataError',
                        message: 'Order not exists!'
                    })
                }
            }
        ).then(
            preUpdProp => {
                // Check concurrent update
                if (preUpdProp && preUpdProp.status !== constProposalStatus.SUCCESS && preUpdProp.status !== constProposalStatus.FAIL) {
                    return proposalExecutor.approveOrRejectProposal(proposalObj.type.executionType, proposalObj.type.rejectionType, bSuccess, proposalObj);
                }
            }
        );
    },
};
module.exports = dbPaymentProposal;