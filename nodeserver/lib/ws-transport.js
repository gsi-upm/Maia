// Maia WebSocket Transport Handler 
//
// @author balkian
// Grupo de Sistemas Inteligentes
// http://gsi.dit.upm.es
// http://github.com/gsi-upm

var webSocketServer = require('ws').Server;
var util = require('util');
var http = require('http');
var express = require('express');
var path = require('path');
var Logger = require('simple-colourful-logger').Logger;
var MaiaTransport = require('./maia-transport').MaiaTransport;

function WSTransport(port, httpserver, app, levels){
    var self = this;
    self.name = 'WebSocket Transport';
    MaiaTransport.call(self, self.name, levels);
    if (!app || typeof app === 'undefined' || typeof app === 'null'){
        self.app = express();
    }else{
        self.app = app;
    }
    if (!httpserver || typeof httpserver === 'undefined' || typeof httpserver === 'null'){
        self.httpserver = http.createServer(self.app);
        self.httpserver.listen(port, function() {
            self.logger.info((new Date()) + " Server is listening on port " + port);
        });
        self.app.use(express.bodyParser());
    }else{
        self.httpserver = httpserver;
    }
    /**
     * WebSocket server
     */
    self.wsserver = new webSocketServer({
        // WebSocket server is tied to a HTTP server. WebSocket request is just
        // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
        server: self.httpserver
    });
}

WSTransport.prototype = Object.create(MaiaTransport.prototype);

WSTransport.prototype.setServer= function(server){
    var self = this;
    self.server = server; 
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
        self.logger.info('Received:',outevent.name);
        self.server.process(outevent,self);
        res.end();
    });
    // Handle socket connections
    self.wsserver.on('connection', function(connection) {
        //self.logger.info((new Date()) + ' Connection from origin ' + request.origin + '.');
        // accept connection - you should check 'request.origin' to make sure that
        // client is connecting from your website
        // (http://en.wikipedia.org/wiki/Same_origin_policy)
        self.logger.info((new Date()) + ' Connection accepted.');
        self.logger.info('Connection: ' + util.inspect(connection._socket.remoteAddress+':'+connection._socket.remotePort));
        self.server.emit('connection', connection);
        connection.on('message', function(message, flags) {
            self.logger.debug('New message:',message);
            self.server.emit('message', message, connection);
        });
        // user disconnected
        connection.on('close', function() {
            self.server.emit('close', connection);
        });
    });
}

exports.WSTransport = WSTransport;
