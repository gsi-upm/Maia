#!/bin/env node
var connect = require('connect'),
    path = require('path');
connect.createServer(
    connect.static(path.join(__dirname,'../'))
).listen(9090);

