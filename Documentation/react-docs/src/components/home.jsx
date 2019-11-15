import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';
import apiData from '../data/apiDocumentation';

// const antiPatternContentKeys = ["guide","definition"];

class Home extends Component {
    constructor(props) {
        super(props);
        let landingPage = "topup"
        this.state = {
            curNav: landingPage,
            displayList: apiData[landingPage].func,
        };
    };

    navClickHandler = (event) => {
        let arr = event.target.parentElement.children;
        for (let i=0; i< arr.length; i++){
            arr[i].className = arr[i].className.replace("active","").trim();
        }
        event.target.className += " active";
        for(let key in apiData){
            if(key === event.target.getAttribute('name')){
                this.setState({curNav: key});
                if(key === "guide") {
                    this.setState({displayList: apiData.guide});
                } else if (key === "definition") {
                    this.setState({displayList: apiData[key].def});
                } else {
                    this.setState({displayList: apiData[key].func});
                }
            }
        }
    };

    drawMenu = () => {
        let navList = [];
        for(let key in apiData){
            let className = "nav-item";
            className += key === this.state.curNav ? " active" : "";
            navList.push(
                <li className={className} key={key} name={key} onClick={this.navClickHandler}>
                    {apiData[key].name}
                </li>
            );
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
        if (curTab === "guide") {
            contents.push(
                <Content
                    key = "guide"
                    title = {this.state.displayList.name}
                    desc = {this.state.displayList.text}
                />
            );
        } else if (curTab === "definition") {
            for(let key in this.state.displayList) {
                contents.push(
                    <Content
                        key = {key}
                        title = {this.state.displayList[key].title}
                        desc = {this.state.displayList[key].desc}
                        fields = {this.state.displayList[key].fields}
                        definitionData = {this.state.displayList[key].definitionData}
                    />
                );
            }
        } else {
            for(let key in this.state.displayList) {
                contents.push(
                    <Content
                        key = {key}
                        title = {this.state.displayList[key].title}
                        functionName = {this.state.displayList[key].functionName}
                        serviceName = {this.state.displayList[key].serviceName}
                        desc = {this.state.displayList[key].desc}
                        requestContent = {this.state.displayList[key].requestContent}
                        respondSuccess = {this.state.displayList[key].respondSuccess}
                        respondSuccessContent = {this.state.displayList[key].respondSuccessContent}
                        respondFailure = {this.state.displayList[key].respondFailure}
                    />
                );
            }
        }
        return contents;
    };

    render() {
        return (
            <div className="container border">
                <div className="text-center border-bottom p-4">
                    <h2>FPMS 客户端 SDK 文档</h2>
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