import React, {Component} from 'react';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

class DateFilter extends Component{
    state = {
        isToggleOn: true,
        startTime: new Date(new Date().setHours(new Date().getHours() - 136), ).toISOString().slice(0,-5),
        endTime: new Date(new Date().setHours(new Date().getHours() + 8)).toISOString().slice(0,-5)
    };

    show = () => {
        this.setState(prevState => ({
            isToggleOn: !prevState.isToggleOn
        }));
    };

    filterBody = () => {
        const {isToggleOn} = this.state;
        let filterBody = "filterBodyClose ";
        filterBody += isToggleOn === true ? "filterBodyOpen" : "";
        return filterBody;

    };


    render(){
        return (
            <div>
                <div className="card">
                    <div className="card-header bg-dark text-white" style={{cursor: "pointer"}} onClick={this.show}>
                        <FontAwesomeIcon icon="search" size="1x" /> {this.state.isToggleOn ? "显示搜索选项" : "隐藏搜索选项"}
                    </div>
                    <div className={this.filterBody()}>
                        <div className="form" style={{padding: "1em"}} >
                            <div className="form-group">
                                <label htmlFor="startTime">开始时间:</label>
                                <input type="datetime-local" className="form-control" id="startTime" ref={this.props.startValue} value={this.props.startTime} onChange={this.props.handleTimeChange}/>
                            </div>
                            <div className="form-group">
                                <label htmlFor="endTime">结束时间:</label>
                                <input type="datetime-local" className="form-control" id="endTime" ref={this.props.endValue} value={this.props.endTime} onChange={this.props.handleTimeChange}/>
                            </div>
                            <br/>
                            <button onClick={this.props.handleSubmit} type="submit" className="btn-block btn btn-dark">搜索</button>
                        </div>

                    </div>
                </div>
            </div>

        )
    }

}

export default DateFilter;


