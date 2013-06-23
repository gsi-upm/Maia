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

import static org.junit.Assert.*;

import org.junit.Test;

/**
 * <b>Project:</b> maia-client<br />
 * <b>Package:</b> maia.utils<br />
 * <b>Class:</b> JSONUtilsTest.java<br />
 * <br />
 * <i>GSI 2013</i><br />
 *
 * @author Miguel Coronado (miguelcb@gsi.dit.upm.es)
 * @version	Jun 5, 2013
 *
 */
public class JSONUtilsTest {

    @Test
    public void testFindSingleLevels() {
        String json= "{\"name\":\"message\", \"data\":\"Hello\"}";
        assertEquals("message", JSONUtils.find(json, "name"));
        assertEquals("Hello", JSONUtils.find(json, "data"));
        
        assertNull(JSONUtils.find(json, "message"));
        assertNull(JSONUtils.find(json, "Hello"));
        assertNull(JSONUtils.find(json, "other"));
    }
    
    @Test
    public void testFindSingleLevelObject() {
        String json = "{\"name\":\"subscribed\",\"data\":{\"name\":\"message\"},\"time\":1370210409334}";
        assertEquals("subscribed", JSONUtils.find(json, "name"));
        assertEquals("{\"name\":\"message\"}", JSONUtils.find(json, "data"));
        assertEquals("1370210409334", JSONUtils.find(json, "time"));
        
        assertNull(JSONUtils.find(json, "message"));
        assertNull(JSONUtils.find(json, "{\"name\":\"message\"}"));
        assertNull(JSONUtils.find(json, "subscribed"));
        assertNull(JSONUtils.find(json, "1370210409334"));
    }
    
    @Test
    public void testFindTwoLevels() {
        String json = "{\"name\":\"subscribed\",\"data\":{\"name\":\"message\"},\"time\":1370210409334}";
        assertEquals("message", JSONUtils.find(json, "data", "name"));
        
        assertNull(JSONUtils.find(json, "data", "message"));
        assertNull(JSONUtils.find(json, "data", "subscribed"));
        assertNull(JSONUtils.find(json, "data", "time"));
    }
    
    

}
