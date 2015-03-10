// Maia WebSocket Transport Handler 
//
// @author balkian
// Grupo de Sistemas Inteligentes
// http://gsi.dit.upm.es
// http://github.com/gsi-upm

var express = require('express');
var bodyParser = require('body-parser');
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
    self.app.use(bodyParser());
}

WHTransport.prototype = Object.create(MaiaTransport.prototype);
WHTransport.prototype.setServer = function(server){
    var self = this;
    MaiaTransport.prototype.setServer.apply(self, arguments);
    var hookHandler = {
        name : 'Hooks Dispatcher',
        send:  function(message){
            var msg = JSON.parse(message);
            self.logger.debug('Received Hook:',msg.name);
        }
    }
    self.server.subscribe(['hook','**'],hookHandler);
    /*
     * Catch hooks and transform them to events
     */
    self.app.post(/^\/(hook\/?.*)/, function(req, res){
        var htype = [];
        if(req.params[0].length>1){
            htype = req.params[0].split('/');
        }
        var outevent = {
            name: htype,
            origin: 'Hooks Dispatcher',
            data: {
                origin: req.connection.remoteAddress,
                body: req.body,
                header: req.header,
            }
        };
        self.logger.info('Received:', outevent.name);
        self.server.emit('message', outevent, self);
        res.end();
    });
}

exports.WHTransport = WHTransport;
