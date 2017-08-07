/**
 * Created by wanglz on 30/10/15.
 */
var express = require('express');
var router = express.Router();
var path = require('path');

router.get('/:name', function (req, res) {
    var name = req.params.name;
    res.render('category/' + name);
});

router.get('/:name1/:name2', function (req, res) {
    var name1 = req.params.name1;
    var name2 = req.params.name2;
    res.render(path.join('category/', name1, name2));
});

router.get('/:name1/:name2/:name3', function (req, res) {
    var name1 = req.params.name1;
    var name2 = req.params.name2;
    var name3 = req.params.name3;
    res.render(path.join('category/', name1, name2, name3));
});

module.exports = router;




