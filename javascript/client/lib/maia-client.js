/** Maia Node.js Client
*
* This module implements basic methods that any Maia Client should have.
* It is intended to be used as a base Function for all other clients.
* 
* @author balkian
* Grupo de Sistemas Inteligentes
* http://gsi.dit.upm.es
* http://github.com/gsi-upm
*/

;!function(exports, undefined) {
    ;var isNode = false;
    if (typeof module !== 'undefined' && module.exports) {
        isNode = true;
    }

    /**
     * MicroEvent - to make any js object an event emitter (server or browser)
     *   * Original source: https://github.com/jeromeetienne/microevent.js
     * - pure javascript - server compatible, browser compatible
     * - dont rely on the browser doms
     * - super simple - you get it immediatly, no mistery, no magic involved
     *
     * - create a MicroEventDebug with goodies to debug
     *   - make it safer to use
     */
    var MicroEvent  = function(){};
    MicroEvent.prototype    = {
        bind    : function(event, fct){
            this._events = this._events || {};
            this._events[event] = this._events[event]   || [];
            this._events[event].push(fct);
        },
        unbind  : function(event, fct){
            this._events = this._events || {};
            if( event in this._events === false  )  return;
            if(!fct){
                this._events[event] = {};
            }else{
                this._events[event].splice(this._events[event].indexOf(fct), 1);
            }
        },
        trigger : function(event /* , args... */){
            this._events = this._events || {};
            console.log('Triggered: ', arguments);
            if( event in this._events === false  )  return;
            console.log('Listeners: ', this._events[event]);
            for(var i = 0; i < this._events[event].length; i++){
                this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
            }
        }
    };

    MicroEvent.prototype.on = MicroEvent.prototype.bind;
    MicroEvent.prototype.off = MicroEvent.prototype.unbind;
    MicroEvent.prototype.emit = MicroEvent.prototype.trigger;

    /**
     * mixin will delegate all MicroEvent.js function in the destination object
     *
     * - require('MicroEvent').mixin(Foobar) will make Foobar able to use MicroEvent
     *
     * @param {Object} the object which will support MicroEvent
     */
    MicroEvent.mixin = function(destObject){
        for( var i in MicroEvent.prototype ){
            if( typeof destObject === 'function' ){
                if(!(i in destObject.prototype)){
                    destObject.prototype[i]  = MicroEvent.prototype[i];
                }
            }else{
                if(!(i in destObject)){
                    destObject[i] = MicroEvent.prototype[i];
                }
            }
        }
    }

    if(isNode){
        module.exports.MicroEvent  = MicroEvent;
        var ws = require('ws'),
            Logger = require('simple-colourful-logger').Logger,
            WSWrapper = ws;
    }else{
        // These are hacks to keep compatibility between the node.js
        // version and the browser version.
        var WebSocket = window.WebSocket || window.MozWebSocket;
        var WSWrapper = function(url){
            var self = this;
            //console.log('Running with:', arguments)
            this.socket = new WebSocket(url);
            this.socket.onopen = function(){
                [].unshift.call(arguments, 'open');
                self.emit.apply(self, arguments);
            };
           this.socket.onerror = function(){
                [].unshift.call(arguments, 'error');
                console.log('This: ->',self);
                self.prototype.emit.apply(self, arguments);
            };
            this.socket.onmessage = function(){
                console.log('Received message:', arguments[0]);
                console.log('Data:', JSON.parse(arguments[0].data));
                var args = ['message', JSON.parse(arguments[0].data)];
                self.emit.apply(self, args);
            };
        };  
        MicroEvent.mixin(WSWrapper);
        //var methods = { 'listeners': ws.prototype.listeners ,'on' : ws.prototype.on, 'send': ws.prototype.send};
        // Doesn't work, and I don't know why
        ////var methods = ws.prototype;
        //for(var funcname in methods ){
            ////console.log('Adding=\''+ funcname + '\'');
            //if(typeof ws.prototype[funcname] === 'function'){
                //WSWrapper.prototype[funcname] = function(){
                    //console.log('Method= \''+funcname+'\'');
                    //this.socket[funcname].apply(this.socket, arguments);
                //};
            //}
            ////console.log('Prototype:',WSWrapper.prototype);
        //}
        WSWrapper.prototype['send'] = function(){
            console.log('Send:', arguments);
            this.socket['send'].apply(this.socket, arguments);
        };
        var Logger = function(){
            return console;
        }
    }
    var Client = function(url, config) {
        var self = this;
        if(!config){
            self.config = {};
        }else{
            self.config = config;
        }
        if(!self. config.name){
            if( this.constructor && this.constructor.name ){
                self.name = this.constructor.name;
            }
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

    MicroEvent.mixin(Client);

    Client.prototype._openHandler = function() {
        console.log('Connected');
        var self = this;
        self.connected = true;
        self.attempts = 0;
        for(var sub in self.subscriptions){
            for(var fn in self.subscriptions[sub]){
                self.subscribe(sub, self.subscriptions[sub][fn]);
            }
        }
        if( self.name ){
            self.username(self.name);
        }
        self.emit('open', arguments[0]);
    }

    Client.prototype._closeHandler = function(data){
        var self = this;
        self.connected = false;
        self.logger.debug('closed connection');
        self.connect(self.url);
        self.emit('close', data);
    }

    Client.prototype._messageHandler =  function(msg, flags) {
        var self = this;
        try{
            self.logger.debug('Message received: ', msg);
            if(msg.forSubscription){
                self.emit('message::'+msg.forSubscription, msg);
            }else if('message::'+msg.forSubscription !== msg.name){
                self.emit(msg.name, msg);
            }
            self.emit('message', msg);
        }catch(e){
            self.logger.error('oups', e.message);
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
            if(isNode){
                process.exit(-1);
            }
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
        self.socket = new WSWrapper(url);
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

    Client.prototype.username = function(name, cb, err){
        this.send("username", { name: name});
        var ffail = function(){
            err();
        }
        if(cb){
            var fok = function(){
                this.unbind("username::acepted")
                this.unbind("username::rejected")
            }
            this.bind("username::acepted", fok);
        }
        if(ffail){
            this.bind("username::rejected", ffail);
        }
    }

    Client.prototype.subscribe = function(event, fn){
        if(this.connected){
            this.logger.debug('Subscribing to ', event);
            this.send("subscribe", { name: event });
            if(fn){
                this.bind('message::'+event, fn);
            }
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
        this.unbind('message::'+event, fn);
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

    exports.MaiaClient = Client;
    exports.MicroEvent = MicroEvent;

}(typeof process !== 'undefined' && typeof process.title !== 'undefined' && typeof exports !== 'undefined' ? exports : window);
