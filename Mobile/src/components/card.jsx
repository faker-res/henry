import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'



class Card extends Component {
    state = {  }

    render() { 
        
        return (
                    <div className={this.cardColor()}>
                        <div className="card-header customize-cardHeader">
                            
                            <div className="row">
                                <div className="col-5 col-sm-12">
                                    <FontAwesomeIcon icon={this.props.awesomeIcon} size="3x" /> 
                                </div>

                                <div className="col-7 col-sm-12 text-right">
                                    <h2 className="infoNum">{this.formatValue()}</h2>
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-12 text-right">
                                    <p className="infoText">{this.props.chinese} </p>
                                </div>
                            </div>

                        </div> 

                        <a href="/">
                            <div className={this.footerColor()}>
                                <div className="row">
                                    <div className="col-7 col-sm-12 col-md-7">
                                        <p className="infoText">详细信息</p>
                                    </div>
                                    <div className="col-5 col-sm-12 col-md-5 text-right">
                                        <FontAwesomeIcon icon="arrow-alt-circle-right" size="2x" />
                                    </div>
                                </div>
                            </div>
                        </a>
                    
                    </div>
                
         );
    }

    cardColor() {
        const {info} = this.props;
        let cardColor = "card ";
        cardColor += info === "onlinePlayer" ? "onlinePlayer-cardColor" : "";
        cardColor += info === "topup" ? "topup-cardColor" : "";
        cardColor += info === "withdrawal" ? "withdrawal-cardColor" : "";
        cardColor += info === "bet" ? "bet-cardColor" : "";
        cardColor += info === "newPlayer" ? "newPlayer-cardColor" : "";
        return cardColor;
    }
    footerColor() {
        const {info} = this.props;
        let footerColor = "card-footer customize-cardFooter ";
        footerColor += info === "onlinePlayer" ? "onlinePlayer-footer" : "";
        footerColor += info === "topup" ? "topup-footer" : "";
        footerColor += info === "withdrawal" ? "withdrawal-footer" : "";
        footerColor += info === "bet" ? "bet-footer" : "";
        footerColor += info === "newPlayer" ? "newPlayer-footer" : "";
        return footerColor;
    }
     formatValue() {
        const {value} = this.props;
        const {info} = this.props;
        if (info === "topup"){
            return value.toFixed(2);
        }else if(info === "withdrawal"){
            return value.toFixed(2);
        }else if(info === "bet"){
            return value.toFixed(2);
        }else{
            return value;
        }
    }



}
 
export default Card;