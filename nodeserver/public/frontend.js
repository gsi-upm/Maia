$(function () {
    "use strict";
 
    // for better performance - to avoid searching in DOM
    var content = $('#content');
    var input = $('#input');
    var type = $('#eventtype');
    var status = $('#status');
 
    // my name sent to the server
    var myName = false;
 
    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;
 
    // if browser doesn't support WebSocket, just show some notification and exit
    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Sorry, but your browser doesn\'t '
                                    + 'support WebSockets.'} ));
        input.hide();
        $('span').hide();
        return;
    }
    
    var connection;

    var usernamecb = function(msg){
        console.log('Username accepted!!');
        myName = msg.data.name;
        status.text('Message:');
        if(!connection.subscriptions.length || connection.subscriptions.length<1){
            console.log('Adding subscriptions'); 
            if(myName === 'Torvalds'){
                connection.subscribe('**');
            }else{
                connection.subscribe('message');
            }

        }else{
            console.log('Subscriptions already: ', '['+connection.subscriptions.length+']', connection.subscriptions);
        }
    }
    var usernamefail = function(){
        myName = ""; 
        connectClient();
        input.removeAttr('disabled');
        addMessage('Server', null, 'username not accepted:'+ msg.data.name, new Date());
    }

    function connectClient(){ 
        // open connection
        connection = new MaiaClient('ws://'+location.host);
     
        connection.on('open', function () {
            // first we want users to enter their names
            input.removeAttr('disabled');
            if(!myName || myName === "" || myName == " "){
                console.log('Choose a name');
                status.text('Choose name:');
            }else{
                console.log('You have a name');
                connection.username(myName, usernamecb , usernamefail);
            }
        });

        connection.on('message', function(msg){
            //console.log('MESSAGE: ', msg)
            addMessage(msg.origin, msg.name, msg.data, new Date());
        });
     
        connection.on('error', function (error) {
            // just in there were some problems with conenction...
            content.html($('<p>', { text: 'Sorry, but there\'s some problem with your '
                                        + 'connection or the server is down.</p>' } ));
        });
    }

    connectClient(); 
    /**
     * Send mesage when user presses Enter key
     */
    input.keydown(function(e) {
        if (e.keyCode === 13) {
            //console.log('Pressed enter');
            var txt = $(this).val();
            try{                
                txt = JSON.parse(txt);
            }catch(ex){
            }
            var eventtype = type.val();
            if(eventtype === undefined || eventtype === ''){
                eventtype = "message";
            }
            //console.log('Type: ', eventtype );
            var msg = {name:eventtype, data: txt };
            if (myName == false) {
                msg.name = 'username';
                msg.data = {name: txt};
                connection.username(txt, usernamecb, usernamefail);
            }
            else {
                // send the message as an ordinary text
                connection.sendRaw(msg);
                console.log('Message sent: '+msg);
            }
            $(this).val('');
            input.removeAttr('disabled');
            type.removeAttr('disabled');
        }
    });
 
    /**
     * Add message to the chat window
     */
    function addMessage(author, type,  message, dt) {
        var color = 'red';
        if(type === 'message'){
            color = 'blue';
        }
        content.append('<p><span style="color:' + color + '">'+author+' ['+type+']' + '</span> @ ' +
             + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
             + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
             + ': ' + JSON.stringify(message) + '</p>');
    }
});


