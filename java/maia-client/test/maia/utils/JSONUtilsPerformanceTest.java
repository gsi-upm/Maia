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
package maia.utils;

import java.io.ObjectInputStream.GetField;
import java.util.Random;

/**
 * <b>Project:</b> maia-client<br />
 * <b>Package:</b> maia.utils<br />
 * <b>Class:</b> JSONUtilsPerformanceTest.java<br />
 * <br />
 * <i>GSI 2013</i><br />
 *
 * @author Miguel Coronado (miguelcb@gsi.dit.upm.es)
 * @version	Jun 5, 2013
 *
 */
public class JSONUtilsPerformanceTest {

    private int rand; 
    private String json = "{\"name\":\"subscribed%s\",\"data\":{\"name\":\"message%s\"},\"time\":1370210409334}";
    
    private JSONUtilsPerformanceTest() {
        rand = new Random().nextInt();
    }
    
    private String nextJson() {
        rand++;
        return json.replaceAll("%d", Integer.toString(rand));
    }
    
    public static void main(String[] args) {
        
        {JSONUtilsPerformanceTest test = new JSONUtilsPerformanceTest();
        long start = System.currentTimeMillis();
        for (int i = 0; i < 10000; i++){            
            JSONUtils.find(test.nextJson(), "data", "name");            
        }
        long end = System.currentTimeMillis();
        
        System.out.println("Test with find lasted: " + (end-start));}
        
        {JSONUtilsPerformanceTest test = new JSONUtilsPerformanceTest();
        long start = System.currentTimeMillis();
        for (int i = 0; i < 10000; i++){            
            JSONUtils.sfind(test.nextJson(), "data", "name");            
        }
        long end = System.currentTimeMillis();
        
        System.out.println("Test with sfind lasted: " + (end-start));}
        
    }
    
}
