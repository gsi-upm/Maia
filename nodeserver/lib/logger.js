var clc = require('cli-color');

var logsactivated = {'all': true};

var logmessage = function(name, colours){
    var c;
    if(typeof colours === 'string'){
        c = clc[colours];
    }else{
        var c = clc;
        for(var colour in colours){
            if(c[colours[colour]]){
                c=c[colours[colour]];
            }
        }
    }
    return function(){
        if(logsactivated[name] || logsactivated['all']){
            var args = Array.prototype.slice.call(arguments);
            args.unshift('['+c(name)+']');
            console.log.apply(this, args);
        }
    }
}

var removeLevel = function(level){
    logsactivated[level] = false;
}

var setLevel = function(level){
    logsactivated[level] = true;
}

module.exports.logger = { setLevel: setLevel,
                        removeLevel: removeLevel,
                        warn: logmessage('WARN','yellow'),
                        info: logmessage('INFO', ['green']),
                        error: logmessage('ERROR', ['red','bgWhite']),
                        debug: logmessage('DEBUG',['bgWhite','blue']),

}
    
