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

import maia.client.MaiaClientAdapter;
import maia.client.annotation.OnMessage;
import maia.utils.JSONUtils;

/**
 * <p>This class is an example of implementation of an echo client.
 * Once registered to events of type message, it will send a copy of 
 * all events received of the same type (but those already sent by it).</p>
 * 
 * <b>Project:</b> maia-client<br />
 * <b>Package:</b> maia.client<br />
 * <b>Class:</b> MaiaEchoClient.java<br />
 * <br />
 * <i>GSI 2013</i><br />
 *
 * @author Miguel Coronado (miguelcb@gsi.dit.upm.es)
 * @version	Jun 12, 2013
 *
 */
public class MaiaEchoClient extends MaiaClientAdapter{

    
    private String username;


    public MaiaEchoClient(URI serverURI) {
        super(serverURI);
    }

    @OnMessage("username::accepted")
    public void getUsername(String message) {
        this.username = JSONUtils.getDataName(message);
        System.out.println("Username give:" + this.username);
    }
    
    @OnMessage("message")
    public void echoThis(String message){
        String content = JSONUtils.getDataName(message);
        String origin = JSONUtils.find(message, "origin");
        if (origin != null && origin.equals(this.username)) {
            return;
        }
        sendMessage(content);
    }

    
    /**
     * 
     * @param args
     * @throws URISyntaxException
     * @throws InterruptedException
     */
    public static void main(String [] args) throws URISyntaxException, InterruptedException {
        
        String uri = "http://localhost:1337";
        if(args.length == 1){
            uri = args[0];
        }
        
        MaiaEchoClient mec = new MaiaEchoClient (new URI(uri));
        mec.connect();
        mec.waitUntilConnected();
        mec.subscribe("message");
    }
    
}
