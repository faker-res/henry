const express = require('express');
const app = express();
const port = 7100;
const privateRoutes = require('./routes/privateAPI');
const bodyParser = require('body-parser');
const compression = require('compression');

app.use(compression());
app.use(bodyParser.urlencoded({extended: false}));
app.use('/', privateRoutes);

app.listen(port, () => console.log(`Application listening on port ${port}!`));