import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';
import ApiContent from '../ApiContent';

var selectedName;
class Home extends Component {
    state = {
        display:{},
        linkList:{},
        contentList:{}
    };

    UNSAFE_componentWillMount() {
        // console.log('state', ApiContent[Object.keys(ApiContent)[0]])
        this.setState({display: ApiContent[Object.keys(ApiContent)[0]]})
    }

    clickHandler = (event) => {
        let name = event.target.innerText;
        this.setState({display: ApiContent[name]})
    };

    showContentHandler = (event) => {
        let content = this.state.display;
        selectedName = event.target.innerText;
        this.setState({linkList: content[selectedName]});
    };

    render() {
        var content = "";
        const lists = Object.keys(ApiContent).map((key, index) => {
            return <li key={index} onClick={this.clickHandler} style={{cursor: "pointer"}}>{key}</li>;
        });
        const btns = Object.keys(this.state.display).map((key, index) => {
            return <button key={index} onClick={this.showContentHandler} className="btn btn-dark m-1">{key}</button>
        });
        if(selectedName){
            content = Object.keys(this.state.display[selectedName].requestContent).map((key, index) => {
                console.log('key', key);
                console.log('content', this.state.display[selectedName].requestContent);
                console.log('value', this.state.display[selectedName].requestContent[key]);
                return <li>{key + " : " + this.state.display[selectedName].requestContent[key]}</li>;
            })
        }

        return (
            <div>
                <div className="row">
                    <Menu
                        list = {lists}
                    />
                    （
                        for(let key in object){
                            <Content
                            linkBtn = {btns}

                            desc = {this.state.linkList.desc}
                            requestContent = {content}
                            statusSuccess = {this.state.linkList.statusSuccess}
                            statusFailed = {this.state.linkList.statusFailed}

                            />
                        }

                    ）
                </div>
            </div>
        );
    }
}

export default Home;