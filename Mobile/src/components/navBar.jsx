import React, {Component} from 'react';
import SelectServer from './selectServer';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faLanguage} from "@fortawesome/free-solid-svg-icons";



class NavBar extends Component{

    state = {
        path: 'navbar',
        isOpen: false
    }

    openNav () {
       const a = document.getElementById("myNav");
       a.style.height ="100%";
    }
    closeNav ()  {
        const a = document.getElementById("myNav");
        a.style.height ="0%";
    }

    toggleNav () {
        const b = document.getElementById("Nav");
        b.classList.toggle("show");
    }

    render(){
        return (
            <div>
                <nav className="nav-bar">
                    <FontAwesomeIcon icon="bars" size="2x" onClick={this.openNav}/>
                    <FontAwesomeIcon className="float-right" icon="user-circle" size="2x" onClick={this.toggleNav} />
                </nav>

                <div id="myNav" className="overlay" >
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

                <div id="Nav" className="dropdown">
                    <a href="#"> <FontAwesomeIcon icon="language"/> English</a>
                    <a href="#"> <FontAwesomeIcon icon="edit"/> 开发日志</a>
                    <a href="#"> <FontAwesomeIcon icon="book-open"/> 查看日志</a>
                    <a href="#"> <FontAwesomeIcon icon="key"/> 更新密码</a>
                    <a href="#"> <FontAwesomeIcon icon="sign-out-alt"/> 注销</a>

                </div>

            </div>
        )
    }
}

export default NavBar;


