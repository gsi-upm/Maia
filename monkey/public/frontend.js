$(function () {
    "use strict";
 
    // for better performance - to avoid searching in DOM
    var content = $('#content');
    var input = $('#input');
    var status = $('#status');
 
    // my color assigned by the server
    var myColor = false;
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
 
    // open connection
    var connection = new WebSocket('ws://127.0.0.1:1337');
 
    connection.onopen = function () {
        // first we want users to enter their names
        input.removeAttr('disabled');
        status.text('Choose name:');
    };
 
    connection.onerror = function (error) {
        // just in there were some problems with conenction...
        content.html($('<p>', { text: 'Sorry, but there\'s some problem with your '
                                    + 'connection or the server is down.</p>' } ));
    };
 
    // most important part - incoming messages
    connection.onmessage = function (message) {
        // try to parse JSON message. Because we know that the server always returns
        // JSON this should work without any problem but we should make sure that
        // the massage is not chunked or otherwise damaged.
        try {
            var json = JSON.parse(message.data);
            console.log('Received message:');
            console.log(json);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.data);
            return;
        }
        if (json.name === 'accepted'){
            myName = json.data;
            connection.send('{"name":"subscribe", "data":"**"}');
            input.removeAttr('disabled');
            addMessage('Server', null, 'connection accepted with username:'+ json.data, new Date());
        // NOTE: if you're not sure about the JSON structure
        // check the server source code above
        } else { // it's a single message
            input.removeAttr('disabled'); // let the user write another message
            addMessage(json.sender, json.name, json.data,
                       new Date(json.time));
        }
    };
 
    /**
     * Send mesage when user presses Enter key
     */
    input.keydown(function(e) {
        if (e.keyCode === 13) {
            console.log('Pressed enter');
            var txt = $(this).val();
            if (!txt) {
                return;
            }
            var msg = {name:'message', data: txt };
            if (myName == false) {
                msg.name = 'username';
                msg.data = txt;
            }
            // send the message as an ordinary text
            connection.send(JSON.stringify(msg));
            console.log('Message sent: '+msg);
            $(this).val('');
            // disable the input field to make the user wait until server
            // sends back response
//             input.attr('disabled', 'disabled');
 
            // we know that the first message sent from a user their name
        }
    });
 
    /**
     * This method is optional. If the server wasn't able to respond to the
     * in 3 seconds then show some error message to notify the user that
     * something is wrong.
     */
    setInterval(function() {
        if (connection.readyState !== 1) {
            status.text('Error');
            input.attr('disabled', 'disabled').val('Unable to communicate '
                                                 + 'with the WebSocket server.');
        }
    }, 3000);
 
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
             + ': ' + message + '</p>');
    }
});


