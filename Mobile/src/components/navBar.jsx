import React, {Component} from 'react';
import SelectServer from './selectServer';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import authService from '../services/authService';
import localStorageService from '../services/localStorageService';
import navService from '../services/navService.js';


class NavBar extends Component{

    state = {
        path: 'navbar',
        isOpen: false,
        logoutNav: false
    }

    openNav () {
       const a = document.getElementById("myNav");
       a.style.height ="100%";
    }
    closeNav ()  {
        const a = document.getElementById("myNav");
        a.style.height ="0%";
    }

    handleClick = () => {
        if (!this.state.logoutNav) {
            document.addEventListener('click', this.handleOutsideClick, false);
        } else {
            document.removeEventListener('click', this.handleOutsideClick, false);
        }

        this.setState(prevState => ({
            logoutNav: !prevState.logoutNav,
        }));

        console.log('logoutNav', this.state.logoutNav);

    }

    handleOutsideClick = (e) => {
        if (this.node && this.node.contains(e.target)) {
            return;
        }

        this.handleClick();
    }

    // toggleNav () {
    //     const b = document.getElementById("Nav");
    //     b.classList.toggle("show");
    // }
    
    logout() {
        authService.logout();
        localStorageService.logout();
        navService.goto('');
    }

    render(){
        // window.onclick = function(event) {
        //     if (!event.target.matches('.dropbtn') && !event.target.matches('.dropbtn path')) {
        //         var dropdowns = document.getElementsByClassName("dropdown");
        //         for (var i = 0; i < dropdowns.length; i++) {
        //             if (dropdowns[i].classList.contains('show')) {
        //                 dropdowns[i].classList.remove('show');
        //             }
        //         }
        //     }
        // }
        return (
            <div>
                <nav className="nav-bar" ref={node => { this.node = node; }} >
                    <FontAwesomeIcon icon="bars" size="2x" onClick={this.openNav}/>
                    {/*<FontAwesomeIcon className="dropbtn float-right" icon="user-circle" size="2x" onClick={this.toggleNav} />*/}
                    <FontAwesomeIcon className="float-right" icon="user-circle" size="2x" onClick={this.handleClick}/>

                    {this.state.logoutNav && (
                        <div id="Nav" className="dropdown">
                            <a href="#"> <FontAwesomeIcon icon="language"/> English</a>
                            <a href="#"> <FontAwesomeIcon icon="edit"/> 开发日志</a>
                            <a href="#"> <FontAwesomeIcon icon="book-open"/> 查看日志</a>
                            <a href="#"> <FontAwesomeIcon icon="key"/> 更新密码</a>
                            <a onClick={this.logout}> <FontAwesomeIcon icon="sign-out-alt"/> 注销</a>
                        </div>
                    )}
                </nav>

                <div id="myNav" className="overlay">
                <a href="javascript:void(0)" className="closebtn" onClick={this.closeNav}>&times;</a>

                    <div className="overlay-header">
                        <div className="form-group">
                            <select className="form-control">
                                <option>1</option>
                                <option>2</option>
                                <option>3</option>
                                <option>4</option>
                            </select>
                        </div>
                        <SelectServer path={this.state.path} />
                    </div>

                    <div className="overlay-content">
                        <a href="#"> <FontAwesomeIcon icon="tachometer-alt"/> 面板</a>
                        <a href="#"> <FontAwesomeIcon icon="chart-line" /> 分析</a>
                    </div>
                </div>
            </div>
        )
    }
}

export default NavBar;


