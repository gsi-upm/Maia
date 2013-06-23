![GSI Logo](http://gsi.dit.upm.es/templates/jgsi/images/logo.png)
[Maia Java Client](http://gsi.dit.upm.es) 
==================================

Introduction
---------------------
This application is under heavy development*, so try it and get in contact with us so we can improve it.

This class provides a few functionalities built upon the WebSocket 
protocol implementation to support Maia Pub/Sub Protocol. These features 
are:
 
+ Subscription handling
+ Reconnection handling
+ Message dispatching
+ Standard logging (which is not part of the maia's protocol, but it is 
provided here)

### About the implementation (and callbacks)
 
From the point of view of internal implementation we give here a few 
notes. *WebSocketClient* is an abstract class so the 
attribute it cannot be instantiated when assigning a value to attribute 
named *client*. Instead of creating a 
*named class* that inherits from *WebSocketClient*, we 
create an anonymous class when instantiating the *client* 
attribute. This way, we get the benefit of having access to 
*MaiaClientAdaptator* methods from the overridden methods of 
the *WebSocketClient* with no need of storing a reference to 
the *MaiaClientAdaptator* in the *WebSocketClient* 
class. Particularly,

+ whenever *WebSocketClient#onMessage(String)* is called, it 
calls *onMessage(String)*
+ whenever *WebSocketClient#onClose(int, String, boolean)* is 
called, it calls *onClose(int, String, boolean)*
+ Whenever *WebSocketClient#onError(Exception)* method is called, 
it calls *onError(Exception)*
+ and whenever *WebSocketClient#onOpen(ServerHandshake)* is 
called, it calls *onOpen(ServerHandshake)*.



### Subscription handling

Mainly, the class manages subscriptions for re-connection purposes, 
and it  offers the method *getSubscriptions()* 
that returns the names of the events that the client is currently 
subscribed to.

Subscription and unsubscription messages are sent to the server, but 
the client cannot assure it is correctly (un)subscribed until the 
acknowledge is received. Thus, we handle pending request as well as 
confirmed (un)subscriptions.

This class automatically update the state of the (un)subscription 
as soon as the *subscribe(String)* or *unsubscribe(String)*
methods are executed -the corresponding subscription is marked as pending.
Just after the acknowledge message is received, the class adds the event 
to the subscription list or removes it from the list (depending on the 
nature of the request sent).

Therefore, *#subscribe(String)* or *#unsubscribe(String)*
should not be *overridden*, or at least, is overridden 
implementation should call to the parent implementation that handles 
subscriptions. If the inherited class sends (un)subcriptions messages, it 
will interfere on the *subcription handling* process, hence it will
be corrupted.

As part of the reconnection handling process, when the client 
successfully reconnects to the server, it assumes all subscriptions are 
lost (nothing is already specified in Maia protocol) and resubmits all 
of them, so that the state of the client is the same once the subscription 
process is completed.


### Reconnection handling

*MaiaClientAdaptator* implements reconnection to assure the client will 
remain connected until a *Client-initiated 
closure process* is performed. Current description of *maia protocol* 
states client will remain connected permanently, server will never 
send a disconnect request. Therefore, this class will try to reconnect
whichever the reason of disconnection, but a client initiated closure.

 
### Message dispatching

MaiaClientAdaptator offers a enhanced way to process messages when 
they are received. As explained before, when new messages are received
though the WebSocket connection *onMessage(String)* 
method is executed. 

It performs some internal managements (including subscription 
acknowledge handling), and then dispatches the message to the associated 
*method* (including assertion *acks* messages). 
The selection of the method to execute is done by means of 
*Reflection* and the *maia.client.annotation.OnMessage* 
annotation. We use *OnMessage* annotation to associate a method 
to *reception of messages of a certain type*. Thus, any time a message 
of that is received the associated method will be executed. 

The type of the message if given by the value of the element 
*"name"*. In the example below, <type> is the type of the 
message.

    {"name":"<type>", "time":"1370210358496", "data":{...}}
 
*onMessage(String)* method should not be overridden.
To override it will cause *message dispatching* method to stop working.
 
This process **will only work** with classes that inhere from 
*MaiaClientAdaptator* class.

**To know more about the functionalities providen consult the exhaustive 
javadoc of the classes.**



Installation instructions
------------------------------
There is no installation requirements. All libs are included.

For more information, contact us through: http://gsi.dit.upm.es


Acknowledgement
---------------
Maia is a result of the work for the Web 4.0 project.
