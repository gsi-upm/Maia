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
    MaiaTransport.prototype.setServer.apply(self, arguments);
    self.server = server; 
    // Handle socket connections
    self.wsserver.on('connection', function(connection) {
        //self.logger.info((new Date()) + ' Connection from origin ' + request.origin + '.');
        // accept connection - you should check 'request.origin' to make sure that
        // client is connecting from your website
        // (http://en.wikipedia.org/wiki/Same_origin_policy)
        self.logger.info((new Date()) + ' Connection accepted.');
        self.logger.info('Connection: ' + util.inspect(connection._socket.remoteAddress+':'+connection._socket.remotePort));
        self.server.emit('connection', connection);
        connection.sendOriginal = connection.send;
        connection.send = function(msg){
            connection.sendOriginal(self.server.dumps(msg));
        }
        connection.on('message', function(message, flags) {
            self.logger.debug('New message:',message);
            self.server.emit('message', self.server.loads(message), connection);
        });
        // user disconnected
        connection.on('close', function() {
            self.server.emit('close', connection);
        });
    });
}

exports.WSTransport = WSTransport;
