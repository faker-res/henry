const express = require('express');
const app = express();
const port = 7100;
const privateRoutes = require('./routes/privateAPI');
const compression = require('compression');
const bodyParser = require('body-parser');

app.use(compression());
app.use(bodyParser.json());
app.use('/', privateRoutes);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));