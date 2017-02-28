/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
'use strict';

// var Q = require("q");
// var moment = require('moment-timezone');
// var dbUtil = require('./modules/dbutility');
//
// var testDay = dbUtil.getDayTime();
// console.log("testDay", testDay);
//
// Q.resolve("test").then(
//     data1 => {
//         console.log("data1", data1)
//         return Q.reject("error 1").then(
//             data => data,
//             error => Q.reject(error)
//         );
//     },
//     error1 => {
//         console.log("error1", error1)
//     }
// ).then(
//     data2 => {
//         console.log("data2", data2)
//     },
//     error2 => {
//         console.log("error2", error2)
//     }
// ).then(
//     data3 => {
//         console.log("data3", data3)
//     },
//     error3 => {
//         console.log("error3", error3)
//     }
// ).catch(
//     caErr => {
//         console.log("caErr", caErr)
//     }
// );

// class node {
//     constructor(value) {
//         this.value = value;
//         this.left = null;
//         this.right = null;
//     }
// }
//
// class tree {
//     constructor(root) {
//         this.root = root;
//     }
//
//     add(value) {
//         let curNode = this.root;
//         while(curNode){
//             if( value > curNode.value ){
//                 if(curNode.right){
//                     curNode = curNode.right;
//                 }
//                 else{
//                     curNode.right = new node(value);
//                     break;
//                 }
//             }
//             else{
//                 if(curNode.left){
//                     curNode = curNode.left;
//                 }
//                 else{
//                     curNode.left = new node(value);
//                     break;
//                 }
//             }
//         }
//     }
//
//     printPreOrder(node){
//         if(node){
//             // console.log( node );
//             console.log( node.value );
//             this.printPreOrder(node.left);
//             this.printPreOrder(node.right);
//         }
//     }
// }
//
// let testNode1 = new node(10);
// let testTree = new tree(testNode1);
// testTree.add(5);
// testTree.add(6);
// testTree.add(3);
// testTree.add(16);
// testTree.add(12);
// testTree.printPreOrder(testTree.root);

var moment = require('moment-timezone');
var temp = moment().tz('Asia/Singapore').startOf("week").add(3, 'day').toDate().setHours(23, 2, 0, 0);
console.log(moment(temp).tz('Asia/Singapore'));
