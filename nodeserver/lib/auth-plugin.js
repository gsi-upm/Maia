var MaiaPlugin = require('./maia-plugin').MaiaPlugin;

var AuthPlugin = function(){
    var mainArguments = Array.prototype.slice.call(arguments);
    [].unshift.call(arguments,'AuthPlugin');
    MaiaPlugin.apply(this,arguments);
    this.taken = [];
    this.whitelist = ['Torvalds'];
    this.on('close', function(connection){
        var i = this.taken.indexOf(connection.name);
        if(i>=0){
            this.logger.debug('User disconnected!');
            this.taken.splice(i,1);
        }
    });
}

AuthPlugin.prototype = Object.create(MaiaPlugin.prototype);

AuthPlugin.prototype.processOne = function(msg, connection){
    var path = msg.name;
    if(path[0] === 'username'){
        this.logger.debug('Processing '+path[0]+' ->' + typeof path[0]);
        var name = msg.data;
        if(this.taken.indexOf(name)<0){
            connection.name = name;
            this.taken.push(name);
            this.logger.debug('Accepted: ' + name);
            this.server._send({name:"accepted",data:connection.name}, connection)
        }else{
            this.logger.debug('Already taken: ' + name);
            this.server._send({name:"rejected",data: name} , connection)
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
        results.push(this.processOne(msgs[i], conn))
    }
    return results;
}

AuthPlugin.prototype.subscribe = function(subs){
    var results = [];
    for(sub in subs){
        path = subs[sub][0];
        connection = subs[sub][1];
        if(path[0] === '**' && this.whitelist.indexOf(connection.name)<0){
            this.logger.debug('NOT allowed to subscribe');
        }else{
            this.logger.debug('Allowed to subscribe');
            results.push([path,connection]);
        }
    }
    return results
}

exports.AuthPlugin = AuthPlugin;
