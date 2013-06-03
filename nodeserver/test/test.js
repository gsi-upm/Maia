var assert = require('assert')
var MaiaServer = require('../lib/maia-server').MaiaServer;
var MaiaPlugin = require('../lib/maia-plugin').MaiaPlugin;
var AuthPlugin = require('../lib/auth-plugin').AuthPlugin;
var WS = require('ws');
var assert = require('assert');

describe('Maia-Server', function(){
    var port = 1338;
    var server = new MaiaServer(port, true, null, []);

    describe('Plugins', function(){
        it('Should be able to add a dummy plugin', function(done){
            var tp = new MaiaPlugin('test',[]);
            server.addPlugin(tp);
            done();
        })
    })
    describe('Subscriptions', function(){
        it('Should be able to subscribe to an event. Ex. "test"', function(done){
            var ws = new WS('ws://localhost:'+port);
            ws.on('open', function() {
                ws.send(JSON.stringify({name:"subscribe",data:{name: "test"}}));
            });
            ws.on('message', function(msg){
                var json = JSON.parse(msg);
                if(json.name === 'subscribed'){
                    done();
                }
            });
        });
        it('Should be able to unsubscribe from an event. Ex. "test::unsubs"', function(done){
            var ws = new WS('ws://localhost:'+port);
            ws.on('open', function() {
                ws.send(JSON.stringify({name:"unsubscribe",data:{name: "test::unsubs"}}));
            });
            ws.on('message', function(msg){
                var json = JSON.parse(msg);
                if(json.name === 'unsubscribed' && json.data.name == "test::unsubs"){
                    ws.close();
                    done();
                }
            });
        });
        it('Should be able to unsubscribe from all the events. Ex. "test::all" "*"', function(done){
            var ws = new WS('ws://localhost:'+port);
            var masks = ["test::all","*"];
            ws.on('open', function() {
                for(var mask in masks){
                    ws.send(JSON.stringify({name:"subscribe",data:{name: masks[mask]}}));
                }
                ws.send(JSON.stringify({name:"unsubscribeAll", data: ""}));
            });
            ws.on('message', function(msg){
                var json = JSON.parse(msg);
                if(json.name === 'unsubscribed'){
                    var ix = masks.indexOf(json.data.name);
                    masks.splice(ix,1);
                    if(ix<0){
                        done(new Error('Unexpected event: "'+json.data.name+'". Expected: '+masks));
                    }
                    if(masks.length<1){
                        ws.close();
                        done();
                    }
                }
            });
        });
        it('Should be able to receive subscribed events', function(done){
            var ws = new WS('ws://localhost:'+port);
            ws.on('open', function() {
                ws.send(JSON.stringify({name:"subscribe",data:{name: "test"}}));
                setTimeout(function(){
                    server.process({name: ['test'], data: "bar"}, this);
                },10);
            });
            ws.on('message', function(msg){
                var json = JSON.parse(msg);
                if(json.forSubscription){
                    ws.close();
                    done();
                }
            });
        });
        it('Must not receive events it is not subscribed to', function(done){
            var ws = new WS('ws://localhost:'+port);
            ws.on('open', function() {
                ws.send(JSON.stringify({name:"subscribe",data:{name: "test0"}}));
            });
            ws.on('message', function(msg){
                var json = JSON.parse(msg);
                if(json.forSubscription){
                    ws.close();
                    done(new Error('unexpected event'));
                }
            });
            setTimeout(function(){
                server.process({name: ['test2'], data: "bar"}, this);
                setTimeout(function(){
                    ws.close();
                    done();
                }, 10);
            },10);
        });
        it('In sent events, The * wildcard should match all "simple" events', function(done){
            var testcases = [["**"],["foo"], ["*"], ["foo","bar"], ["*","bar"], ["foo","*"], ["foo","**","bar"], ["**","bar"]];
            var received = [];
            for(var t in testcases){
                server.subscribe(testcases[t], {
                    name: 'Testcase:'+testcases[t],
                    send: function(msg){
                        var json = JSON.parse(msg);
                        if(json.name === 'subscribed'){
                            return;
                        }else{
                            received.push(json.forSubscription.split(server.separator));
                        }
                    }
                });
            }
            server.process({name:['*'], data:"bogus"}, this);
            setTimeout(function(){
                assert.equal(4, received.length);
                done();
            }, 10);
        });
        it('In sent events, The * wildcard in The middle should replace single tokens', function(done){
            var testcases = [["**"],["foo"], ["*"], ["foo","mid","bar"], ["foo","bar"], ["*","bar"], ["foo","*"], ["foo","**","bar"], ["**","bar"]];
            var received = [];
            for(var t in testcases){
                server.subscribe(testcases[t], {
                    name: 'Testcase:'+testcases[t],
                    send: function(msg){
                        var json = JSON.parse(msg);
                        if(json.name === 'subscribed'){
                            return;
                        }else{
                            received.push(json.forSubscription.split(server.separator));
                        }
                    }
                });
            }
            server.process({name:['foo','*','bar'], data:"bogus"}, this);
            setTimeout(function(){
                assert.equal(4, received.length);
                done();
            }, 10);
        });
        it('In sent events, The ** wildcard should fire all filters', function(done){
            var testcases = [["foo"], ["*"], ["foo","bar"], ["*","bar"], ["foo","*"], ["foo","**","bar"], ["**","bar"]];
            var received = [];
            for(var t in testcases){
                server.subscribe(testcases[t], {
                    name: 'Testcase:'+testcases[t],
                    send: function(msg){
                        var json = JSON.parse(msg);
                        if(json.name === 'subscribed'){
                            return;
                        }else{
                            received.push(json.forSubscription.split(server.separator));
                        }
                    }
                });
            }
            server.process({name:['**'], data:"bogus"}, this);
            setTimeout(function(){
                assert.equal(testcases.length, received.length);
                done();
            }, 10);
        });
        it('The * wildcard should receive all "simple" events', function(done){
            var testcases = [["**"],["foo"], ["*"], ["foo","bar"], ["*","bar"], ["foo","*"], ["foo","**","bar"], ["**","bar"]];
            var received = [];
            server.subscribe(["*"], {
                name: 'Testcase: *',
                send: function(msg){
                    var json = JSON.parse(msg);
                    if(json.name === 'subscribed'){
                        return;
                    }else{
                        received.push(json.name.split(server.separator));
                    }
                }
            });
            for(var t in testcases){
                server.process({name:testcases[t], data:"bogus"}, this);
            }
            setTimeout(function(){
                assert.equal(4, received.length);
                done();
            }, 10);
        });
        it('The * wildcard in The middle should replace single tokens', function(done){
            var testcases = [["**"],["foo"], ["*"], ["foo","mid","bar"], ["foo","bar"], ["*","bar"], ["foo","*"], ["foo","**","bar"], ["**","bar"]];
            var received = [];
            server.subscribe(["foo","*","bar"], {
                name: 'Testcase: foo::*::bar',
                send: function(msg){
                    var json = JSON.parse(msg);
                    if(json.name === 'subscribed'){
                        return;
                    }else{
                        received.push(json.name.split(server.separator));
                    }
                }
            });
            for(var t in testcases){
                server.process({name:testcases[t], data:"bogus"}, this);
            }
            setTimeout(function(){
                assert.equal(4, received.length);
                done();
            }, 10);
        });
        it('The ** wildcard should match all events', function(done){
            var testcases = [["foo"], ["*"], ["foo","bar"], ["*","bar"], ["foo","*"], ["foo","**","bar"], ["**","bar"]];
            var received = [];
            server.subscribe(['**'], {
                name: '** wildcard:',
                send: function(msg){
                    var json = JSON.parse(msg);
                    if(json.name === 'subscribed'){
                        return;
                    }else{
                        received.push(json.name.split(server.separator));
                    }
                }
            });
            for(var t in testcases){
                server.process({name:testcases[t], data:"bogus"}, this);
            }
            setTimeout(function(){
                assert.equal(testcases.length, received.length);
                done();
            }, 10);
        });
    });
})

describe('Auth-Plugin', function(){
    var port = 1339;
    var server = new MaiaServer(port, true, null, []);
    var auth = new AuthPlugin([]);
    server.addPlugin(auth);

    describe('Anonymous users', function(){
        it('Should be able to connect', function(done){
            var ws = new WS('ws://localhost:'+port);
            ws.on('open', function() {
                ws.close();
                done();
            });
        });
        it('Should be able to send messages', function(done){
            var ws = new WS('ws://localhost:'+port);
            var success = {
                name: 'Testing with mocha',
                send: function(msg){
                    var json = JSON.parse(msg);
                    if(json.forSubscription == 'test'){
                        server.unsubscribeAll(success);
                        ws.close();
                        done();
                    }
                }
            }
            server.subscribe(['test'], success);
            server.process({name:['test'], data: {foo: "bar"}}, this);
            ws.on('open', function() {
                ws.send(JSON.stringify({name:"test",data:"testdata"}));
            });
        });
        it('Should be able to receive messages', function(done){
            var ws = new WS('ws://localhost:'+port);
            ws.on('open', function() {
                ws.send(JSON.stringify({name:"subscribe",data:{name: "test"}}));
            });
            ws.on('message', function(msg){
                var json = JSON.parse(msg);
                if(json.forSubscription){
                    ws.close();
                    done();
                }
            });
            setTimeout(function(){
                server.process({name:['test'], data: {foo: "bar"}}, this);
            }, 10);
        });
    });
    describe('Torvalds user', function(){
        it('Should be able to log in', function(done){
            var ws = new WS('ws://localhost:'+port);
            ws.on('open', function() {
                ws.send(JSON.stringify({name:"username",data:{name: "Torvalds"}}));
            });
            ws.on('message', function(msg){
                var json = JSON.parse(msg);
                if(json.name === 'username::accepted'){
                    ws.close();
                    done();
                }
            });
        });
        it('Should not be able to log in if there is another Torvalds', function(done){
            var ws = new WS('ws://localhost:'+port);
            var ws2 = new WS('ws://localhost:'+port);
            ws.on('open', function() {
                ws.send(JSON.stringify({name:"username",data:{name: "Torvalds"}}));
            });
            ws.on('message', function(msg){
                var json = JSON.parse(msg);
                if(json.name === 'username::accepted'){
                    ws2.send(JSON.stringify({name:"username",data:{name: "Torvalds"}}));
                    ws2.on('message', function(msg){
                        var json = JSON.parse(msg);
                        if(json.name === 'username::accepted'){
                            ws.close();
                            ws2.close();
                            done(new Error('Username accepted'));
                        }else if (json.name === 'username::rejected'){
                            ws.close();
                            ws2.close();
                            done();
                        }
                    });
                }
            });
        });
        it('Should be able to subscribe to **', function(done){
            var ws = new WS('ws://localhost:'+port);
            ws.on('open', function() {
                ws.send(JSON.stringify({name:"username",data:{name: "Torvalds"}}));
                ws.send(JSON.stringify({name:"subscribe",data:{name: "**"}}));
            });
            ws.on('message', function(msg){
                var json = JSON.parse(msg);
                if(json.name === 'test'){
                    ws.close();
                    done();
                }
            });
            setTimeout(function(){
                server.process({name:['test'], data: {foo: "bar"}}, this);
            }, 10);
        });
    });
});
