import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';

class Home extends Component {
    state = {
        api: {
            Login: [
                {name: "Login", url: "http://54.179.151.35:888/ClientApi/#玩家开户"},
                {name: "playerLogin", url: "http://54.179.151.35:888/ClientApi/#玩家开户"},
            ],
            Register: [
                {name: "Register", url: "http://54.179.151.35:888/ClientApi/#登录"}
            ]
        },
        display:{},
        linkList:{}
    };

    componentWillMount() {
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
        let testDataDetail = [];
        for (let key in api) {
            testData.push(api[key]);
            console.log('key api', api[key][key]);
        }
        console.log('test data', testData);
        let keys = Object.keys(api).map(key => key.toString());
        let index = keys.findIndex(item => item.toString() === event.target.innerText);
        console.log('the index', index);
        this.setState({display: testData[index]});

        // if(index < 0){
        //     this.state.display.map(item => {
        //         if(event.target.innerText === item.name){
        //             console.log('display', item);
        //             this.state.linkList = item.url;
        //         }
        //     })
        // }else{
        //     if(this.state.display[index].name === event.target.innerText){
        //         this.state.linkList = this.state.display[index].url;
        //     }
        // }

    };

    anotherClick = (event) => {
        let api = this.state.display;
        let testDataDetail = [];
        for (let key in api) {
            testDataDetail.push(api[key]);

        }
        testDataDetail.map(item => {
            if(event.target.innerText === item.name){
                this.state.linkList = item.url;
                console.log('link 1', this.state.linkList);
            }
        })

        this.setState({linkList: this.state.linkList});
    }

    render() {
        const lists = Object.keys(this.state.api).map((key, index) => {
            return <li key={index} onClick={this.clickHandler} style={{cursor: "pointer"}}>{key}</li>;
        });
        console.log('btn display', this.state.display);
        const btns = this.state.display.map(item => {
                return <button onClick={this.anotherClick} className="btn btn-dark m-1">{item.name}</button>
        });
        let link = " ";
        console.log('link', this.state.linkList);
        if(this.state.linkList.length > 0){
            link = this.state.linkList;
        }

        return (
            <div>
                <div className="row">
                    <Menu
                        list = {lists}
                    />
                    <Content
                        linkBtn = {btns}
                        urlList = {link}
                    />
                </div>
            </div>
        );
    }
}

/*return  <a href={item.url}>
    <button onClick={this.clickHandler} className="btn btn-dark m-1">{item.name}</button>
</a>*/
export default Home;