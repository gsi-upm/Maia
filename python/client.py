import websocket
import thread
import time
import json

def on_message(ws, message):
    print '< %s' % json.loads(message)

def on_error(ws, error):
    print error

def on_close(ws):
    print "### closed ###"

def on_open(ws):
    ws.send('{"name":"subscribe","data": "*::de::**"}');
    def run(*args):
#         ws.send('{"name":"subscribe","data":"**"}');
#         ws.send('{"name":"subscribe","data":"**"}');

        for i in range(10):
            ws.send('{ "data": "Hello %d", "name": "prueba::de::concepto"}' % i)
#         time.sleep(1)
#         ws.send('{"name":"a::b::d","data":"nada"}');
#         time.sleep(2)
#         ws.send('{"name":"a::b::c::e","data":"nada"}');
#         ws.send('{"name":"a::b::d::e","data":"nada"}');
#         ws.send('{"name":"a::b::c::d::f::e","data":"nada"}');
#         ws.send('{"name":"a::b::*::d::f::e","data":"nada"}');
#         ws.send('{"name":"message","data":"nada"}');
        ws.send('{ "data": "Hello>", "name": "**::vamos"}')
#         for i in range(3):
        time.sleep(2)
        ws.close()
        print "thread terminating..."
    thread.start_new_thread(run, ())


if __name__ == "__main__":
    websocket.enableTrace(False)
    ws = websocket.WebSocketApp("ws://127.0.0.1:1337/",
                                on_message = on_message,
                                on_error = on_error,
                                on_close = on_close)
    ws.on_open = on_open

    ws.run_forever()


