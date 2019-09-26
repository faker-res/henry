import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';


/*<div className="col-lg-8">
    {this.state.testApi.logins.map(item =>
        <Content
            contentId = {item.name}
            contentTitle = {item.name}
        />
    )}
</div>*/

class Home extends Component {
    state = {
        api: [
            {
                title: "Login",
                content: [
                    {name: "login", url: "#login"},
                    {name: "playerLogin", url: "#playerLogin"},
                    {name: "playerAppLogin", url: "#playerAppLogin"}
                ]
            },

            {
                title: "Register",
                content: [
                    {name: "Reg1", url: "#Reg1"},
                    {name: "Reg2", url: "#Reg2"},
                    {name: "Reg3", url: "#Reg3"}
                ]
            }
        ]
    };

    loadData(){

        // this.state.api.forEach( (item, index) => {
        //     console.log('index item', item)
        //     console.log('index', item[Object.keys(item)[0]][index].name)
        //     item[Object.keys(item)[0]].map(subitem => {
        //         console.log('sub item', subitem.url)
        //     })
        //
        // })
        // return <Menu title = {item[Object.keys(item)[0]][index].name} content = {item[Object.keys(item)[0]]}/>


        this.state.api.map((item, i) => {
            item[Object.keys(item)[0]].map(subitem => {
                console.log('content', subitem)
                return subitem;
            })
        })
    }

    loadTitle(){
        this.state.api.map((item, i) => {
            console.log('title', item)
            return item[Object.keys(item)[0]];
        })
    }

    render() {
        // this.loadData();
        // console.log('props here', this.loadTitle())
        return (
            <div>
                <div className="row">
                    <div className="col-lg-4">

                        <Menu
                            title = {this.state.api}
                            content = {this.state.api}
                        />

                    </div>


                </div>
            </div>
        );
    }
}
//{this.state.api.map((item, i) =>
  //  {item[Object.keys(item)[0]].map((subitem, i) =>
    //    <Menu
      //      title = {item[Object.keys(item)[0]][i].name}
        //    content = {subitem.url}
        ///>

    //)}
//)}


export default Home;