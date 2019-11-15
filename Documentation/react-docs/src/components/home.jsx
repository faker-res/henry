import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';
import apiData from '../data/apiDocumentation';

class Home extends Component {
    constructor(props) {
        super(props);
        let landingPage = "login"
        this.state = {
            curNav: landingPage,
            funcList: apiData[landingPage].func
        };
    }

    clickHandler = (event) => {
        let arr = event.target.parentElement.children;
        for (let i=0; i< arr.length; i++){
            arr[i].className = "nav-item"
        }
        event.target.className += " active";
        for(let key in apiData){
            if(apiData[key].name === event.target.innerText){
                this.setState({curNav: key});
                this.setState({funcList: apiData[key].func});
            }
        }
    };

    drawContents = () => {
        let contents = [];
        for(let key in this.state.funcList){
            contents.push(<Content
                key = {key}
                title = {this.state.funcList[key].title}
                functionName = {this.state.funcList[key].functionName}
                serviceName = {this.state.funcList[key].serviceName}
                desc = {this.state.funcList[key].desc}
                requestContent = {this.state.funcList[key].requestContent}
                respondSuccess = {this.state.funcList[key].respondSuccess}
                respondSuccessContent = {this.state.funcList[key].respondSuccessContent}
                respondFailure = {this.state.funcList[key].respondFailure}
            />);
        }
        return contents;
    }

    render() {
        let navLists = [];
        for(let key in apiData){
            let className = "nav-item";
            className += key === this.state.curNav ? " active" : "";
            navLists.push(<li className={className} key={key} onClick={this.clickHandler}>
                {apiData[key].name}</li>);
        }

        return (
            <div className="container border">
                <div className="text-center border-bottom p-4">
                    <h2>FPMS 客户端 SDK 文档</h2>
                </div>
                <div className="row">
                    <div className="col-4 col-lg-2 pt-2">
                        <Menu
                            nav = {navLists}
                        />
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