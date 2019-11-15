import React, {Component} from 'react';

class Menu extends Component{
    state = {
        curNav: this.props.curNav,
    }

    drawNav = () => {
        let list = this.props.list;
        let navList = []
        list.forEach(item => {
            let className = "nav-item";
            className += item.key === this.state.curNav ? " active" : "";
            navList.push(
                <li className={className} key={item.key} name={item.key} onClick={this.props.onClick}>
                    {item.name}
                </li>
            );
        })
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



