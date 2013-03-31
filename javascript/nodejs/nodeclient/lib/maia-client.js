// Maia Node.js Client
//
// This module implements basic methods that any Maia Client should have.
// It is intended to be used as a base Function for all other clients.
// 
// @author balkian
// Grupo de Sistemas Inteligentes
// http://gsi.dit.upm.es
// http://github.com/gsi-upm

var WSClient = require('websocket').client,
    util = require('util'),
    Logger = require('simple-colourful-logger').Logger;

var Client = function(config) {
    var self = this;
    if(!config || !config.name){
        self.name = this.constructor.name;
    }else{
        self.name = config.name;
    }
    self.subscriptions = {};
    self.connected = false;
    self.maxattempts = 10;
    self.attempts = 0;
    if(config && config.maxattempts){
        self.maxattempts = config.maxattempts;
    }
    self.logger = new Logger(self.name, ['all']);
    WSClient.call(self,config); 
    self.on('connect', self.connectHandler);
};

util.inherits(Client, WSClient);

Client.prototype.connectHandler = function(connection) {
    var self = this;
    self.connected = true;
    self.attempts = 0;
    self.connection = connection;
    for(var sub in self.subscriptions){
        for(var fn in self.subscriptions[sub]){
            self.subscribe(sub,self.subscriptions[sub][fn]);
        }
    }
    connection.send('{ "name": "username", "data": "'+self.name+'" }');
    connection.on('message', function(data) {
        try{
            self.logger.debug('Message received: ', data.utf8Data);
            var json = JSON.parse(data.utf8Data);
            if(json.forSubscription){
                self.emit(json.forSubscription, json);
            }else{
                self.emit(json.name,json);
            }
        }catch(e){
            self.logger.error('oups', e);
        }
    });
    connection.on('close', function(data){
        self.connected = false;
        self.logger.debug('closed connection');
        self.connect(self.url);
    });
}

Client.prototype.connect = function(){
    var self = this;
    self.attempts += 1;
    if(self.connected){
        return;
    }
    if(self.attempts > self.maxattempts){
        self.logger.error('Giving up!');
        process.exit(-1);
    }
    WSClient.prototype.connect.apply(self,arguments);
    self.logger.log('Trying to connect to ',self.url.href,'...');
    setTimeout(function(){
            self.connect(self.url);
    }, self.config.closeTimeout);
}

Client.prototype.subscribe = function(event, fn){
    if(this.connection){
        this.logger.debug('Subscribing to ',event);
        this.connection.send('{ "name": "subscribe", "data": "'+event+'" }');
        this.on(event, fn);
        if(this.subscriptions[event]){
            if(this.subscriptions[event].indexOf(fn)<0){
                this.subscriptions[event].push(fn);
            }
        }else{
            this.subscriptions[event] = [fn];
        }

    }else{
        this.once('connect', function(){
            this.subscribe(event, fn);
        }); 
    }
}

Client.prototype.unsubscribe = function(event, fn){
    if( typeof fn === 'undefined'){
        for(var fn in subscriptions[event]){
            this.unsubscribe(event,fn);
        }
    }else{
        this.logger.log('Unsubscribing from "', event, '" for function: ',fn.constructor.toString());
        if(this.subscriptions[event]){
            var ix = this.subscriptions[event].indexOf(fn);
            if(ix >= 0){
                this.subscriptions[event].splice(ix,1);
            }
            if(this.subscriptions[event].length < 1){
                this.connection.send('{"name":"unsubscribe", "data":"'+event+'"}');
            }
        }
        this.logger.debug('Subscriptions: ', this.subscriptions);
    }
}

exports.Client = Client;
