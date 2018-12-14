const express = require('express');
const app = express();
const port = 7100;
const privateRoutes = require('./routes/privateAPI');
const compression = require('compression');
const bodyParser = require('body-parser');
const http = require('http');
const server = http.createServer(app);

app.use(compression());
// app.use(bodyParser.json());
app.use('/', privateRoutes);

server.listen(port, () => console.log(`Application listening on port ${port}!`));