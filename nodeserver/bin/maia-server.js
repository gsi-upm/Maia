// Maia Server Script
//
// @author balkian
// Grupo de Sistemas Inteligentes
// http://gsi.dit.upm.es
// http://github.com/gsi-upm
// 
// Code based on:
// http://martinsikora.com/nodejs-and-websocket-simple-chat-tutorial 
// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";

// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'maia-server';
 
var MaiaServer = require('../lib/maia-server').MaiaServer;
var GithubPlugin = require('../lib/github-plugin').GithubPlugin;
var AuthPlugin = require('../lib/auth-plugin').AuthPlugin;
var SaFPlugin = require('../lib/saf-plugin').SaFPlugin;
// Port where we'll run the websocket server
var port = 1337;
var ghp = new GithubPlugin([]);
var auth = new AuthPlugin([]);
var saf = new SaFPlugin(['all']);
var maiaServer = new MaiaServer(port, true, null, ['all']);
maiaServer.addPlugin(ghp);
maiaServer.addPlugin(auth);
maiaServer.addPlugin(saf);
