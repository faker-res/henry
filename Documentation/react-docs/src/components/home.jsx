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
        for (let key in api) {
            testData.push(api[key]);
        }
        console.log('test', testData);

        let keys = Object.keys(api).map(key => key.toString());
        let index = keys.findIndex(item => item.toString() === event.target.innerText);
        console.log(index);
        this.setState({display: testData[index]});
        // this.setState({linkList:testData[index].})
    };

    anotherClick = () => {
        console.log('display', this.state.display);
        this.state.display.map(item => {
            this.state.linkList = item.url;
        })

        console.log('url', this.state.linkList);
    }

    render() {
        const lists = Object.keys(this.state.api).map((key, index) => {
            return <li key={index} onClick={this.clickHandler} style={{cursor: "pointer"}}>{key}</li>;
        });

        const btns = this.state.display.map(item => {
                return <button onClick={this.anotherClick} className="btn btn-dark m-1">{item.name}</button>
        });

        // const link = this.state.display.map(item => {
        //     return <a href={item.url}>{item.url} </a>
        // });



        // const linkList = this.state.linkList.map(item =>{
        //     console.log('map', item);
        //     return <a href={item.url}><h1>{item.url}</h1></a>
        // })

        return (
            <div>
                <div className="row">
                    <Menu
                        list = {lists}
                    />
                    <Content
                        linkBtn = {btns}
                        // urlList = {linkList}
                    />
                    {/*{link}*/}
                </div>
            </div>
        );
    }
}

/*return  <a href={item.url}>
    <button onClick={this.clickHandler} className="btn btn-dark m-1">{item.name}</button>
</a>*/
export default Home;