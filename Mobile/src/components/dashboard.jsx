import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Card from './card';

class Dashboard extends Component {
    state = {
        cardsInfo: [
            {id:1, info: "onlinePlayer", chinese: "在线玩家", value: 0, awesomeIcon: ['far', 'smile']},
            {id:2, info: "topup", chinese: "充值额度", value: 20000, awesomeIcon: ['fas', 'dollar-sign']},
            {id:3, info: "withdrawal", chinese: "提款额", value: 0, awesomeIcon: ['fas', 'dollar-sign']},
            {id:4, info: "bet", chinese: "投注额", value: 100000, awesomeIcon: ['far', 'money-bill-alt']},
            {id:5, info: "newPlayer", chinese: "新玩家", value: 0, awesomeIcon: ['fas', 'user-plus']},
        ],
        data: [
            {id: 1, info: "newPlayer", chinese: "提案", value: 0, awesomeIcon:['far','smile']},
            {id: 2, info: "topup", chinese: "优惠申请数", value: 0, awesomeIcon:['far','registered']},
            {id: 3, info: "bet", chinese: "优惠申请额度", value: 0, awesomeIcon:['far','stop-circle']},
        ]
    }
    render() {
        return (
            <div className="col-12">
                <br></br>
                <h1>平台選擇</h1>
                <hr></hr>
                <div className="card-deck">
                    {this.state.cardsInfo.map(c =>
                        <Card
                            key = {c.id}
                            info = {c.info}
                            chinese = {c.chinese}
                            value = {c.value}
                            awesomeIcon = {c.awesomeIcon}
                        />
                    )}
                </div>

                <br></br>
                <h1>营运数据</h1>
                <hr></hr>
                <div className="row">
                    <div className="col-sm-9 col-md-7 ">
                        <div className="card-deck">
                            {this.state.data.map(d =>
                                <Card
                                    key = {d.id}
                                    info = {d.info}
                                    chinese = {d.chinese}
                                    value = {d.value}
                                    awesomeIcon = {d.awesomeIcon}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

        );
    }
}

export default Dashboard;