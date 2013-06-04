// Maia WebSocket Transport Handler 
// This is a very basic implementation. 
//
// @author balkian
// Grupo de Sistemas Inteligentes
// http://gsi.dit.upm.es
// http://github.com/gsi-upm

var MaiaTransport = require('./maia-transport').MaiaTransport;
var xmpp = require('node-xmpp');
var argv = process.argv;

function XMPPTransport(jid, passwd, levels){
    var self = this;
    this.cl = new xmpp.Client({ jid: jid, password: passwd });
    this.cl.name = jid;
    this.name = 'XMPPTransport';
    MaiaTransport.call(this, this.name, levels);
    self.handlers = {
        'online': function() {
            self.logger.info('Bot connected');
            self.cl.send(new xmpp.Element('presence', { }).
                    c('show').t('chat').up().
                    c('status').t('Happily forwarding your messages to Maia!')
                    );
        },
        'stanza': function(stanza) {
            self.logger.debug('New stanza:', stanza);
            var from = stanza.attrs.from;
            if (stanza.is('message') &&
                    // Important: never reply to errors!
                    stanza.attrs.type !== 'error') {
                var body = stanza.getChildren('body')[0];
                if(body){
                    var bodytxt = body.children[0];
                    self.server.emit('message',
                                {name: ['xmpp', 'message'],
                                 data: {from: from,
                                        body: bodytxt,
                                        to: stanza.attrs.to}
                                }, self.cl);
                }
            }else if(stanza.is('presence')){
                var status = stanza.getChild('show');
                if(status){
                    status = status.children[0];
                }else if(stanza.attrs.type){
                    status = stanza.attrs.type;
                }else{
                    status = 'available';
                } 
                self.server.emit('message',
                            {name: ['xmpp', 'presence'],
                             data: {from: from,
                                    "status": status}
                            }, self.cl);
            }
        },
        'error': function(e) {
            self.logger.error(e);
        }
    }
}

XMPPTransport.prototype = Object.create(MaiaTransport.prototype);

XMPPTransport.prototype.send =  function(event){
    this.cl.send(new xmpp.Element('message',{  to: event.data.to,
                                          type: 'chat'}
                    ).c('body').t(event.data.body))
}

XMPPTransport.prototype.setServer = function(server){
    MaiaTransport.prototype.setServer.apply(this, arguments);
    this.logger.info('Setting handlers');
    for(var handler in this.handlers){
        this.cl.on(handler, this.handlers[handler]);
    }
    this.server.subscribe(['xmpp','send'],this);
    
}

function removeServer(server){
    this.server = server;
    for(var handler in this.handlers){
        this.cl.removeListener(handler, this.handlers[handler]);
    }
    this.server.unsubscribeAll(this);
}

exports.XMPPTransport = XMPPTransport;
