var GithubPlugin = function(){
}

GithubPlugin.prototype.processOne = function(msg){
    var path = msg.name;
    if(path[0] === 'hook' && path[1] === 'github'){
        var payload = msg.data.body.payload;
        payload = JSON.parse(payload);
        var owner = payload.repository.owner.name;
        var repository = payload.repository.name
        msg.name = ['hook', 'github',owner,repository];
        msg.data.body = payload;
    }
    return msg;
}
GithubPlugin.prototype.process = function(msgs){
    var results = [];
    for(var i in msgs){
        results.push(this.processOne(msgs[i]))
    }
    return results;
}

GithubPlugin.prototype.getSubscriptions = function(){
    return [];
}

exports.GithubPlugin = GithubPlugin;
