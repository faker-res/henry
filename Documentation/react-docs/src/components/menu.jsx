import React, {Component} from 'react';

const categoryTranslate = {
    player: "玩家",
    partner: "代理",
    platform: "平台"
};

class Menu extends Component{
    state = {
        curNav: this.props.curNav,
    }

    drawNav = () => {
        let category = this.props.list;
        let navList = []
        for(let categoryName in category) {
            let list = category[categoryName];
            if(categoryName === "noCat") {
                list.forEach(item => {
                    let className = "nav-item";
                    className += item.key === this.state.curNav ? " active" : "";
                    navList.push(
                        <li className={className} key={item.key} name={item.key} onClick={this.props.onClick}>
                            <div className="title nocat">
                                <span>{item.name}</span>
                            </div>
                        </li>
                    );
                })
            } else {
                navList.push(
                    <span className="category" key={categoryName}>{categoryTranslate[categoryName]}</span>
                )
                list.forEach(item => {
                    let className = "nav-item";
                    className += item.key === this.state.curNav ? " active" : "";
                    let childKey = (categoryName || '') + item.key;
                    let subList = item.subList;
                    let subListLink = [];
                    subList.forEach(subItem => {
                        subListLink.push(
                            <a href={'#'+subItem.funcKey} key={subItem.funcKey} >{subItem.title}</a>
                        )
                    })
                    navList.push(
                        <li className={className} key={childKey} name={item.key} category={categoryName} onClick={this.props.onClick}>
                            <div className="title">
                                <span>{item.name}</span>
                                <span>></span>
                            </div>
                            <div className="functions">
                                {subListLink}
                            </div>
                        </li>
                    );
                })
            }
        }
        return navList
    }

    render(){
        return (
            <div className="navBar">
                <ul className="navbar-nav mt-3 mb-3">
                    {this.drawNav()}
                </ul>
            </div>

        )
    }
}

export default Menu;



