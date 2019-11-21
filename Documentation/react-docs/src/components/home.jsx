import React, { Component } from 'react';
import Menu from './menu';
import ContentDescription from './contentDescription';
import Content from './content';
import apiData from '../data/apiDocumentation';

const antiPatternContentKeys = ["guide","definition"];

class Home extends Component {
    constructor(props) {
        super(props);
        const landingPage = "reward";
        this.state = {
            curNav: landingPage,
            curCategory: "player",
            displayList: apiData.player[landingPage].func || apiData.player[landingPage].def || apiData.player[landingPage]
        };
    };

    navClickHandler = (event) => {
        let arr = event.target.parentElement.children;
        for (let i=0; i< arr.length; i++){
            arr[i].className = arr[i].className.replace("active","").trim();
        }
        event.target.className += " active";
        
        if(event.target.getAttribute('name') === "guide" && event.target.getAttribute('category') == null) {
            this.setState({displayList: apiData.guide});
            this.setState({curNav: "guide"});
            this.setState({curCategory: null});
        } else if (event.target.getAttribute('name') === "definition" && event.target.getAttribute('category') == null) {
            this.setState({displayList: apiData.definition.def});
            this.setState({curNav: "definition"});
            this.setState({curCategory: null});
        } else {
            for(let categoryName in apiData){
                if(categoryName === event.target.getAttribute('category')){
                    let category = apiData[categoryName];
                    for(let key in category){
                        if(key === event.target.getAttribute('name')){
                            this.setState({curNav: key});
                            this.setState({curCategory: categoryName});
                            this.setState({displayList: apiData[categoryName][key].func});
                        }
                    }
                }
            }
        }
    };

    buildMenuList = () => {
        let menuList = {noCat:[]};
        for(let categoryName in apiData) {
            if(antiPatternContentKeys.includes(categoryName)) {
                menuList.noCat.push({
                    name: apiData[categoryName].name,
                    key: categoryName,
                });
            } else {
                menuList[categoryName] = [];
                let category = apiData[categoryName];
                for(let key in category){
                    let subList = [];
                    if(category[key].hasOwnProperty('func')) {
                        for(let funcName in category[key].func) {
                            subList.push({
                                title: category[key].func[funcName].title,
                                funcKey: funcName
                            })
                        }
                    }
                    menuList[categoryName].push({
                        name: category[key].name,
                        key: key,
                        subList
                    });
                }
            }
        }
        return menuList;
    };

    drawContentDescription = () => {
        if(this.state.curCategory) {
            return(
                <ContentDescription
                    title = {apiData[this.state.curCategory][this.state.curNav].name}
                    desc = {apiData[this.state.curCategory][this.state.curNav].desc}
                />
            )
        }
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
                <div className="row">
                    <div className="col-12 text-center border-bottom p-4">
                        <h2>FPMS 客户端 SDK 文档</h2>
                    </div>
                </div>
                <div className="row">
                    <div className="col-4 col-lg-2 pt-2">
                    <Menu
                        curNav = {this.state.curNav}
                        list = {this.buildMenuList()}
                        onClick = {this.navClickHandler}
                    />
                    </div>
                    <div className="col-8 col-lg-10 mainContent">
                        {this.drawContentDescription()}
                        {this.drawContents()}
                    </div>
                </div>
            </div>
        );
    }
}

export default Home;