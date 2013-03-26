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

var webSocketServer = require('websocket').server;
var express = require('express');
var http = require('http');
var path = require('path');
var logger = require('./logger').logger;

function MaiaServer(webSocketsServerPort, servestatic, app){
    var self = this;
    if (!app || typeof app === 'undefined' || typeof app === 'null'){
        self.app = express();
    }else{
        self.app = app;
    }
    self.separator = "::";
    self.subscriptions = {};
    self.plugins = [];
    self.clients = [];
    if(servestatic){
        self.staticpath = path.resolve(__dirname, '../public');
        self.app.use(express.static(self.staticpath));
    }
    self.app.use(express.bodyParser());
    self.server = http.createServer(self.app);
    self.server.listen(webSocketsServerPort, function() {
        logger.info((new Date()) + " Server is listening on port " + webSocketsServerPort);
    });

    var hookHandler = {
        name : 'Hooks Dispatcher',
        sendUTF:  function(message){
            var msg = JSON.parse(message);
            logger.debug('Received Hook:',msg.name);
        }
    }
    self.addSubscriber(['hook','**'],hookHandler);

    /**
     * WebSocket server
     */
    webSocketServer.call(self, {
        // WebSocket server is tied to a HTTP server. WebSocket request is just
        // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
        httpServer: self.server
    });
    

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
        logger.info('Received:',outevent.name);
        self.send(outevent);
        res.end();
    });

    // Handle socket connections
    self.on('request', function(request) {
        logger.info((new Date()) + ' Connection from origin ' + request.origin + '.');
        // accept connection - you should check 'request.origin' to make sure that
        // client is connecting from your website
        // (http://en.wikipedia.org/wiki/Same_origin_policy)
        var connection = request.accept(null, request.origin); 
        // we need to know client index to remove them on 'close' event
        var index = self.clients.push(connection) - 1;
        logger.info((new Date()) + ' Connection accepted.');
        logger.info('Connection: ' + connection);
        connection.on('message', function(message) {
                try{
                    logger.info((new Date()) + ' Received Message from '
                                + connection.name + ': ' + message.utf8Data);
                    var msg = JSON.parse(message.utf8Data);
                    msg.name = msg.name.split(this.separator);
                    if(msg.name[0] === 'username'){
                        connection.name = msg.data;
                        connection.sendUTF('{"name":"accepted","data":"'+connection.name+'"}')
                    }else if (msg.name[0] === 'subscribe'){
                        var name = msg.data;
                        self.subscribe(name,self.clients[index]);
                        logger.info(self.subscriptions);
                    }else {
                        var obj = {
                            name: msg.name,
                            data: msg.data,
                            origin: connection.name,
                        };
                        self.send(obj);
                    }
                }catch(err){
                    logger.error(err);
                    throw err;
                }
        });
        // user disconnected
        connection.on('close', function(conn) {
            logger.info((new Date()) + ' Peer '
                + connection.remoteAddress + ' (' + connection.name + ')' + ' disconnected.');
            self.removeAllSubscriptions(self.clients[index]);
            logger.debug('Removed subscriptions. Now: ', self.subscriptions);
            self.clients.splice(index, 1);
        });
    });
}

MaiaServer.prototype = Object.create(webSocketServer.prototype);

MaiaServer.prototype.send = function(obj){
    var res = Array(obj);
    for(plugin in this.plugins){
        res = this.plugins[plugin].process(res);
    }
    // broadcast message to all connected clients
    for(i in res){
        logger.debug('Sending:',res[i].name);
        this.sendToSubscribed(res[i]);
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
            return value.join(this.separator);
        }else{
            return value;
        }
    });
}

/**
 * Helper function for escaping input strings.
 */
MaiaServer.prototype.htmlEntities = function(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Helper function to add a subscriber to the list.
 */
MaiaServer.prototype.addSubscriber = function(path,connection){ 
    var leaf = this.subscriptions;
    for(var token in path){
        var key = path[token];
        if(!leaf[key]){
            leaf[key] = {};
        }
        leaf = leaf[key]
    }
    if(!leaf._subscribers){
        leaf._subscribers = [connection,];
    } else {
        leaf._subscribers.push(connection);
    }
    logger.debug('Subscriptions: ', this.subscriptions);
}

/**
 * Remove all the subscriptions for a certain connection.
 *
 */ 
MaiaServer.prototype.removeAllSubscriptions = function(connection){
    var finished = false;
    var stack = [];
    stack.push([]);
    while(!finished){
        var path = stack.pop();
        if(!path){
            finished=true;
            break;
        }
        var n = this.getNode(path);
        this.removeSubscription(path,connection);
        for(var ix in n){
            if(ix !== '_subscribers'){
                stack.push(path.concat(Array(ix)));
            }
        }
    }
}

/**
 * Delete a specific subscription for a connection (user).
 *
 */
MaiaServer.prototype.removeSubscription = function(path,connection){
    var subs = this.getSubscriptions(path);
    if(subs){
        var ix = subs.indexOf(connection);
        if(ix>-1){
            subs.splice(ix,1);
        }
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
MaiaServer.prototype.getSubscriptions = function(path){
        return this.getNode(path)._subscribers;
}

/**
 * Search for subscriptions that match a certain pattern/namespace.
 *
 */
MaiaServer.prototype.recursiveSearch = function(tokens, tree, parentK, parentT){
    var matches = [];
    var key = tokens[0];
    if(tree === undefined){
        logger.error('Tree undefined');
        return [];
    }
    if(!key){
        if(Array(tree).length == 0 || (Array(tree).length == 1 && tree['_subscribers'])){
            return Array([parentT]);
        }else{
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
    }else if(tree['*']){
        matches.push(['*',1]);
    }
    if(tree['**']){
        matches.push(['**',1]);
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

MaiaServer.prototype.subscribe = function(name,connection){
    var tokens = name.split(this.separator);
    this.addSubscriber(tokens,connection);
}

/**
 * Notify all the subscribers of a specific
 *
 */

MaiaServer.prototype.pokeSubscribers = function(tokens ,event){
    var subs = this.getSubscriptions(tokens);
    event['ForSubscription'] = tokens.join(this.separator);
    for(var subscriber in subs){
        logger.debug('Poking subscriber: '+subs[subscriber].name);
        subs[subscriber].sendUTF(this.stringify(event));
    }
    delete event['ForSubscription'];
}

/**
 * Send a notification to all the possible subscribers
 *
 */
MaiaServer.prototype.sendToSubscribed = function(event){
    event.time = (new Date()).getTime();
    var results = this.recursiveSearch(event.name,this.subscriptions)
    logger.debug('Found subscriptions: ',results);
    logger.debug('For event: ',event.name);
    for(var result in results){
        this.pokeSubscribers(results[result],event);
    }
}

MaiaServer.prototype.addPlugin = function(plug){
    plug.server = this;
    var subs = plug.getSubscriptions();
    this.plugins.push(plug);
};

exports.MaiaServer = MaiaServer;
