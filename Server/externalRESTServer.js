const express = require('express');
const app = express();
const port = 7000;
const publicRoutes = require('./routes/publicAPI');
const compression = require('compression');
const bodyParser = require('body-parser');

app.use(compression());
app.use(bodyParser());
app.use('/', publicRoutes);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));