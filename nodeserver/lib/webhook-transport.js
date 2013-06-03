// Maia WebSocket Transport Handler 
//
// @author balkian
// Grupo de Sistemas Inteligentes
// http://gsi.dit.upm.es
// http://github.com/gsi-upm

var express = require('express');
var http = require('http');
var path = require('path');
var MaiaTransport = require('./maia-transport').MaiaTransport;
function WHTransport(port, servestatic, app, levels){
    var self = this;
    self.name = 'WebHook Transport';
    MaiaTransport.call(self, self.name, levels);
    if (!app || typeof app === 'undefined' || typeof app === 'null'){
        self.app = express();
    }
    self.httpserver = http.createServer(self.app);
    self.httpserver.listen(port, function() {
        self.logger.info((new Date()) + " Server is listening on port " + port);
    });
    if(servestatic){
        self.staticpath = path.resolve(__dirname, '../public');
        self.app.use(express.static(self.staticpath));
    }
    self.app.use(express.bodyParser());
}
WHTransport.prototype = Object.create(MaiaTransport.prototype);
exports.WHTransport = WHTransport;
