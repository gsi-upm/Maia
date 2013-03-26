<?php
if (!function_exists('curl_init')){
           die('Sorry cURL is not installed!');
}
if (get_magic_quotes_gpc()) {

    function stripslashes_array(&$arr) {
        foreach ($arr as $k => &$v) {
            $nk = stripslashes($k);
            if ($nk != $k) {
                $arr[$nk] = &$v;
                unset($arr[$k]);
            }
            if (is_array($v)) {
                stripslashes_array($v);
            } else {
                $arr[$nk] = stripslashes($v);
            }
        }
    }

    stripslashes_array($_POST);
}
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://shannon.gsi.dit.upm.es/hook/github");
curl_setopt($ch, CURLOPT_PORT, 1337);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($_POST));
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT,5); 
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_exec($ch);
?>
Done!
