#!/usr/bin/env python
# -*- coding: utf-8 -*- 
'''
Pull changes for a repository upon event
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
import os

def on_message(ws, message):
    print 'Received a commit!!'
    try:
        os.system('git pull origin master')
    except Exception as ex:
        print ex

def on_error(ws, error):
    ws.attempts+=1
    print 'Failed attempts #%s' % ws.attempts
    print error

def on_close(ws):
    print "### closed ###"

def on_open(ws):
    ws.attempts=0
    print 'Open'
    ws.send('{"name":"subscribe","data": "hook::github::%s::%s"}' % (ws.user,ws.repository));
    time.sleep(2)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Test websocket client.')


    parser.add_argument('--user','-u', nargs='?',
            default='gsi-upm', type=str, help='Subscription')
    parser.add_argument('--repository','-r', nargs='?',
            default='Maia', type=str, help='Subscription')
    parser.add_argument('SERVER', nargs='?', metavar='SERVER',
            default='127.0.0.1:1337', type=str, help='Endpoint')
    args = parser.parse_args()
    websocket.enableTrace(False)
    ws = websocket.WebSocketApp("ws://"+args.SERVER,
                                on_message = on_message,
                                on_error = on_error,
                                on_close = on_close)
    ws.repository = args.repository
    ws.user = args.user
    ws.on_open = on_open
    ws.attempts = 0
    while(ws.attempts<5):
        ws.run_forever()
        time.sleep(5)
    print('Giving up :(')



