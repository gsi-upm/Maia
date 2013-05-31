// Maia Node.js Client
//
// This module implements basic methods that any Maia Client should have.
// It is intended to be used as a base Function for all other clients.
// 
// @author balkian
// Grupo de Sistemas Inteligentes
// http://gsi.dit.upm.es
// http://github.com/gsi-upm

var WSClient = require('ws'),
    util = require('util'),
    Logger = require('simple-colourful-logger').Logger,
    events = require('events');

var Client = function(url, config) {
    var self = this;
    if(!config){
        self.config = {};
    }else{
        self.config = config;
    }
    if(!self. config.name){
        self.name = this.constructor.name;
    }else{
        self.name = config.name;
    }
    if(!self.config.closeTimeout){
        self.closeTimeout = 5000;
    }
    if(!self.config.maxattempts){
            self.maxattempts = 12;
    }
    self.url = url;
    self.subscriptions = {};
    self.connected = false;
    self.attempts = 0;
    if(config && config.maxattempts){
        self.maxattempts = config.maxattempts;
    }
    self.logger = new Logger(self.name, ['all']);
    self.logger.debug('Name: '+self.name);
    if(self.url){
        self.connect();
    }
};

util.inherits(Client, events.EventEmitter);

Client.prototype._openHandler = function() {
    var self = this;
    self.connected = true;
    self.attempts = 0;
    for(var sub in self.subscriptions){
        for(var fn in self.subscriptions[sub]){
            self.subscribe(sub,self.subscriptions[sub][fn]);
        }
    }
    self.send('username', {"name": self.name});
}

Client.prototype._closeHandler = function(data){
    var self = this;
    self.connected = false;
    self.logger.debug('closed connection');
    self.connect(self.url);
}

Client.prototype._messageHandler =  function(data, flags) {
    var self = this;
    try{
        self.logger.debug('Message received: ', data);
        var json = JSON.parse(data);
        if(json.forSubscription){
            self.emit(json.forSubscription, json);
        }else{
            self.emit(json.name,json);
        }
    }catch(e){
        self.logger.error('oups', e);
    }
}

Client.prototype.connect = function(url, config){
    var self = this;
    self.attempts += 1;
    if(self.connected){
        return;
    }
    if(self.attempts > self.maxattempts){
        self.logger.error('Giving up!');
        process.exit(-1);
    }
    if(!url){
        url = self.url
    }else{
        self.url = url
    }
    if(!config){
        config = self.config
    }else{
        self.config = config
    }
    self.socket = new WSClient(url, config);
    self.socket.on('open', function(){ self._openHandler.apply(self, arguments)});
    self.socket.on('close', function(){ self._closeHandler.apply(self, arguments)});
    self.socket.on('message', function(){ self._messageHandler.apply(self, arguments)});
    self.logger.log('Trying to connect to ',self.url,'...');
    self.socket.on('error', function(){
        setTimeout(function(){
            self.connect(self.url);
            }, self.closeTimeout);
    });
}

Client.prototype.sendRaw = function(obj){
    this.socket.send(JSON.stringify(obj));
}

Client.prototype.send = function(name, data){
    this.logger.debug('Sending: ', name, data);
    this.sendRaw({"name": name, "time": new Date().getTime(), "data": data})
}

Client.prototype.subscribe = function(event, fn){
    if(this.connected){
        this.logger.debug('Subscribing to ',event);
        this.send("subscribe", {name: event});
        this.on(event, fn);
    }
    if(this.subscriptions[event]){
        if(this.subscriptions[event].indexOf(fn)<0){
            this.subscriptions[event].push(fn);
        }
    }else{
        this.subscriptions[event] = [fn];
    }
}

Client.prototype.unsubscribe = function(event, fn){
    this.logger.debug('State: '+ this.readyState);
    this.removeListener(event, fn);
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
                if(this.subscriptions[event].length<1){
                    delete this.subscriptions[event]
                }
            }
        }
        if(!this.subscriptions[event] && this.connected){
            this.send('unsubscribe', {"name": event});
        }
        this.logger.debug('Subscriptions: ', this.subscriptions);
    }
}

exports.Client = Client;
