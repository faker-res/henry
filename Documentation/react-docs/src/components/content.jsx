import React, {Component} from 'react';

class Content extends Component{
    state = {

    };

    iterate(obj, stack) {
        for (var property in obj) {
            if (obj.hasOwnProperty(property)) {
                if (typeof obj[property] == "object") {
                    console.log('object', obj[property]);
                    this.iterate(obj[property], stack + '.' + property);
                } else {
                    console.log(property + "   " + obj[property]);
                    $('#output').append($("<li/>").text(stack + '.' + property))
                }
            }
        }
    }

    // loopRequestContent() {
    //     let content = this.props.requestContent;
    //     console.log('requestContent',content);
    //     for(var key in content){
    //         if(content.hasOwnProperty(key)){
    //             console.log('key',key);
    //             console.log('content',content[key]);
    //             return <p>{key + content[key]}</p>
    //             // return key + " : " +content[key];
    //         }
    //     }
    // };

    render(){
        let content = this.props.requestContent;
        console.log('requestContent',content);
        for(var key in content){
            if(content.hasOwnProperty(key)){
                console.log('key',key);
                console.log('content',content[key]);
                return key + " : " +content[key];
            }
        }
        return (
            <div className="col-8">
                <div className="card">
                    <div className="card-header">
                        {this.props.linkBtn}
                    </div>
                    <div className="card-body" style={{height: "250px"}}>
                        <li>Description: {this.props.desc}</li>
                        <li>
                            {this.props.requestContent}
                        </li>
                        <li>Status Of Success: {this.props.statusSuccess}</li>
                        <li>Status Of Failed: {this.props.statusFailed}</li>
                    </div>
                </div>

            </div>
        )
    }
}
//<li>Request Content: {this.props.requestContent}</li>
export default Content;



