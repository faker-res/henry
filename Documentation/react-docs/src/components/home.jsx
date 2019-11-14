import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';
import apiData from '../data/apiDocumentation';

class Home extends Component {
    constructor(props) {
        super(props);
        this.state = {display: apiData.login };
    }

    clickHandler = (event) => {
        let arr = event.target.parentElement.children;
        for (let i=0; i< arr.length; i++){
            arr[i].className = "nav-item"
        }
        event.target.className += " active";
        for(let key in apiData){
            if(apiData[key].name === event.target.innerText){
                this.setState({display: apiData[key]});
                this.setState({funcList: apiData[key].func});
            }
        }
    };

    render() {
        let navLists = [];
        for(let key in apiData){
            navLists.push(<li className="nav-item" key={key} onClick={this.clickHandler}>
                {apiData[key].name}</li>);
        }

        let generateRequestContent = (name) => {
            let rows = [];
            this.state.funcList[name].requestContent.map((item) => {
                rows.push(
                    <tr>
                        <td>{item.param}</td>
                        <td>{item.mandatory}</td>
                        <td>{item.type}</td>
                        <td>{item.content}</td>
                    </tr>
                )
            });
            return rows;
        };

        let generateRespondSuc = (name) => {
            let rows = [];
            for(let key in this.state.funcList[name].respondSuccess){
                if(key == "data") {
                    let lines = this.state.funcList[name].respondSuccess[key].split(/\r?\n/);
                    rows.push(
                        <div>data: {lines[0]}</div>
                    )
                    lines.forEach((line, index) => {
                        if(index > 0) {
                            line = line.replace(/\s/g, "\u00a0"); 
                            rows.push(
                                <div>{line}</div>
                            )
                        }
                    });
                } else {
                    rows.push(
                        <div>{key} : {this.state.funcList[name].respondSuccess[key]}</div>
                    )
                }
            }
            return rows;
        };

        let generateRespondFal = (name) => {
            let rows = [];
            for(let key in this.state.funcList[name].respondFailure){
                rows.push(
                    <div>{key} : {this.state.funcList[name].respondFailure[key]}</div>
                )
            }
            return rows;
        }

        let drawTableRow = (funcName, contentKey) => {
            let rows = [];
            if(this.state.funcList.hasOwnProperty(funcName) && this.state.funcList[funcName].hasOwnProperty(contentKey)) {
                this.state.funcList[funcName][contentKey].map((item) => {
                    rows.push(
                        <tr>
                            {item.param ? <td>{item.param}</td> : null}
                            {item.mandatory ? <td>{item.mandatory}</td> : null}
                            {item.type ? <td>{item.type}</td> : null}
                            {item.content ? <td>{item.content}</td> : null}
                        </tr>
                    )
                });
            }
            return rows;
        }

        let loopContent = () => {
            let contents = [];
            for(let key in this.state.funcList){
                contents.push(<Content
                    title = {this.state.funcList[key].title}
                    functionName = {this.state.funcList[key].functionName}
                    serviceName = {this.state.funcList[key].serviceName}
                    desc = {this.state.funcList[key].desc}
                    requestContent = {generateRequestContent(key)}
                    respondSuccess = {generateRespondSuc(key)}
                    respondSuccessContent = {drawTableRow(key, 'respondSuccessContent')}
                    respondFailure = {generateRespondFal(key)}
                />);
            }
            return contents;
        }

        return (
            <div className="container border">
                <div className="row">
                    <div className="col-4 col-lg-2">
                        <Menu
                            nav = {navLists}
                        />
                    </div>
                    <div className="col-8 col-lg-10 mainContent">
                        {loopContent()}
                    </div>
                </div>
            </div>
        );
    }
}

export default Home;