#!/usr/bin/env python
# -*- coding: utf-8 -*- 
'''
Simple python websocket client, adapted for Maia
@author balkian (J. Fernando Sánchez)

Grupo de Sistemas Inteligentes (GSI-UPM)
  * http://gsi.dit.upm.es
  * http://github.com/gsi-upm
'''

import websocket
import thread
import time
import json
import argparse

def on_message(ws, message):
    print '< %s' % json.loads(message)

def on_error(ws, error):
    print error

def on_close(ws):
    print "### closed ###"

def on_open(ws):
    ws.send('{"name":"subscribe","data": "%s"}' % ws.subscribe);
    time.sleep(2)
    def run(*args):
        time.sleep(3)
        for i in range(3):
            ws.send('{ "data": "Hello %d", "name": "%s"}' % (i,ws.send_type))
            time.sleep(1)
        time.sleep(2)
        ws.close()
        print "thread terminating..."
    thread.start_new_thread(run, ())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Test websocket client.')

    parser.add_argument('--subscribe','-s', nargs='?',
            default='**', type=str, help='Subscription')
    parser.add_argument('--send_type','-t', nargs='?',
            default='prueba::*::concepto::**::punto', type=str, help='Type of event to send')
    parser.add_argument('SERVER', nargs='?', metavar='SERVER',
            default='127.0.0.1:1337', type=str, help='Endpoint')
    args = parser.parse_args()
    websocket.enableTrace(False)
    ws = websocket.WebSocketApp("ws://"+args.SERVER,
                                on_message = on_message,
                                on_error = on_error,
                                on_close = on_close)
    ws.send_type = args.send_type
    ws.subscribe = args.subscribe
    ws.on_open = on_open

    ws.run_forever()


