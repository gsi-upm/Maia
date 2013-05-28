/**
 * Parent class for all Maia Server Plugins.
 * It inherits from EventEmitter so that it's easier to send
 * messages to the plugins.
 */
var Logger = require('simple-colourful-logger').Logger;
var EventEmitter = require('events').EventEmitter;
MaiaPlugin = function(name, levels){
    EventEmitter.call(this);
    this.name = name
    this.logger = new Logger(this.name, levels);
    this.on('connection',function(){
        this.logger.debug('New connection');
    });
    
    this.on('close',function(){
        this.logger.debug('Closed connection');
    });
}
MaiaPlugin.prototype = Object.create(EventEmitter.prototype);
MaiaPlugin.prototype.getSubscriptions = function(){
    return [''];
}
MaiaPlugin.prototype.process = function(events){
    return events;
}
MaiaPlugin.prototype.subscribe = function(subscriptions){
    return subscriptions;
}
MaiaPlugin.prototype.unsubscribe = function(subscriptions){
    return subscriptions;
}
exports.MaiaPlugin = MaiaPlugin
