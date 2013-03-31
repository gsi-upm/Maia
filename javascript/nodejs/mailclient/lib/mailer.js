// Maia Client that connects to an SMTP server.
//
// @author balkian
// Grupo de Sistemas Inteligentes
// http://gsi.dit.upm.es
// http://github.com/gsi-upm

var Client = require('maia-client').Client,
    util = require('util'),
    mailerModule = require('mailer');

function MailerHook() {
  var self = this;
  var args = Array.prototype.slice.call(arguments);
  Client.apply(self,args);
  var json = require('../config.json');
  for(var i in json){
    self.config[i] = json[i];
  }
  self.subscribe('send::email::**', function(event){
    self.sendEmail(event.data);
  });
};

util.inherits(MailerHook, Client);

MailerHook.prototype.sendEmail = function(options){
  var self = this;
  var settings = self.config['mailer'];
  mailerModule.send({
    ssl: true,
    to: options.to,
    from: options.from,
    host: settings.host,
    authentication: 'login',
    username: settings.username,
    password: settings.password,
    domain: settings.domain,
    subject: options.subject,
    body: options.body
  },
  function(err, result){
    if(err){ 
      self.logger.error('Error:', err, result);
      self.emit('error');
    }
      self.logger.log('Email sent', options);
      self.emit('emailSent');
    
  });
};

exports.MailerHook = MailerHook;
