import React, {Component} from 'react';

/*

*/
const htmlTags = ['<img','<b>','<u>','<i>','<h1>','<h2>','<h3>'];

class Content extends Component{
    state = {};
    drawDescription = () => {
        if(this.props.desc) {
            return this.props.desc.split(/\r?\n/).map((v,i) => {
                let isHTML = false;
                htmlTags.forEach(tag => {
                    if(v.toLowerCase().indexOf(tag) > -1) {
                        isHTML = true;
                    }
                })
                if(isHTML) {
                    return (
                        <div key={i} dangerouslySetInnerHTML={{__html: v}}></div>
                    )
                } else {
                    return <p key={i} className="text-justify">{v}</p>
                }
            });
        } else {
            return <p></p>
        }
    };

    render() {
        return (
            <div id={this.props.title} className="mb-1 p-2 ">
                <div className="mt-3">
                    <h2><b>{this.props.title}</b></h2>
                </div>

                <div className="mt-3">
                    {this.drawDescription()}
                </div>
            </div>
        )
    }
}

export default Content;



