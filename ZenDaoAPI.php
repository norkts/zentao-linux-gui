<?php
/**
 * Copy Rights (C) norkts.com 2016
 * 禅道API操作
 * @author norkts<norkts@gmail.com>
 * @version 2016-11-01 12:01:00
 */

//TODO 返回的提示信息国际化
class ZenDaoAPI{
    /**
     * HTTP操作类
     * @var HttpClient
     */
    var $http;
    
    /**
     * 禅道的地址
     * @var string
     */
    var $url;
    
    /**
     * 用户名
     * @var string
     */
    var $username;
    
    /**
     * 密码
     * @var string
     */
    var $password;
    
    /**
     * 禅道的请求方式: GET或PATH_INFO
     * @var string
     */
    var $requestType = 0;
    
    public function __construct($url, $username, $password){
        $this->http = new HttpClient();
        
        $this->url = ($url[strlen($url) - 1] == "/") ? $url : $url . "/";
        $this->username = $username;
        $this->password = $password;
    }
    
    /**
     * 登录禅道
     * @return 成功或失败的消息
     */
    public function login(){
        $data = "account=" . urlencode($this->username) . "&password=" + urlencode($this->password) + "&keepLogin%5B%5D=on";
        $loginUrl = $this->url.($this->isGet() ? "index.php?m=user&f=login&t=json" : "user-login.json");
        
        $res = $this->http->post($loginUrl, $data);
        
        $arr = json_decode($res->body, true);
        
        return $arr["status"] == "success" ? LangUtil::getText("LoginSuccess") : LangUtil::getText("LoginFailed").":".$arr["reason"];
    }
    
    /**
     * SVNLog提交
     * @param SVNLog $log
     */
    public function syncSVNLog($log){
        $logUrl = $this->url . ($this->isGet() ? "index.php?m=svn&f=ajaxSaveLog&t=json" : "svn-ajaxSaveLog.json");
        
        $data = "repoUrl=" . urlencode(log.repoUrl) . "&repoRoot=" . urlencode(log.repoRoot)
                . "&message=" . urlencode(log.message) . "&revision=" . log.revision;
        
        foreach ($path as $log->files)
        {
            $data .= "&files[]=" . urlencode($path);
        }
        
        $res = $this->http->post($logUrl, $data);
        
        return json_decode($res->body, true);
    }
    
    /**
     * 更新BUG信息
     * @param TaskInfo $task
     */
    public function updateTask($task){
        $operate = "recordEstimate";
        
        $data = "id%5B1%5D=" . $task->id . "&dates%5B1%5D=" . date("Y-m-d") . "&consumed%5B1%5D=" . $task->currentConsumed
                . "&left%5B1%5D=" . $task->left . "&work%5B1%5D=";
        
        if(floatval($task->left) < 1){
            $operate = "finish";
            
            $data = "consumed=" . $task->consumed . "&assignedTo=" . "&finishedDate=" . date("Y-m-d")
                    + "&comment=";            
        }
        
        $updateUrl = $this->url;
        if($this->isGet()){
            $updateUrl .= "index.php?t=json&m=task&f=" . operate  . "&taskID=" . $task->id;
        }else{
            $updateUrl .= "task-" . operate . "-" . $task->id . ".json";
        }
        
        $res = $this->http->post($updateUrl, $data);
        
        return json_decode($res->body, true);
    }
    
    /**
     * 解决bug
     * @param int $bugId
     * @param string $comment
     * @return mixed
     */
    public function resolveBug($bugId, $comment = 0){
        $updateUrl  =$this->url;
        if($this->isGet()){
            $updateUrl .= "index.php?t=json&m=bug&f=resolve&bugID=" . $bugId;
        }else{
            $updateUrl .= "bug-resolve-" . $bugId . ".json";
        }
        
        $data = "resolution=fixed&resolvedBuild=trunk&resolvedDate=" . date("Y-m-d H:i:s")
                . "&assignedTo=" . $this->username;
        
        $res = $this->http->post($updateUrl, $data);

        return json_decode($res->body, true);
    }
    
    public function getBugs(){
        $bugUrl = $this->url . ($this->isGet() ? "index.php?m=my&f=bug&t=json&typ"
                . "e=assignedTo&orderBy=id_desc&recTotal=0&recPerPage=1000&pageID=1" 
                : "my-bug-assignedTo-id_desc-0-1000-1.json");
        
        $res = $this->http->get($bugUrl);
        
        return json_decode($res->body, true);
    }
    
    public function getTasks(){
        $taskUrl = $this->url . ($this->isGet() ? "index.php?m=my&f=task&t=json"
                . "&type=assignedTo&orderBy=id_desc&recTotal=0&recPerPage=1000&pageID=1" 
                : "my-task-assignedTo-id_desc-0-1000-1.json");
        
        $res = $this->http->get($taskUrl);
        
        return json_decode($res->body, true);
    }
    
    public function getRequestType(){
        if($this->requestType === 0){
            $res = $this->http->get($this->url . "index.php?mode=getconfig");
            if($res->statusCode == 200){
                $arr = json_decode($res->body, true);
                
                $this->requestType = $arr["requestType"];
            }
        }
        
        return $this->requestType;
    }
    
    /**
     * REQUEST_TYPE是否为GET
     * @return bool
     */
    public function isGet(){
        return $this->getRequestType() == "GET";
    }
}

/**
 * BUG信息
 */
class BugInfo{
    var $id;
    var $title;
    
    /** 
     * 任务是否已解决
     * @var boolean
     */
    var $isDone;
   
    /**
     * 任务状态
     * @var string
     */
    var $status;
}

/**
 * 任务信息
 */
class TaskInfo{
    var $id;
    var $name;
    
    /**
     * 预计消耗时间
     * @var string
     */
    var $estimate;
    
    /**
     * 已消耗时间
     * @var string
     */
    var $consumed;
    
    /**
     * 当前设置的消耗时间
     * @var string
     */
    var $currentConsumed;
    
    /**
     * 还将消耗时间
     * @var string
     */
    var $left;
    
    /**
     * 是否已完成
     * @var bool
     */
    var $isDone;
    
    /**
     * 任务状态
     * @var string
     */
    var $status;
}

/**
 * svn提交记录信息
 */
class SVNLog
{
    /**
     * svn的版本号
     * @var int
     */
    var $revision;
    
    /**
     * 提交的注释信息
     * @var string
     */
    var $message;
    
    /**
     * 代码仓库的根目录
     * @var string
     */
    var $repoRoot;
    
    /**
     * 代码仓库路径
     * @var string 
     */
    var $repoUrl;
    
    /**
     * 改动的文件列表
     * @var array
     */
    var $files;
}