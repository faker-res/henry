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
        let list = this.props.list;
        let navList = []
        for(let categoryName in list) {
            let subList = list[categoryName];
            if(categoryName === "noCat") {
                subList.forEach(item => {
                    let className = "nav-item";
                    className += item.key === this.state.curNav ? " active" : "";
                    navList.push(
                        <li className={className} key={item.key} name={item.key} onClick={this.props.onClick}>
                            {item.name}
                        </li>
                    );
                })
            } else {
                navList.push(
                    <span style={{fontSize:'24px'}} key={categoryName}><b><u>{categoryTranslate[categoryName]}: </u></b></span>
                )
                subList.forEach(item => {
                    let className = "nav-item";
                    className += item.key === this.state.curNav ? " active" : "";
                    let childKey = (categoryName || '') + item.key;
                    navList.push(
                        <li className={className} key={childKey} name={item.key} category={categoryName} onClick={this.props.onClick}>
                            {item.name}
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



