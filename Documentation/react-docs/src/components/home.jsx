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
                console.log('res', key);
                rows.push(
                    <h6>{key} : {this.state.funcList[name].respondSuccess[key]}</h6>
                )
            }
            console.log('rows', rows);
            return rows;
        };

        let generateRespondFal = (name) => {
            let rows = [];
            for(let key in this.state.funcList[name].respondFailure){
                console.log('res', key);
                rows.push(
                    <h6>{key} : {this.state.funcList[name].respondFailure[key]}</h6>
                )
            }
            console.log('rows', rows);
            return rows;
        }

        console.log(this.state.display.func);
        console.log(this.state.funcList);
        console.log(this.state);
        let loopContent = () => {
            let temp = [];
            for(let key in this.state.funcList){

                temp.push(<Content
                    title = {this.state.funcList[key].title}
                    functionName = {this.state.funcList[key].functionName}
                    desc = {this.state.funcList[key].desc}
                    requestContent = {generateRequestContent(key)}
                    respondSuccess = {generateRespondSuc(key)}
                    respondFailure = {generateRespondFal(key)}
                />);
            }
            console.log('temp',temp);
            return temp;
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