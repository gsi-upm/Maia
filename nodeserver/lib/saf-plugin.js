var MaiaPlugin = require('./maia-plugin').MaiaPlugin;

var SaFPlugin = function(){
    var self = this;
    var mainArguments = Array.prototype.slice.call(arguments);
    [].unshift.call(arguments,'SaFPlugin');
    MaiaPlugin.apply(self,arguments);
    self.subscriptions = {};
    self.mailbox = {};
    self.online = [];
    self.on('close', function(connection){
        self.logger.debug('Closing connection -> Adding');
        var subs = self.subscriptions[connection.name];
        self.logger.debug('Subs: ', subs);
        if(subs){
            for(var sub in subs){
                self.server.subscribe(Array(sub), subs[sub]);
            }
        }
    });
    self.on('connection', function(connection){
    });
}

SaFPlugin.prototype = Object.create(MaiaPlugin.prototype);

SaFPlugin.prototype.store = function(msg, subs, name){
    this.logger.debug('Logging message: ', msg);
    if(!this.mailbox[name]){
        this.mailbox[name] = {};
    }
    if(!this.mailbox[name][subs]){
        this.mailbox[name][subs] = [];
    }
    this.mailbox[name][subs].push(msg);
}

SaFPlugin.prototype.subscribe = function(subs){
    var self = this;
    for(sub in subs){
        var path = new Array(subs[sub][0]);
        var connection = subs[sub][1];
        var message = subs[sub][2];
        if(message){
            this.logger.debug('Message: ', message);
            this.logger.debug('Persistent: '+message.data.persistent);
            if(message.data.persistent && message.data.persistent === true){
                if(!this.subscriptions[connection.name]){
                    this.subscriptions[connection.name] = {};
                }
                this.subscriptions[connection.name][path] = {
                        name: connection.name,
                        send: function(message){
                            self.store(message, path, connection.name); 
                        }
                }
                this.logger.debug('Subscriptions: ', this.subscriptions);
            }else{
                this.logger.debug('Not Persistent: '+message.data.persistent);
            }
        }
    }
    return subs;
}

SaFPlugin.prototype.unsubscribe = function(subs){
    for(sub in subs){
        var path = subs[sub][0];
        var connection = subs[sub][1];
        var message = subs[sub][2];
        if(message && message.data.permanent && message.data.permanente === true){
            if(this.subscriptions[connection.name]){
                delete this.subscriptions[connection.name][path];
            }
        }
    }
    return subs;
}

SaFPlugin.prototype.processOne = function(msg, connection){
    var path = msg.name;
    if(path[0] === 'saf'){
        this.logger.debug('Resending messages for ' + connection.name);
        this.logger.debug('Mailbox: ',  this.mailbox[connection.name]);
        this.logger.debug('Subscriptions: ',  this.subscriptions[connection.name]);
        var subs = this.subscriptions[connection.name];
        if(subs){
            for(var sub in subs){
                this.server.unsubscribeAll(subs[sub]);
            }
        }
        for(var sub in this.mailbox[connection.name]){
            while(this.mailbox[connection.name][sub].length > 0){
                this.server.send(this.mailbox[connection.name][sub].pop(), connection);
            }
        }
        return null;
    }else{
        return msg;
    }
}

SaFPlugin.prototype.process = function(msgs, conn){
    var results = [];
    for(var i in msgs){
        var temp = this.processOne(msgs[i], conn);
        if(temp){
            results.push(temp);
        }
    }
    return results;
}

exports.SaFPlugin = SaFPlugin;
