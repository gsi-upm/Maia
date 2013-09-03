var MaiaPlugin = require('./maia-plugin').MaiaPlugin;

var AuthPlugin = function(){
    var self = this;
    var mainArguments = Array.prototype.slice.call(arguments);
    [].unshift.call(arguments,'AuthPlugin');
    MaiaPlugin.apply(this,arguments);
    this.taken = [];
    this.whitelist = ['Torvalds'];
    this.on('close', function(connection){
        var i = self.taken.indexOf(connection.name);
        if(i>=0){
            self.logger.debug('Freeing the username: ', connection.name);
            self.taken.splice(i, 1);
        }
    });
}

AuthPlugin.prototype = Object.create(MaiaPlugin.prototype);

AuthPlugin.prototype.processOne = function(msg, connection){
    var path = msg.name;
    if(path[0] === 'username'){
        this.logger.debug('Processing '+path[0]+' ->' + typeof path[0]);
        var name = msg.data.name;
        if(this.taken.indexOf(name)<0 || connection.name == name){
            connection.name = name;
            this.taken.push(name);
            this.logger.debug('Accepted: ' + name);
            this.server.send({name:"username::accepted",data:{name: connection.name}}, connection)
        }else{
            this.logger.debug('Already taken: ' + name);
            this.server.send({name:"username::rejected",data: {name: name}} , connection)
        }
        return;
    }else{
        return msg;
    }
}

AuthPlugin.prototype.process = function(msgs, conn){
    this.logger.debug('Processing: '+ conn.name);
    var results = [];
    for(var i in msgs){
        var temp = this.processOne(msgs[i], conn);
        if(temp){
            results.push(temp);
        }
    }
    return results;
}

AuthPlugin.prototype.subscribe = function(subs){
    var results = [];
    for(sub in subs){
        var path = subs[sub][0];
        var connection = subs[sub][1];
        var message = subs[sub][2]; 
        if(path[0] === '**' && this.whitelist.indexOf(connection.name)<0){
            this.logger.debug('NOT allowed to subscribe');
        }else{
            this.logger.debug('Allowed to subscribe');
            results.push([path, connection, message]);
        }
    }
    return results
}

exports.AuthPlugin = AuthPlugin;
