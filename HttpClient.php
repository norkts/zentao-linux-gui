<?php
/**
 * Copy Rights (C) norkts.com 2016
 * HTTP操作封装
 * @author norkts<norkts@gmail.com>
 * @version 2016-11-01 12:01:00
 */
class HttpClient {
    /**
     *
     * @var CookieContainer
     */
    var $cookieCongainer;
    
    public function __construct(){
        $this->cookieCongainer = new CookieContainer();
    }
    
    /**
     * 发送HTTP POST请求
     * @param string $url
     * @param array $header
     * @return HttpResponse
     */
    public function get($url, $header = array(), $followRedirect = false){
        
        $headerArr = array();
        
        foreach ($header as $key=>$val){
            array_push($headerArr, $key.": ".$val);
        }
        
        $opts = array('http' =>
            array(
                'method'  => 'GET',
                'header'  => implode("\r\n", $headerArr),
                'follow_location'=>$followRedirect                
            )
        );
        
        $context = stream_context_create($opts);
        $result = file_get_contents($url, false, $context);
        $responseInfo = $http_response_header;
        
        $response = new HttpResponse();
        $response->body = $result;
        $response->statusLine = $responseInfo[0];
        $response->headers = array();
        $response->statusCode = intval(explode(" ", $response->statusLine)[1]);
        
        $host = parse_url($url, PHP_URL_HOST);
        $this->parseHeader($host, array_slice($responseInfo, 1), $response);
        
        return $response;
    }
    
    /**
     * 发送HTTP POST请求
     * @param String $url
     * @param String $data
     * @param Array $header
     * @return HttpResponse
     */
    public function post($url, $data, $header = array(), $followRedirect = 0){
                
        $headerArr = array();
        if(!isset($header["Content-Type"])){
            $header["Content-Type"] = "application/x-www-form-urlencoded";
        }

        foreach ($header as $key=>$val){
            array_push($headerArr, $key.": ".$val);
        }
        
        $opts = array('http' =>
            array(
                'method'  => 'POST',
                'header'  => implode("\r\n", $headerArr),
                'content' => $data,
                'follow_location'=>$followRedirect
            )
        );
        $context = stream_context_create($opts);
        $result = file_get_contents($url, false, $context);
        
        $responseInfo = $http_response_header;
        
        $response = new HttpResponse();
        $response->body = $result;
        $response->statusLine = $responseInfo[0];
        $response->headers = array();
        $response->statusCode = intval(explode(" ", $response->statusLine)[1]);
        
        $host = parse_url($url, PHP_URL_HOST);
        $this->parseHeader($host, array_slice($responseInfo, 1), $response);
        
        return $response;
    }
    
    /**
     * 
     * @param string $host
     * @param array $headers
     * @param HttpResponse $res
     */
    private function parseHeader($host, $headers, &$res){
        foreach ($headers as $value) {
            $headName = substr($value, 0, strpos($value, ": "));
            $headVal = substr($value, strpos($value, ": ") + 2);
            
            if(strtolower($headName) == "set-cookie"){
                if(!isset($res->headers[$headName])){
                    $res->headers[$headName] = array();
                }
                array_push($res->headers["Set-Cookie"], $headVal);
                
                $this->cookieCongainer->addSetCookie($headVal, $host);
            }else {
                $res->headers[$headName] = $headVal;
            }
        }
    }
}

/**
 * Copy Rights (C) norkts.com 2016
 * HTTP响应返回
 * @author norkts<norkts@gmail.com>
 * @version 2016-11-01 12:01:00
 */
class HttpResponse{
    /**
     *
     * @var int
     */
    var $statusCode;
    
    /**
     *
     * @var string
     */
    var $statusLine;
    
    /**
     *
     * @var array
     */
    var $headers = array();
    
    /**
     *
     * @var string
     */
    var $body;
    
    /**
     * 返回HTTP请求响应码
     * @return int
     */
    public function getStatusCode(){
        return $this->statusCode;
    }
    
    /**
     * 返回HTTP请求状态描述
     * @return string
     */
    public function getStatusLine(){
        return $this->statusLine;
    }
    
    /**
     * 
     * @return Array
     */
    public function getHeaders(){
        return $this->headers;
    }
    
    /**
     * 
     * @return string
     */
    public function getBody(){
        return $this->body;
    } 
}

/**
 * Copy Rights (C) norkts.com 2016
 * Cookie管理
 * @author norkts<norkts@gmail.com>
 * @version 2016-11-01 12:01:00
 */
class CookieContainer{
    var $cookieMap = array();
    
    public function addSetCookie($setCookieStr, $host = 0){
        $arr = explode("; ", $setCookieStr);
        
        $ckName = "";
        $ckVal = "";
        
        foreach ($arr as $value) {
            $vals = explode("=", $value);
            if(count($vals) > 1){
                if(strtolower($vals[0]) == "domain"){
                    $host = $vals[1];
                }else if(strtolower($vals[0] != "path") && strtolower($vals[0] != "expire")){
                    $ckName = $vals[0];
                    $ckVal = $vals[1];
                }
            }
        }
        
        if(!isset($this->cookieMap[$host])){
            $this->cookieMap[$host] = array();
        }
        
        $this->cookieMap[$host][$ckName] = $ckVal;
    }
    
    public function addCoookies($cookieStr, $host){
        $arr = explode("; ", $cookieStr);
        if(!isset($this->cookieMap[$host])){
            $this->cookieMap[$host] = array();
        }
        
        foreach ($arr as $key => $value) {
            $vals = explode("=", $value);
            
            $this->cookieMap[$host][$vals[0]] = $vals[1];
        }
        
    }
    
    public function getCookies($host){
        if(!isset($this->cookieMap[$host])){
            $this->cookieMap[$host] = array();
        }
        
        $ckArr = array();
        
        foreach($this->cookieMap as $key=>$map){
            if((strstr($host, $key) == 0 && $host[0] == ".") || $host == $key){
                foreach ($this->cookieMap[$key] as $key2 => $val2) {
                    array_push($ckArr, $key2."=".$val2);
                }
            }
        }
        
        return implode("; ", $ckArr);
    }
}