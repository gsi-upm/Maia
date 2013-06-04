// Maia Server Implementation
//
// @author balkian
// Grupo de Sistemas Inteligentes
// http://gsi.dit.upm.es
// http://github.com/gsi-upm
// 
// Code based on:
// http://martinsikora.com/nodejs-and-websocket-simple-chat-tutorial 
// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/

var Logger = require('simple-colourful-logger').Logger;
var WST = require('./ws-transport').WSTransport;
var WHT = require('./webhook-transport').WHTransport;
var EventEmitter = require('events').EventEmitter;

function MaiaServer(webSocketsServerPort, servestatic, app, levels){
    var self = this;
    EventEmitter.call(self);
    self.name = "Maia-Server"
    self.separator = "::";
    self.subscriptions = {};
    self.subscribers = {};
    self.logger = new Logger('Maia-Server',levels);
    self.plugins = {};
    self.transports = {};
    self.hook = new WHT(webSocketsServerPort, servestatic, app, levels);
    self.server = new WST(webSocketsServerPort, self.hook.httpserver, self.hook.app, levels);
    self.addTransport(self.server);
    //self.addTransport(self.hook);
    
    self.on('connection', function(connection) {
        self.notifyPlugins('connection',connection);
    });
    self.on('message', function(message, connection) {
        try{
            self.logger.info((new Date()) + ' Received Message from '
                        + connection.name + ': ' + message);
            var msg = JSON.parse(message);
            msg.name = msg.name.split(self.separator);
            if (msg.name[0] === 'subscribe'){
                var path = msg.data.name.split(self.separator);
                self.subscribe(path, connection, msg);
                self.logger.info(self.subscriptions);
            }else if (msg.name[0] === 'unsubscribe'){
                var path = msg.data.name.split(this.separator);
                self.unsubscribe(path, connection, msg);
                self.logger.info(self.subscriptions);
            }else if (msg.name[0] === 'unsubscribeAll'){
                self.unsubscribeAll(connection, msg);
                self.logger.info(self.subscriptions);
            }else if (msg.name[0] === 'getSubscriptions'){
                var subs = self.getSubscriptions(connection);
                var res = {};
                for(var sub in subs){
                    res[Array(sub).join(self.separator)] = subs[sub];
                }
                self.send({name: 'subscriptions', data: subs}, connection);
                self.logger.info('Subscriptions for connection'+connection.name, subs);
            }else {
                var obj = {
                    name: msg.name,
                    data: msg.data,
                    origin: connection.name,
                };
                self.process(obj,connection);
            }
        }catch(err){
            self.logger.error(err);
            self.logger.error('Stack: ', err.stack);
            self.logger.error('Message:'+message);
        }
    });
    self.on('close', function(connection){
            self.notifyPlugins('close', connection);
            self.logger.info((new Date()) + ' Peer '
                + connection.remoteAddress + ' (' + connection.name + ')' + ' disconnected.');
            self.unsubscribeAll(connection);
            self.logger.debug('Removed subscriptions. Now: ', self.subscriptions);
    });
}

MaiaServer.prototype = Object.create(EventEmitter.prototype);

/**
 * Adds an event to be sent, and processes it in each plugin.
 * A plugin may modify the event, generate more events, or even
 * silent the event (prevent it from being sent).
 * The second argument is the connection that originated the event,
 * so plugins can modify and act on it.
 */
MaiaServer.prototype.process = function(obj, connection){
    var res = Array(obj);
    for(plugin in this.plugins){
        this.logger.debug('Sending. Processing for plugin:',this.plugins[plugin].name);
        res = this.plugins[plugin].process(res, connection);
    }
    // broadcast message to all connected clients
    for(i in res){
        this.logger.debug('Sending:',res[i].name);
        this.sendToSubscribed(res[i]);
    }
}

/**
 * Send an event to a connection bypassing plugin processing and subscription checking.
 */
MaiaServer.prototype.send = function(event, connection){
    if(!event.time){
        event.time = (new Date()).getTime();
    }
    try{
        connection.send(this.stringify(event));
    }catch(ex){
        this.logger.error('Couldn\'t send event to '+connection.name, event);
        this.logger.error(ex);
    }
}

/**
 * Helper function to stringify an event
 */
MaiaServer.prototype.stringify = function(msg) {
    var firstTime = true;
    return JSON.stringify(msg, function(key,value){
        if( firstTime && key == 'name'){
            firstTime = false;
            if(value instanceof Array){
                return value.join(this.separator);
            }else{
                return value;
            }
        }else{
            return value;
        }
    });
}

/**
 * Get all the subscriptions for a certain connection.
 *
 */ 
MaiaServer.prototype.getSubscriptions= function(connection){
    if(this.subscribers[connection]){
        return this.subscribers[connection];
    }else{
        return [];
    }
}

/**
 * Get all the subscriptions for a certain connection.
 *
 */ 
MaiaServer.prototype._getSubscriptions= function(connection){
    var finished = false;
    var subscriptions = [];
    var stack = [];
    stack.push([]);
    while(!finished){
        var path = stack.pop();
        if(!path){
            finished=true;
            break;
        }
        var n = this.getNode(path);
        if(n['_subscribers'] && n['_subscribers'].indexOf(connection)>=0){
            subscriptions.push(path);
        }
        for(var ix in n){
            if(ix !== '_subscribers'){
                stack.push(path.concat(Array(ix)));
            }
        }
    }
    return subscriptions;
}

/**
 * Remove all the subscriptions for a certain connection.
 *
 */ 
MaiaServer.prototype.unsubscribeAll = function(connection, message){
    var subs = this.getSubscriptions(connection);
    for(var sub in subs){
        this.unsubscribe(sub.split(this.separator), connection, message);
    }
}

/**
 * Delete a specific subscription for a connection (user).
 *
 */
MaiaServer.prototype.unsubscribe = function(path, connection, message){
    var res = [[path, connection, message]];
    for(plugin in this.plugins){
        this.logger.debug('Unsubscribing from '+path+'. Processing for plugin:', this.plugins[plugin].name);
        res = this.plugins[plugin].unsubscribe(res);
    }
    for(i in res){
        path = res[i][0];
        connection = res[i][1];
        var subs = this.getSubscribers(path);
        if(subs){
            var ix = subs.indexOf(connection);
            if(ix>-1){
                subs.splice(ix,1);
                var emptyChildren = false;
                for(var depth=path.length-1;depth>=0;depth--){
                    var node = this.getNode(path.slice(0,depth+1));
                    if(emptyChildren){
                        delete node[path[depth+1]];
                    }
                    if(node._subscribers && node._subscribers.length<1){
                        delete node._subscribers;
                    }
                    if(Object.keys(node).length == 0 || (Object.keys(node) == 1 && node._subscribers.length == 0)){
                        emptyChildren = true;
                    }else{
                        emptyChildren = false;
                    }
                }
                if(emptyChildren){
                    delete this.subscriptions[path[0]];
                }
            }
            var key = path.join(this.separator);
            if(this.subscribers[connection] && this.subscribers[connection][key]){
                delete this.subscribers[connection][key];
                if(this.subscribers[connection].length == 0){
                    delete this.subscribers[connection];
                }
            }
            var name = path; 
            if(path instanceof Array){
                name = name.join(this.separator);
            }
            this.send({name: "unsubscribed", data: {"name": name}}, connection);
        }
    }
}

/**
 * Helper function to get a node in the subscriptions tree, given an array path.
 *
 */

MaiaServer.prototype.getNode = function(path){
    var leaf = this.subscriptions;
    if(typeof path === 'string'){
        path=Array(path);
    }
    for(var token in path){
        var key = path[token];
        if(!leaf[key]){
            return null;
        }else{
            leaf = leaf[key];
        }
    }
    return leaf;
}

/**
 * Get all the subscriptions to an event namespace.
 *
 */
MaiaServer.prototype.getSubscribers = function(path){
        var n = this.getNode(path);
        if(n){
            return n._subscribers;
        }else{
            return [];
        }
}

/**
 * Search for subscriptions that match a certain pattern/namespace.
 *
 */
MaiaServer.prototype.recursiveSearch = function(tokens, tree, parentK, parentT){
    var matches = [];
    var key = tokens[0];
    if(tree === undefined){
        this.logger.error('Tree undefined');
        return [];
    }
    if(!key){
        if(Array(tree).length == 0 || (Array(tree).length == 1 && tree['_subscribers'])){
            return Array([parentT]);
        }else if(!tree['**']){
            return [];
        }
    }
    if( key == '*'){
        for(var tkey in tree){
            if(tkey !== '_subscribers'){
                matches.push([tkey,1]);   
            }
        }
    }else if( key == '**'){
        for(var tkey in tree){
            if(tkey !== '_subscribers'){
                matches.push([tkey,1]);   
                matches.push([tkey,0]);   
            }
        }
        matches.push([null,1]);
    }else if( tree[key] ){
        matches.push([key,1]);
    }
    if(tree['*']){
        matches.push(['*',1]);
    }
    if(tree['**']){
        matches.push(['**',1]);
        matches.push(['**',0]);
    }
    if(parentT === '**'){
        matches.push([null,1]);
    }
    var results = [];
    var set = {};
    for(var match in matches){
        var moveTokens = matches[match][1];
        var moveTree = matches[match][0] != null;
        var nextT = parentT;
        var nextK = parentK;
        var nextTokens = tokens;
        var nextTree = tree;
        if(moveTokens){
            nextK = tokens[0];
            nextTokens = tokens.slice(1);
        }
        if(moveTree){
            nextT = matches[match][0];
            nextTree = tree[nextT];
        }
        tempResults = this.recursiveSearch(nextTokens, nextTree, nextK, nextT);
        if(tempResults.length > 0){
            set[nextT]=true;
            for(var ix in tempResults){
                if(parentT && moveTree){
                    tempResults[ix].unshift(parentT);
                }
                if(!set[JSON.stringify(tempResults[ix])]){
                    results.push(tempResults[ix])
                    set[JSON.stringify(tempResults[ix])] = true;
                }
            }
        }
    }
    return results;
}

/**
 * Add a subscription.
 *
 */

MaiaServer.prototype.subscribe = function(path, connection, message){
    var res = [[path, connection, message]];
    for(plugin in this.plugins){
        this.logger.debug('Subscribing. Processing for plugin:',this.plugins[plugin].name);
        res = this.plugins[plugin].subscribe(res);
    }
    for(i in res){
        path = res[i][0]
        connection = res[i][1]
        this.logger.debug('Subscribing: '+connection.name+' to '+path);
        var leaf = this.subscriptions;
        for(var token in path){
            var key = path[token];
            if(!leaf[key]){
                leaf[key] = {};
            }
            leaf = leaf[key]
        }
        var newsubs = true;
        if(!leaf._subscribers){
            leaf._subscribers = [connection,];
        }else if(leaf._subscribers.indexOf(connection)<0){
            leaf._subscribers.push(connection);
        }else{
            this.logger.debug('Already subscribed.');
            already = false;
        }
        if(newsubs){
            var key = path.join(this.separator);
            if(!this.subscribers[connection]){
                this.subscribers[connection] = {};
            }
            if(!this.subscribers[connection][key]){
                this.subscribers[connection][key] = { time: (new Date()).getTime()};
            }else{
                this.logger.debug('NOT ADDING TO SUBSCRIBERS *********');
            }
        }
        this.logger.debug('Subscribers: ', this.subscribers);
        this.logger.debug('Subscriptions: ', this.subscriptions);
        this.notifyPlugins('subscription',path,connection);
        var name = path; 
        if(path instanceof Array){
            name = name.join(this.separator);
        }
        this.send({name: "subscribed", data: {"name": name}}, connection);
    }
}

/**
 * Notify all the subscribers of a specific subscription
 *
 */
MaiaServer.prototype.pokeSubscribers = function(tokens ,event){
    var subs = this.getSubscribers(tokens);
    event['forSubscription'] = tokens.join(this.separator);
    for(var subscriber in subs){
        this.logger.debug('Poking subscriber: '+subs[subscriber].name);
        this.send(event, subs[subscriber]);
    }
    delete event['forSubscription'];
}

/**
 * Send a notification to all the possible subscribers
 *
 */
MaiaServer.prototype.sendToSubscribed = function(event){
    var results = this.recursiveSearch(event.name,this.subscriptions)
    this.logger.debug('Found subscriptions: ',results);
    this.logger.debug('For event: ',event.name);
    for(var result in results){
        this.pokeSubscribers(results[result],event);
    }
}

MaiaServer.prototype.addPlugin = function(plug){
    plug.setServer(this);
    var subs = plug.getSubscriptions();
    for(var sub in subs){
        this.subscribe(subs[sub], plug); 
    }
    this.plugins[plug.name] = plug;
};

MaiaServer.prototype.removePlugin = function(plug){
    plug.setServer(undefined);
    this.unsubscribeAll(plug);
    delete this.plugins[plug.name];
};

MaiaServer.prototype.addTransport = function(t){
    t.setServer(this);
    this.transports[t.name] = t;
};

MaiaServer.prototype.removeTransport = function(t){
    t.setServer(undefined);
    delete this.transports[t.name];
};

MaiaServer.prototype.notifyPlugins = function(){
    for(var plugin in this.plugins){
        this.logger.debug('Notifying plugin:', this.plugins[plugin].name, arguments[0]);
        this.plugins[plugin].emit.apply(this.plugins[plugin],arguments);
    }
}

exports.MaiaServer = MaiaServer;
