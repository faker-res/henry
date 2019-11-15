import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';
import apiData from '../data/apiDocumentation';

const antiPatternContentKeys = ["guide","definition"];

class Home extends Component {
    constructor(props) {
        super(props);
        let landingPage = "topup"
        this.state = {
            curNav: landingPage,
            funcList: apiData[landingPage].func,
            defList: apiData[landingPage].def
        };
    };

    navClickHandler = (event) => {
        let arr = event.target.parentElement.children;
        for (let i=0; i< arr.length; i++){
            arr[i].className = "nav-item"
        }
        event.target.className += " active";
        for(let key in apiData){
            if(apiData[key].name === event.target.innerText){
                this.setState({curNav: key});
                if(apiData[key].hasOwnProperty("func")) {
                    this.setState({funcList: apiData[key].func});
                    this.setState({defList: undefined})
                } else if (apiData[key].hasOwnProperty("def")) {
                    this.setState({defList: apiData[key].def});
                    this.setState({funcList: undefined})
                }
            }
        }
    };

    drawMenu = () => {
        let navList = [];
        for(let key in apiData){
            let className = "nav-item";
            className += key === this.state.curNav ? " active" : "";
            navList.push(<li className={className} key={key} onClick={this.navClickHandler}>
                {apiData[key].name}</li>);
        }
        return (
            <Menu
                nav = {navList}
            />
        )
    };
    drawContents = () => {
        let contents = [];
        let curTab = this.state.curNav;
        if(!antiPatternContentKeys.includes(curTab)) {
            for(let key in this.state.funcList) {
                contents.push(
                    <Content
                        key = {key}
                        title = {this.state.funcList[key].title}
                        functionName = {this.state.funcList[key].functionName}
                        serviceName = {this.state.funcList[key].serviceName}
                        desc = {this.state.funcList[key].desc}
                        requestContent = {this.state.funcList[key].requestContent}
                        respondSuccess = {this.state.funcList[key].respondSuccess}
                        respondSuccessContent = {this.state.funcList[key].respondSuccessContent}
                        respondFailure = {this.state.funcList[key].respondFailure}
                    />
                );
            }
        } else if(curTab === "guide") {
            contents.push(
                <Content
                    key = "guide"
                    title = {this.state.funcList.guide.title}
                    desc = {this.state.funcList.guide.desc}
                />
            );
        } else if(curTab === "definition") {
            for(let key in this.state.defList) {
                contents.push(
                    <Content
                        key = {key}
                        title = {this.state.defList[key].title}
                        desc = {this.state.defList[key].desc}
                        fields = {this.state.defList[key].fields}
                        definitionData = {this.state.defList[key].definitionData}
                    />
                );
            }
        }
        return contents;
    };

    render() {
        return (
            <div className="container border">
                <div className="row">
                    <div className="col-12 text-center border-bottom p-4">
                        <h2>FPMS 客户端 SDK 文档</h2>
                    </div>
                </div>
                <div className="row">
                    <div className="col-4 col-lg-2 pt-2">
                        {this.drawMenu()}
                    </div>
                    <div className="col-8 col-lg-10 mainContent">
                        {this.drawContents()}
                    </div>
                </div>
            </div>
        );
    }
}

export default Home;