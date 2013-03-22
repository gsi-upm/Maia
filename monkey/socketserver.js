// Code extracted from:
// http://martinsikora.com/nodejs-and-websocket-simple-chat-tutorial 

// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";
 
// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'maia-server';
 
// Port where we'll run the websocket server
var webSocketsServerPort = 1337;
 
// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');
var express = require('express');
var app = express();
 
app.use(express.static('public'));

/**
 * Global variables
 */
// list of currently connected clients (users)
var clients = [ ];
// list of subscriptions
var subscriptions = {};

/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
 
/**
 * HTTP server
 */
var server = http.createServer(app);
server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});


/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket request is just
    // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
    httpServer: server
});

var separator = "::";

function addSubscriber(path,connection){
    var leaf = subscriptions;
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
}

function removeAllSubscriptions(connection){
    var finished = false;
    var stack = [];
    stack.push([]);
    while(!finished){
        var path = stack.pop();
        if(!path){
            finished=true;
            break;
        }
        var n = getNode(path);
        removeSubscription(path,connection);
        for(var ix in n){
            if(ix !== '_subscribers'){
                stack.push(path.concat(Array(ix)));
            }
        }
    }
}

function removeSubscription(path,connection){
    var subs = getSubscriptions(path);
    if(subs){
        var ix = subs.indexOf(connection);
        if(ix>-1){
            subs.splice(ix,1);
        }
        var emptyChildren = false;
        for(var depth=path.length-1;depth>=0;depth--){
            var node = getNode(path.slice(0,depth+1));
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
            delete subscriptions[path[0]];
        }
    }
}

function getNode(path){
    var leaf = subscriptions;
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

function getSubscriptions(path){
    return getNode(path)._subscribers;
}

function modifySubscriptions(path,func){
    var leaf = tree;
    for(var token in path){
        var key = path[token];
        if(!leaf[key]){
            return false;
        }
        leaf = leaf[key]
    }
    return func(leaf._subscribers);
}

function recursiveSearch(tokens, tree, parentN){
    var results = [];
    var key = tokens[0];
    var nextTokens = tokens.slice(1);
    if(tree === undefined){
        return [];
    }
    if(tokens.length < 1){
        if(Array(tree).length == 0 || (Array(tree).length == 1 && tree['_subscribers'])){
            return [parentN];
        }else if ( Array(tree).length == 1 && tree['**']){
            if(parentN && parentN !== ""){
                return [parentN+separator+'**'];
            }else{
                return ['**'];
            }
        }else{
            return [];
        }
    }
    else if(key !== '*' && key !== '**'){
        if(tree[key]){
            results=results.concat(recursiveSearch(nextTokens,tree[key],key));
        }else if(tree['*']){
            results=results.concat(recursiveSearch(nextTokens,tree['*'],'*'));
        }else if(tree['**']){
            results=results.concat(recursiveSearch(nextTokens,tree,''));
            results=results.concat(recursiveSearch(nextTokens,tree['**'],'**'));
            results=results.concat(recursiveSearch(tokens,tree['**'],'**'));
        }
    }
    else{
        var isDouble = (key == '**');
        for(var value in tree){
            if(value !== '_subscribers'){
                results=results.concat(recursiveSearch(nextTokens,tree[value],value));
                if( value === '**'){
                    results=results.concat(recursiveSearch(nextTokens,tree,''));
                }
                if(isDouble){
                    results=results.concat(recursiveSearch(nextTokens,tree,''));
                }
            }
        }
    }
    var realResults = [];
    var set = {}
    for(var result in results){
        if(results[result].length > 0 && !set[results[result]]){
            if(parentN !== ""){
                realResults.push(parentN+separator+results[result]);
            }
            else{
                realResults.push(results[result]);
            }
            set[results[result]] = true;
        }
    }
    return realResults;
}


function subscribe(name,connection){
    var tokens = name.split(separator);
    addSubscriber(tokens,connection);
}

function pokeSubscribers(string,event){
    var leaf = subscriptions;
    var path = string.split(separator);
    for(var point in path){
        leaf=leaf[path[point]];
    }
    event['ForSubscription'] = string;
    leaf = leaf._subscribers;
    for(var subscriber in leaf){
//         console.log(subscriptions);
//         console.log('Poking subscriber: '+leaf[subscriber].name);
        leaf[subscriber].sendUTF(JSON.stringify(event));
    }
}

function sendToSubscribed(event){
    var tokens = event.name.split(separator);
    var results = recursiveSearch(tokens,subscriptions,'')
    for(var result in results){
        pokeSubscribers(results[result],event);
    }
}

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
 
    // accept connection - you should check 'request.origin' to make sure that
    // client is connecting from your website
    // (http://en.wikipedia.org/wiki/Same_origin_policy)
    var connection = request.accept(null, request.origin); 
    // we need to know client index to remove them on 'close' event
    var index = clients.push(connection) - 1;

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
                    var tokens = name.split(separator)
                    console.log('Subscribing: ' + tokens);
                    addSubscriber(tokens,clients[index]);
                    console.log('Subscriptions: ');
                    console.log(subscriptions);
                }else {
                    var obj = {
                        name: msg.name,
                        time: (new Date()).getTime(),
                        data: msg.data,
                        sender: connection.name,
                    };

                    // broadcast message to all connected clients
                    var json = JSON.stringify(obj);
                    sendToSubscribed(obj);
                }
            }catch(err){
                console.log(err);
            }
        
    });
 
    // user disconnected
    connection.on('close', function(conn) {
        console.log((new Date()) + ' Peer '
            + connection.remoteAddress + ' (' + connection.name + ')' + ' disconnected.');
        // remove user from the list of connected clients
//         console.log('Subscriptions:');
//         console.log(subscriptions);
        removeAllSubscriptions(clients[index]);
        console.log('Removed subscriptions');
        console.log('Subscriptions:');
        console.log(subscriptions);
        clients.splice(index, 1);
    });
 
});


