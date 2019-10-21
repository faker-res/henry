import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';

class Home extends Component {
    state = {
        api: {
            Login: [
                {name: "Login", url: "http://54.179.151.35:888/ClientApi/#登录"},
                {name: "playerLogin", url: "http://54.179.151.35:888/ClientApi/#玩家登录"},
            ],
            Register: [
                {name: "Register", url: "http://54.179.151.35:888/ClientApi/#玩家开户"}
            ]
        },
        display:{},
        linkList:{}
    };

    UNSAFE_componentWillMount() {
        let api = this.state.api;
        let testData = [];
        for (let key in api) {
            testData.push(api[key]);
        }
        let displayData;
        displayData = JSON.parse(JSON.stringify(testData[0]));
        this.setState({display: displayData});
    }

    clickHandler = (event) => {
        let api = this.state.api;
        let testData = [];
        for (let key in api) {
            testData.push(api[key]);
        }
        let index = Object.keys(api).indexOf(event.target.innerText);
        this.setState({display: testData[index]});
        this.setState({linkList: ""});

    };

    showLinkHandler = (event) => {
        let api = this.state.display;
        let index = api.findIndex(item => item.name.toString() === event.target.innerText);
        this.setState({linkList: api[index]});
    };

    render() {
        const lists = Object.keys(this.state.api).map((key, index) => {
            return <li key={index} onClick={this.clickHandler} style={{cursor: "pointer"}}>{key}</li>;
        });

        const btns = this.state.display.map((item, index) => {
                return <button key={index} onClick={this.showLinkHandler} className="btn btn-dark m-1">{item.name}</button>
        });

        return (
            <div>
                <div className="row">
                    <Menu
                        list = {lists}
                    />
                    <Content
                        linkBtn = {btns}

                        url = {this.state.linkList.url}
                        name = {this.state.linkList.name}

                    />
                </div>
            </div>
        );
    }
}

export default Home;