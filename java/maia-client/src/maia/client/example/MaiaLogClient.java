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

/**
 * <p>Log class that prints all received events of type <tt>message</tt>.
 * 
 * <b>Project:</b> maia-client<br />
 * <b>Package:</b> maia.client<br />
 * <b>Class:</b> MaiaClient.java<br />
 * <br />
 * <i>GSI 2013</i><br />
 *
 * @author Miguel Coronado (miguelcb@gsi.dit.upm.es)
 * @version	Jun 14, 2013
 *
 */
public class MaiaLogClient extends MaiaClientAdapter{

    public MaiaLogClient(URI serverURI) {
        super(serverURI);
    }

    @OnMessage("message")
    public void printMessage(String message){
        System.out.println("Logthis:" + message);
    }

    
    public static void main (String [] args) throws URISyntaxException, InterruptedException {
        
        String uri = "http://localhost:1337";
        if(args.length == 1){
            uri = args[0];
        }
        
        MaiaLogClient mlc = new MaiaLogClient(new URI(uri));
        mlc.connect();
        mlc.waitUntilConnected();
        mlc.subscribe("message");
        
    }
    
}
