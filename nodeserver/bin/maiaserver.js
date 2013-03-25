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
 
var MaiaServer = require('../lib/maiaserver.js').MaiaServer;
var GithubPlugin = require('../lib/github-plugin.js').GithubPlugin;
// Port where we'll run the websocket server
var port = 1337;
var ghp = new GithubPlugin();
var maiaServer = new MaiaServer(port, true);
maiaServer.addPlugin(ghp);
