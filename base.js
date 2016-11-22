var blessed = require("blessed");
var fs = require("fs");

var http = require("http");
var URL = require("url");

var ROW_BACK_COLOR = '#0000FF';
var ROW_HEAD_BACK_COLOR = '#800080';
var FONT_COLOR = '#ffffff';

var ROW_SELECT_BACK_COLOR = '#C0C0C0';

var CHECKED_TEXT = '☑';
var UNCHECKED_TEXT = '☒';

var SELECTED_TEXT = '√';
var UNSELECTED_TEXT = '×';

var ARROW_UP_TEXT = '↑';
var ARROW_DOWN_TEXT = '↓';

/**
 * Table封装
 */
(function(N){
	function ListTable(screen){
		this._screen = screen;
		this._table = blessed.listtable({
			height: screen.height - 10,
			width: "100%",
			keys: true,
			vi: true,
            align: 'left',
			top: 3,
			left: 0,
			style: {
				header: {
					bg: '#fff',
					fg: '#000'
				},
				cell: {
					bg: '#000',
					fg: '#fff',
					selected:{
						bg: ROW_SELECT_BACK_COLOR,
						fg: '#000'
					}
				}	
			}
		});
		
		this._screen.append(this._table);
		this._title = "";
		
		this._titleText = blessed.text({top: 0, left: 2, content: getText(this._title), style:{
			fg: FONT_COLOR
		}});
		
		this._tip = "";
		this._tipText = blessed.text({top: this._screen.height - 2, left: 0, content: getText(this._tip), style:{
			fg: FONT_COLOR
		}});
		
        
        this._data = [];
        this._header = [];
        
		this._screen.append(this._titleText);
		this._screen.append(this._tipText);
	}
	
	ListTable.prototype.render = function(){
		
		
		
		this._titleText.content = getText(this._title);		

		this._tipText.content = getText(this._tip);
		
		this.setTableData(this._data);
		this._screen.render();
	}
    
    ListTable.prototype.selected = function(){
        return this._table.selected - 1;
    }
    
    ListTable.prototype.select = function(index){
        this._table.select(index + 1);
    }
    
    ListTable.prototype.setTableData = function(arr){
        this._data = arr;
        
        var data = [];
		
		var head = [];
		for(var i = 0 ; i < this._headRow.length; i++){
			head.push(getText(this._headRow[i]));
		}
		data.push(head);
        
		for(var i = 0 ; i < this._data.length; i++){
			data.push(this._data[i]);
		}
        
        
        this._table.setData(data);
    }
	
	ListTable.prototype.setData = function(arr){
		this._data = arr;
	}
	
	ListTable.prototype.setHead = function(headRow){
		this._headRow = headRow;
	}
	
	ListTable.prototype.focus = function(){
		this._table.focus();
	}
	ListTable.prototype.setTitle = function(title){
		this._title = title;
	}
	
	ListTable.prototype.setTip = function(tip){
		this._tip = tip;
	}
	
	N.ListTable = ListTable;
})(module.exports);


/**
 * HttpClient封装
 */
(function(N){
    function CookieContainer(){
        this.cookieMap = {};
    }
    
    CookieContainer.prototype.getCookies = function(host){
        
        if(this.cookieMap[host] == null){
            this.cookieMap[host] = {};
        }
        var result =  "";
        
        for(var hostKey in this.cookieMap){
            
            if(host == hostKey || (hostKey[0] == '.' && host.indexOf(hostKey) > -1)){
                for(var name in this.cookieMap[hostKey]){
                    if(result != ""){
                        result += "; ";
                    }
                    
                    result += name + "=" + this.cookieMap[hostKey][name];
                }   
            }
        }

        return result;
    }
    
    
    CookieContainer.prototype.addSetCookie = function(setCookie, host){
        var arr = setCookie.split("; ");
        
        var ckName = "";
        var ckVal = "";
        
        for (var i = 0 ; i < arr.length; i++) {
            var value = arr[i];
            var vals = value.split("=");
            if(vals.length > 1){
                if(vals[0].toLowerCase() == "domain"){
                    host = vals[1];
                }else if("|version|path|domain|expires|max-apge|".indexOf("|" + vals[0].toLowerCase() + "|") == -1){
                    ckName = vals[0];
                    ckVal = vals[1];
                    
                    this.cookieMap[host][ckName] = ckVal;
                }
            }
        }
        
    }
    
    function HttpClient(){
        this.cookieContainer = new CookieContainer();
    }
    
    HttpClient.prototype.get = function(url, headers, callback){
        var self = this;
        
        var location = URL.parse(url);
        
        var options = {};
        options.host = location.host;
        options.port = location.port;
        options.path = location.path;
        options.method = "GET";
        options.headers = headers || {};
        
        options.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36';

        if(options.headers['Cookie'] == undefined && self.cookieContainer.getCookies(options.host) != ""){
            options.headers['Cookie'] = self.cookieContainer.getCookies(options.host);
        }
        
        var body = "";
        var req = http.request(options, function(res){
            
            res.setEncoding('utf8');
            
            res.on('data', function(data){
                body += data;
            });
            
            res.on('end', function(data){
                if(data != null){
                    body += data;    
                }
                
                cookieSetter(res.rawHeaders, self.cookieContainer, options.host);
                
                callback(body, res.statusCode, res.rawHeaders);
            });
        });
        
        req.end();
    }
    
    function cookieSetter(headers, cookieContainer, host){
        var key = "";
        var val = "";
        for(var i = 0; i < headers.length; i++){
            if(i % 2 == 0){
                key = headers[i];
            }else{
                val = headers[i];
                if(key.toLowerCase() == "set-cookie"){
                    cookieContainer.addSetCookie(val, host);
                }
            }
        }
    }
    
    HttpClient.prototype.post = function(url, data, headers, callback){
        var location = URL.parse(url);
        var self = this;

        var options = {};
        options.host = location.host;
        options.port = location.port;
        options.path = location.path;
        options.method = "POST";
        options.headers = headers || {};
        options.headers['Content-Length'] = data.length;
        
        options.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36';
        
        
        if(options.headers['Cookie'] == undefined && self.cookieContainer.getCookies(options.host) != ""){
            options.headers['Cookie'] = self.cookieContainer.getCookies(options.host);
        }
        
        if(options.headers["Content-Type"] == undefined){
            options.headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
        
        var body = "";
        var req = http.request(options, function(res){
            
            res.setEncoding('utf8');
            res.on('data', function(data){
                body += data;
            });
            
            res.on('end', function(data){
                if(data != null){
                    body += data;    
                }
                cookieSetter(res.rawHeaders, self.cookieContainer, options.host);
                
                callback(body, res.statusCode, res.rawHeaders);
            });
        });
        
        req.write(data);
        req.end();
    }
    
    N.HttpClient = HttpClient;
    
})(module.exports);
/**
 * 禅道API封装
 */
(function(N){
    function ZentaoAPI(url, username, password){
        this.http = new N.HttpClient();
        this.url = url;
        this.username = username;
        this.password = password;
        
        this.isLogin = false;
        this.isGetType = null;
    }
    
    ZentaoAPI.prototype.login = function(callback){
        
        
        var data = "account=" + encodeURIComponent(this.username) + "&password=" + encodeURIComponent(this.password) + "&keepLogin%5B%5D=on";
        
        var self = this;
        
        var loginUrl = self.url + (self.isGetType ? "index.php?m=user&f=login&t=json" : "user-login.json");
        
        self.http.post(loginUrl, data, undefined, function(body, status, headers){
            var arr = JSON.parse(body);
            if(arr["status"] == "success"){
                isLogin = true;
                callback(true, getText("LoginSuccess"));
            }else{
                callback(false, getText("LoginSuccess"));
            }
        });  
    }
    
    ZentaoAPI.prototype.isGet = function(){
        var requrl = this.url + "index.php?mode=getconfig";
        var self = this;

        return new Promise(function(resolve, reject){
            if(self.isGetType !== null){
                resolve(self.requestType);
            }else{
                self.http.get(requrl, null, function(body){
                    self.isGetType = JSON.parse(body).requestType == "GET"
                    resolve(self.requestType);
                });  
            }
        });
    }
    
    ZentaoAPI.prototype.updateTask = function(task, callback){
        var taskId = task.id;
        var consumed = task.consumed;
        var left = task.left;

        var operate = "recordEstimate";

        var data = "id%5B1%5D=" + taskId + "&dates%5B1%5D=" + now() + "&consumed%5B1%5D=" + task.currentConsumed
            + "&left%5B1%5D=" + left + "&work%5B1%5D=";

        if (parseInt(left) < 1){
            operate = "finish";
            data = "consumed=" + consumed + "&assignedTo=" + "&finishedDate=" + now()
                + "&comment=";
        }
        
        var self = this;
        var name = "index.php?t=json&m=task&f=" + operate  + "&taskID=" + taskId;
        if (!self.isGetType){
            name = "task-" + operate + "-" + taskId + ".json";
        }
        
        var updateUrl = self.url + name;
        
        self.http.post(updateUrl, data, undefined, callback);
       
    }
    
    ZentaoAPI.prototype.updateBug = function(bugId, callback){
        var data = "resolution=fixed&resolvedBuild=trunk&resolvedDate=" + now()
                + "&assignedTo=" + this.username;
                
        var self = this;
        var name = "index.php?t=json&m=bug&f=resolve&bugID=" + bugId;
        if(!self.isGetType){
            name = "bug-resolve-" + bugId + ".json";
        }
        
        updateUrl = self.url + name;
        
        self.post(updateUrl, data, undefined, callback);
                
    }
    
    ZentaoAPI.prototype.getTaskList = function(callback){
        
        var self = this;
        var name = "index.php?m=my&f=task&t=json&type=assignedTo&orderBy=id_desc&recTotal=0&recPerPage=1000&pageID=1";
    
        if(!self.isGetType){
            name = "my-task-assignedTo-id_desc-0-1000-1.json";
        }
        
        var taskUrl = self.url + name;
        
        self.http.get(taskUrl, undefined, function(body){
            var result = JSON.parse(body);
            if(result.status == "success"){
                var tasks = JSON.parse(result.data).tasks;
                callback(tasks);
            }
        });
    }
    
    ZentaoAPI.prototype.getBugList = function(callback){
        
        var self = this;
        var name = "index.php?m=my&f=bug&t=json&type=assignedTo&orderBy=id_desc&recTotal=0&recPerPage=1000&pageID=1";
    
        if(!self.isGetType){
            name = "my-bug-assignedTo-id_desc-0-1000-1.json";
        }
        
        var bugUrl = self.url + name;
        
        self.http.get(bugUrl, undefined, function(body){
            var result = JSON.parse(body);
            if(result.status == "success"){
                var bugs = JSON.parse(result.data).bugs;
                callback(bugs);
            }
        });
    }
    
    ZentaoAPI.prototype.saveSVNLog = function(log, callback){
        var self = this;
        
        var name = "index.php?m=svn&f=ajaxSaveLog&t=json";
        if (!self.isGetType){
            name = "svn-ajaxSaveLog.json";
        }


        var updateUrl = self.url + name;

        var data = "repoUrl=" + encodeURIComponent(log.repoUrl) + "&repoRoot=" + encodeURIComponent(log.repoRoot)
            + "&message=" + encodeURIComponent(log.message) + "&revision=" + log.revision;

        for (var i = 0; i < log.files.length; i++){
            var path = log.files[i];
            data += "&files[]=" + encodeURIComponent(path);
        }

        self.http.post(updateUrl, data, null, callback);
    }
    
    
    N.ZentaoAPI = ZentaoAPI;
    

    function now(){
        var d = new Date();
        return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
    }
})(module.exports);

/**
 * ini文件解析
 */
(function(N){
    
    function parseIniFile(file){
        var result = {};
        //读取ini文件
        var contents = fs.readFileSync(file, "UTF-8");
        
        var lines = contents.split('\n');
        var group = '';
        for(var i = 0; i < lines.length; i++){
            var line = lines[i].trim();
            
            if(line[0] == '['){
                group = line.substring(1, line.length - 1);
                result[group] = {};
            }else if(line.indexOf('=') > 0 && line[0] != '#' && line[0] != ';' && line[0] != '['){
                var key = line.substring(0, line.indexOf('='));
                var val = line.substring(line.indexOf('=') + 1, line.length);
                
                result[group][key] = val;
            }
        }
        
        return result;
    }
    
    
    N.parseIniFile = parseIniFile;
})(module.exports);

module.exports.getText = getText;

/**
 * 语言处理
 */
function getText(textName){
	return textName;
}