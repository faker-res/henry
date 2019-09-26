import React, {Component} from 'react';

class Menu extends Component{
    state = {
        isToggleOn: true,
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

    loadData(){

        this.props.title.map(item => {
            item.content.map((subitem, i) => {

                console.log('data Name', subitem)
            })
            //return item[Object.keys(item)[0]];
        })
    }

    loadTitle(){
        this.props.title.map(item => {
            console.log('title', item.title)
            return item.title;
        })
    }

    render(){
        console.log('props', this.props);
        this.loadTitle();
        this.loadData()
        return (
            <div>
                <div className="card">
                    <div className="card-header" style={{cursor: "pointer"}} onClick={this.show}>

                        <h2>{this.loadTitle()}
                            {this.state.isToggleOn ? " -" : " +" }</h2>



                    </div>
                    <div className={this.filterBody()}>


                    </div>
                </div>
            </div>
        )
    }
}

//<a href={this.props.url}>{this.props.content}</a>
//{this.props.content.map(item =>
  //  <p>{item}</p>

//)}
/*<p>{this.props.content}</p>*/
/*{this.props.title.map((item, i) =>
    <p>{item[Object.keys(item)[0]]}</p>
)}

<h2>{this.loadTitle()}
                            {this.state.isToggleOn ? " -" : " +" }</h2>

*/
export default Menu;



