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
    var subscriptions = [];

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
                connection.username(myName, function(msg){
                    myName = msg.data.name;
                    status.text('Message:');
                    if(subscriptions.length<1){
                        if(myName === 'Torvalds'){
                            subscriptions.push('**');
                        }else{
                            subscriptions.push('message');
                        }
                    }
                 
                }, function(){
                    myName = ""; 
                    connectClient();
                });
            }
        });

        connection.on('message', function(msg){
            console.log('MESSAGE: ', msg)
            addMessage(msg.origin, msg.name, msg.data, new Date());
        });
     
        connection.on('error', function (error) {
            // just in there were some problems with conenction...
            content.html($('<p>', { text: 'Sorry, but there\'s some problem with your '
                                        + 'connection or the server is down.</p>' } ));
        });
     
        connection.on('subscribed', function(msg){
            if(subscriptions.indexOf(msg.data.name)<0){
                subscriptions.push(msg.data.name);
            }
            addMessage('Server', msg.name, 'Subscribed to:'+ msg.data.name, new Date());
        });
        connection.on('unsubscribed', function(msg){
            var ix = subscriptions.indexOf(msg.data.name);
            if(ix>-1){
                subscriptions.splice(ix,1);
            }
            addMessage('Server', msg.name, 'Unsubscribed from:'+ msg.data.name, new Date());
        });
        connection.on('username::accepted', function(msg){
                myName = msg.data.name;
                status.text('Message:');
                if(subscriptions.length<1){
                    if(myName === 'Torvalds'){
                        subscriptions.push('**');
                    }else{
                        subscriptions.push('message');
                    }
                }
                for(var sub in subscriptions){ 
                    connection.subscribe(subscriptions[sub]);
                }
                input.removeAttr('disabled');
                type.removeAttr('disabled');
                addMessage('Server', null, 'connection accepted with username:'+ msg.data.name, new Date());
        });
        connection.on('username::rejected', function(msg){
                input.removeAttr('disabled');
                addMessage('Server', null, 'username not accepted:'+ msg.data.name, new Date());
        });
            // NOTE: if you're not sure about the JSON structure
            // check the server source code above
            //} else { // it's a single message
                //input.removeAttr('disabled');// let the user write another message
                //type.removeAttr('disabled'); // let the user write another message
                //addMessage(json.origin, json.name, json.data,
                           //new Date(json.time));
            //}
        //};
    }

    connectClient(); 
    /**
     * Send mesage when user presses Enter key
     */
    input.keydown(function(e) {
        if (e.keyCode === 13) {
            console.log('Pressed enter');
            var txt = $(this).val();
            try{                
                txt = JSON.parse(txt);
            }catch(ex){
            }
            var eventtype = type.val();
            if(eventtype === undefined || eventtype === ''){
                eventtype = "message";
            }
            console.log('Type: ', eventtype );
            var msg = {name:eventtype, data: txt };
            if (myName == false) {
                msg.name = 'username';
                msg.data = {name: txt};
            }
            // send the message as an ordinary text
            connection.sendRaw(msg);
            console.log('Message sent: '+msg);
            $(this).val('');
            // disable the input field to make the user wait until server
            // sends back response
             //input.attr('disabled', 'disabled');
 
            // we know that the first message sent from a user their name
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


