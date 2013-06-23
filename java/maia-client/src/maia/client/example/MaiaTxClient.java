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

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.URISyntaxException;

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
public class MaiaTxClient extends MaiaClientAdapter {

    /**
     * @param serverURI
     * @throws URISyntaxException 
     */
    public MaiaTxClient(String serverURI) throws URISyntaxException {
        super(new URI(serverURI));
    }

    @OnMessage("message")
    public void message(String message) {
        System.out.println("\nReceived >> " + message + "\n");
    }
    
    public static void main (String[] args) throws URISyntaxException, InterruptedException, IOException {
        
        String uri = "http://localhost:1337";
        if(args.length == 1){
            uri = args[0];
        }
        
        MaiaTxClient client = new MaiaTxClient (uri);
        client.connect();
        client.waitUntilConnected();        
        client.subscribe("message");

        while(true){
            BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
            client.sendMessage(br.readLine());
        }
        
    }
    
}
