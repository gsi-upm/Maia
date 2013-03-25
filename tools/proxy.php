<?php
if (!function_exists('curl_init')){
    die('Sorry cURL is not installed!');
}
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://example.com/hooks");
curl_setopt($ch, CURLOPT_PORT, 1337);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($_POST));
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT,5);~
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_exec($ch);
 ?>
Done!
~
