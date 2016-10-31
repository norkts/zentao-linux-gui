<?php

include_once '../HttpClient.php';

include_once '../ZenDaoAPI.php';

include_once '../LangUtil.php';


$http = new HttpClient();

$res = $http->post("https://www.baidu.com", "keys=111", array("Content-Type"=>"text/json"));
var_dump($res);
var_dump($http->cookieCongainer);
var_dump($http->cookieCongainer->getCookies("www.baidu.com"));


$zentao = new ZenDaoAPI("http://demo.zentao.net", "demo", "123456");

$res = $zentao->login();

var_dump($res);

var_dump($zentao->http->cookieCongainer);

var_dump(date("Y-m-d"));