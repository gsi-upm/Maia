// Maia Generic Transport Handler 
//
// @author balkian
// Grupo de Sistemas Inteligentes
// http://gsi.dit.upm.es
// http://github.com/gsi-upm

var Logger = require('simple-colourful-logger').Logger;
var EventEmitter = require('events').EventEmitter;
MaiaTransport = function(name, levels){
    EventEmitter.call(this);
    this.name = name
    this.logger = new Logger(this.name, levels);
}
MaiaTransport.prototype = Object.create(EventEmitter.prototype);
MaiaTransport.prototype.setServer = function(server){
    this.server = server;
}
exports.MaiaTransport = MaiaTransport
