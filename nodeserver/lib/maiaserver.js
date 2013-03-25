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

function MaiaServer(webSocketsServerPort, servestatic, app){
    var self = this;
    if (!app || typeof app === 'undefined' || typeof app === 'null'){
        self.app = express();
    }else{
        self.app = app;
    }
    self.separator = "::";
    self.subscriptions = {};
    self.clients = [];
    if(servestatic){
        self.staticpath = path.resolve(__dirname, '../public');
        self.app.use(express.static(self.staticpath));
    }
    self.app.use(express.bodyParser());
    self.server = http.createServer(self.app);
    self.server.listen(webSocketsServerPort, function() {
        console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
    });

    var hookHandler = {
        name : 'Hooks Dispatcher',
        sendUTF:  function(message){
            var msg = JSON.parse(message);
            console.log('Received Hook:',msg.name);
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
    self.app.post(/^\/hook(\/?.*)/, function(req, res){
        var htype = '';
        if(req.params[0].length>1){
            htype = req.params[0].replace(/\//g,self.separator)
        }
        var outevent = {
            name: 'hook'+htype,
            origin: 'Hooks Dispatcher',
            data: {
                origin: req.connection.remoteAddress,
                body: req.body,
                header: req.header,
            }
        };
        console.log('Received:',outevent.name);
        self.sendToSubscribed(outevent);
        res.end();
    });

    // Handle socket connections
    self.on('request', function(request) {
        console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
        // accept connection - you should check 'request.origin' to make sure that
        // client is connecting from your website
        // (http://en.wikipedia.org/wiki/Same_origin_policy)
        var connection = request.accept(null, request.origin); 
        // we need to know client index to remove them on 'close' event
        var index = self.clients.push(connection) - 1;
        console.log((new Date()) + ' Connection accepted.');
        console.log('Connection: ' + connection);
        connection.on('message', function(message) {
                try{
                    console.log((new Date()) + ' Received Message from '
                                + connection.name + ': ' + message.utf8Data);
                    var msg = JSON.parse(message.utf8Data);
                    if(msg.name === 'username'){
                        connection.name = msg.data;
                        connection.sendUTF('{"name":"accepted","data":"'+connection.name+'"}')
                    }else if (msg.name === 'subscribe'){
                        var name = msg.data;
                        var tokens = name.split(this.separator)
                        console.log('Subscribing: ' + tokens);
                        self.addSubscriber(tokens,self.clients[index]);
                        console.log('Subscriptions: ');
                        console.log(self.subscriptions);
                    }else {
                        var obj = {
                            name: msg.name,
                            data: msg.data,
                            origin: connection.name,
                        };
                        // broadcast message to all connected clients
                        self.sendToSubscribed(obj);
                    }
                }catch(err){
                    console.log(err);
                }
        });
        // user disconnected
        connection.on('close', function(conn) {
            console.log((new Date()) + ' Peer '
                + connection.remoteAddress + ' (' + connection.name + ')' + ' disconnected.');
            self.removeAllSubscriptions(self.clients[index]);
            console.log('Removed subscriptions. Now: ', self.subscriptions);
            self.clients.splice(index, 1);
        });
    });
}

MaiaServer.prototype = Object.create(webSocketServer.prototype);

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
    console.log('Subscriptions: ', this.subscriptions);
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
MaiaServer.prototype.recursiveSearch = function(tokens, tree, parentN){
    var results = [];
    var key = tokens[0];
    var nextTokens = tokens.slice(1);
    if(tree === undefined){
        return [];
    }
    if(tokens.length < 1){
        if(Array(tree).length == 0 || (Array(tree).length == 1 && tree['_subscribers'])){
            return [parentN];
        }else if(tree['**']){
            results=results.concat(this.recursiveSearch(tokens,tree['**'],'**'));
        }
    }
    else if(key !== '*' && key !== '**'){
        if(tree[key]){
            results=results.concat(this.recursiveSearch(nextTokens,tree[key],key));
        }
        if(tree['*']){
            results=results.concat(this.recursiveSearch(nextTokens,tree['*'],'*'));
        }else if(tree['**']){
            results=results.concat(this.recursiveSearch(nextTokens,tree,''));
            results=results.concat(this.recursiveSearch(nextTokens,tree['**'],'**'));
            results=results.concat(this.recursiveSearch(tokens,tree['**'],'**'));
        }
    }
    else{
        var isDouble = (key == '**');
        for(var value in tree){
            if(value !== '_subscribers'){
                results=results.concat(this.recursiveSearch(nextTokens,tree[value],value));
                if( value === '**'){
                    results=results.concat(this.recursiveSearch(nextTokens,tree,''));
                }
                if(isDouble){
                    results=results.concat(this.recursiveSearch(nextTokens,tree,''));
                }
            }
        }
    }
    var realResults = [];
    var set = {}
    for(var result in results){
        if(results[result].length > 0 && !set[results[result]]){
            if(parentN !== ""){
                realResults.push(parentN+this.separator+results[result]);
            }
            else{
                realResults.push(results[result]);
            }
            set[results[result]] = true;
        }
    }
    return realResults;
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
 * Notify all the subscribers
 *
 */

MaiaServer.prototype.pokeSubscribers = function(string,event){
    var subs = this.getSubscriptions(string.split(this.separator));
    event['ForSubscription'] = string;
    for(var subscriber in subs){
//         console.log(this.subscriptions);
        console.log('Poking subscriber: '+subs[subscriber].name);
        subs[subscriber].sendUTF(JSON.stringify(event));
    }
    delete event['ForSubscription'];
}

MaiaServer.prototype.sendToSubscribed = function(event){
    event.time = (new Date()).getTime();
    var tokens = event.name.split(this.separator);
    var results = this.recursiveSearch(tokens,this.subscriptions,'')
    console.log('Found subscribers: ',results);
    for(var result in results){
        this.pokeSubscribers(results[result],event);
    }
}

exports.MaiaServer = MaiaServer;
