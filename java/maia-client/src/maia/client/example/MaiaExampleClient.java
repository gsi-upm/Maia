/*
 * Copyright 2013 miguel Grupo de Sistemas Inteligentes (GSI UPM) 
 *                                         <http://gsi.dit.upm.es>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
package maia.client.example;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Random;

import maia.client.MaiaClientAdapter;
import maia.client.annotation.OnMessage;

/**
 * <b>Project:</b> maia-client<br />
 * <b>Package:</b> maia.client<br />
 * <b>Class:</b> MaiaClient.java<br />
 * <br />
 * <i>GSI 2013</i><br />
 *
 * @author Miguel Coronado (miguelcb@gsi.dit.upm.es)
 * @version	Jun 3, 2013
 *
 */
public class MaiaExampleClient extends MaiaClientAdapter {

    /**
     * @param serverURI
     * @throws URISyntaxException 
     */
    public MaiaExampleClient(String serverURI) throws URISyntaxException {
        super(new URI(serverURI));
    }

    @OnMessage("subscribed")
    public void onSubscribe(String message) {
        System.out.println("\nSubscribed >> " + message + "\n");
    }
    
    @OnMessage("message")
    public void message(String message) {
        System.out.println("\nReceived >> " + message + "\n");
    }
    
    public static void main (String[] args) throws URISyntaxException, InterruptedException {

        String uri = "http://localhost:1337";
        if (args.length == 1){
            uri = args[0];
        }
        MaiaExampleClient client = new MaiaExampleClient (uri);
        client.connect();
        client.waitUntilConnected();
        client.subscribe("message");
      
        Random r = new Random();
        
        while(true) {
            Thread.sleep(3000 + r.nextInt(2000));
            client.send("message", null);
        }        
        
    }
    
}
