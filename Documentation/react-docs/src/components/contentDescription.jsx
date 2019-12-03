import React, {Component} from 'react';

/*

*/
const htmlTags = ['<img','<b>','<u>','<i>','<h1>','<h2>','<h3>','<h4>','<h5>','<h6>','<span>'];
const TEMPLATE = '<template>';

class Content extends Component{
    state = {};
    drawDescription = () => {
        if(this.props.desc) {
            let splitResult = this.splitTextAndHtml(this.props.desc);
            let descriptionRender = [];
            splitResult.forEach((item, index) => {
                let isHTML = false;
                htmlTags.forEach(tag => {
                    if(item.toLowerCase().indexOf(tag) > -1) {
                        isHTML = true;
                    }
                })
                if(isHTML) {
                    descriptionRender.push(
                        <div key={index} dangerouslySetInnerHTML={{__html: item}}></div>
                    )
                } else if(item.toLowerCase().indexOf(TEMPLATE) > -1) {
                    descriptionRender.push(this.drawCodeArea(item, index));
                } else {
                    descriptionRender.push(
                        item.split(/\r?\n/).map((v,i) => {
                            return (
                                <p key={i} className="text-justify">{v}</p>
                            )
                        })
                    )
                }
            })
            return descriptionRender;
        } else {
            return <p></p>
        }
    };

    splitTextAndHtml = (text) => {
        let splitResult = [];
        if(text) {
            let desc = text;
            let tagIndexFrom = 0;
            for(let tagIndex = desc.indexOf('<'), x = 0; tagIndex > -1 && x < 30; tagIndex = desc.indexOf('<', tagIndexFrom), x++) {
                tagIndexFrom = 0;
                let openTagIndexS = desc.indexOf('<', tagIndex);
                let openTagIndexE = desc.indexOf('>', openTagIndexS);
                let openTag = desc.substr(openTagIndexS, openTagIndexE - openTagIndexS+1);
                if(htmlTags.includes(openTag)) {
                    let textBeforeTag = desc.substr(0, tagIndex);
                    if(textBeforeTag.trim().length) {
                        splitResult.push(desc.substr(0, tagIndex));
                    }
                    let closeTag = openTag.slice(0,1) + '/' + openTag.slice(1);
                    let targetTag = new RegExp(openTag+'|'+closeTag, 'gi');
                    let tags = desc.match(targetTag);
                    let tagCloseSequence = 0;
                    for(let x = 0; tags[x]===openTag; x++) {
                        tagCloseSequence = x;
                    }
                    let closeTagIndex = openTagIndexS;
                    for(let x = 0; x <= tagCloseSequence; x++) {
                        closeTagIndex = desc.indexOf(closeTag, closeTagIndex);
                        closeTagIndex += closeTag.length;
                    }
                    let tagStrLength = closeTagIndex - openTagIndexS + 1;
                    splitResult.push(desc.substr(openTagIndexS, tagStrLength));
                    desc = desc.substr(closeTagIndex);
                } else {
                    tagIndexFrom = tagIndex + 1;
                }
            }
            if(desc.trim().length) {
                splitResult.push(desc);
            }
        }
        return splitResult;
    }

    drawCodeArea = (text, idx) => {
        let rows = [];
        if(text) {
            let lines = text.split(/\r?\n/);
            lines = lines.filter(Boolean);
            lines.forEach((line, index) => {
                if(index > 0 && index < lines.length - 1) {
                    line = line.replace(/\s/g, "\u00a0");
                    rows.push(
                        <div key={index}>{line}</div>
                    )
                }
            });
        }
        return (
            <div key={idx} className="code-area bg-light p-1 pl-2">
                {rows}
            </div>
        )
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



