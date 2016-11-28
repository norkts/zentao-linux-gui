/**
 * zentao-linux-tui
 * 禅道svn或git字符界面操作处理程序
 * @author norkts<norkts@gmail.com>
 * @version 1.0 2016-11-23 21:41:00
 */

var base = require('./base');
var blessed = require("blessed");
var fs = require("fs");
var os = require("os");
var child = require('child_process');


var ListTable = base.ListTable;
var executor = base.executor;
var GBK2UTF8 = base.GBK2UTF8;
var Lang = base.Lang;
var getText = function(text){
	return Lang.getText(text);
}

var globalIniPath = '~/.zentao/.zentao'; //配置文件地址
var workConfigPath = '~/.zentao/.zentao.work';
var zentaoConfig = '~/.zentao/conf/conf.ini';

var zentaosh = '~/.zentao/.zentao.sh';
var commitFile = '~/.zentao/tmp/.zentao.commit';//TODO 多用户处理


var currentPath = process.cwd();

process.stdin.resume();

if (os.type() == 'Windows_NT') {
	globalIniPath = '.zentao';
    workConfigPath = '.zentao.work';
    zentaoConfig = 'conf.ini';
    
    commitFile = '.zentao.commit';
    zentaosh = '.zentao.sh';
}else{
    globalIniPath = process.env.HOME + "/.zentao/conf/.zentao";
    workConfigPath = process.env.HOME + '/.zentao/conf/.zentao.work';
    zentaoConfig = process.env.HOME + '/.zentao/conf/conf.ini';
    
    zentaosh = process.env.HOME + '/.zentao/bin/.zentao.sh';
    commitFile = process.env.HOME + '/.zentao/tmp/.zentao.commit';
}

var logger = base.logger;

var now = base.now;

//读取配置文件
var websiteMap = undefined;

var siteTable = undefined;
var bugTable = undefined;
var zentaoAPI = undefined;
var screen = undefined;

var workconfig = undefined;

process.on('uncaughtException', function (error) {
	logger(error.name  + ":" + error.message + "\r\n" + error.stack);
    console.error(error.stack);
});
var zentaoIni = {};
/**
 * 主流程函数
 */
(function(){
    
    //读取语言信息
    zentaoIni =  base.parseIniFile(zentaoConfig);
    if(getZentaoIni('lang') == undefined){
        var langs = Lang.getLangs();
        
        for(var i = 0; i < langs.length; i++){
            process.stdout.write(i+ ': ' + langs[i] + "\r\n");
        }
        
        
        var langIndex = 0;
        
        do{
            process.stdout.write(getText('Please Select Your Language: '));
            langIndex = stdinRead();
        }while(typeof langs[parseInt(langIndex)] != "string");
        
        Lang.chooseLang(langs[parseInt(langIndex)]);
        
        saveZentaoIni('lang', Lang.langName);
    }else{
		Lang.chooseLang(getZentaoIni('lang'));
	}
    
    if(isFileEmpty(globalIniPath)){
        logger("start install zentao");
        //无配置文件或安装模式
        install();
    }
    websiteMap = base.parseIniFile(globalIniPath);
        
    if(isFileEmpty(workConfigPath)){
        //绑定目录-站点-repository
        bindWorkRepository();
    }else{
        view();
    }


})();

function saveZentaoIni(key, val){
    if(!zentaoIni){
        zentaoIni = {};
    }

    if(zentaoIni['zentao'] == undefined){
        zentaoIni['zentao'] = {};
    }
    
    zentaoIni["zentao"][key] = val;
    
    base.saveIniFile(zentaoConfig, zentaoIni);
}

function getZentaoIni(key){    
    if(!zentaoIni){
        zentaoIni = {};
    }

    if(zentaoIni['zentao'] == undefined){
        zentaoIni['zentao'] = {};
    }
    
    return zentaoIni['zentao'][key];
}

function isFileEmpty(file){
    if(!fs.existsSync(file)){
        return true;
    }
    
    var state = fs.statSync(file);
    
    if(state.isDirectory()){
        return true;
    }
    
    if(state.size == 0){
        return true;
    }

    return false;
}

/**
 * 安装程序
 */
function install(){
    
    if(os.type().toLowerCase() != 'linux'){
        process.stdout.write(getText('UnsuportedOS') + '\r\n');
        return;
    }
    
    process.stdout.write(getText('StartInstallZentao') + '\r\n');
    
    var contents = fs.readFileSync(process.env.HOME + '/.bashrc', 'utf8');
    
    process.stdout.write(getText('IsAddWebsite') + ": ");
    var chunk = stdinRead();
    websiteMap = {};

    var urlRegexp = /^https?:\/\/(.*)\/.*$/;
    if(chunk == 'y'){
        while(true){
            process.stdout.write(getText("EnterWebsiteName") + ": ");
            var websiteName = stdinRead();
            
            var url = "";
            do{
				process.stdout.write(getText('EnterWebsiteURI') + ": ");
                url = stdinRead();
            }while(!urlRegexp.test(url))
            
            process.stdout.write(getText("EnterUserName") + ": ");
            var account = stdinRead();
            
            
            process.stdout.write(getText("EnterPassword") + ": ");
            var password = stdinRead();
            
            websiteMap[websiteName] = {url : url, account: account, password: password};
            
            process.stdout.write(getText('IsContinueAddWebsite') + ": ");
            chunk = stdinRead();
            if(chunk == 'n'){
                base.saveIniFile(globalIniPath, websiteMap);
                break;
            }
        }
    }
}

/**
 * 显示图形界面
 */
function view(){
    
    
    var workconfig = base.parseIniFile(workConfigPath);
    if(workconfig[currentPath] == undefined 
        || workconfig[currentPath].name == undefined 
        || websiteMap[workconfig[currentPath].name] == undefined){
            
        bindWorkRepository();
    }else{
        if(isFileEmpty(commitFile)){
            //无参数，则显示TUI
            
            initTUI();
            initZentaoTui(workconfig[currentPath]);
        }else{
            postCommit(commitFile);
        }            
    }
}

/**
 * 绑定站点和仓库
 */
function bindWorkRepository(){                                                                                                          
    process.stdin.resume();
    
    logger("bindWorkRepository start");

    var selectedWebsiteName = undefined;
    
    executor(function(resolve){
        initTUI();
        initSiteTable(function(website, websiteName){
            resolve(websiteName);
        });
    }).then(function(websiteName){
            logger("bindWorkRepository site selected, siteName: " + websiteName);
            destroyTUI();
            
            selectedWebsiteName = websiteName;
            var website = websiteMap[websiteName];
            return executor(function(resolve){
                    initZentaoAPI(website, function(isSucess, msg){
                        if(isSucess){
                            resolve();
                        }else{
                            logger("登录禅道站点失败: " + zentaoAPI.url + ", 错误信息:" + msg);
                        }
                    });            
            });
    }).then(function(){
            zentaoAPI.getRepos(function(repos){
    
                logger("bindWorkRepository getRepos res:" + JSON.stringify(repos));

                for(var i = 0; i < repos.length; i++){
                    process.stdout.write(i + " : " + repos[i] + "\r\n");
                }
                
                process.stdout.write(getText("EnterRepository") + "(0-" + (repos.length - 1) + "):");
                
                var chunk = stdinRead();
                logger(chunk);
                var num = parseInt(chunk);
                
                saveWorkConfig(selectedWebsiteName, repos[num]);
                
                view();
                

            });   
    })
}

/**
 * 读取终端输入
 */
function stdinRead(){
    process.stdin.resume();
    
    var fd = process.stdin.fd;
    if(os.type() == 'Linux'){
        fd = fs.openSync('/dev/stdin', 'rs');
    }
        
    var buf = new Buffer(1000);
    buf.fill(0);
    var size = fs.readSync(fd, buf, 0, 1000);
    
    buf = buf.slice(0, size);

    if(os.type() == 'Linux'){
        return buf.toString().trim();
    }else{
        return GBK2UTF8(buf).trim();
    }
}

/**
 * 保存匹配的站点信息
 */
function saveWorkConfig(websiteName, repository){
    
    logger("saveWorkConfig select website:" + websiteName + ", repository:" + repository);
    
    var website = websiteMap[websiteName];
    var configArr = [];
    configArr.push('[' + currentPath + ']');
    configArr.push('repository=' + repository);
    configArr.push('name=' + websiteName);
    configArr.push('url=' + website.url);
    configArr.push('account=' + website.account);
    configArr.push('password=' + website.password);
    
    fs.writeFileSync(workConfigPath, configArr.join('\r\n'));
}

/**
 * 提交消息之后
 */
function postCommit(commitFile){
    logger("--开始提交commit信息到禅道--");
    
    var workconfig = base.parseIniFile(workConfigPath);
    initZentaoAPI(workconfig[currentPath], function(isSuccess, msg){
        logger("--接口登录成功:result=" + isSuccess + ", msg=" + msg);
        
        var contents = fs.readFileSync(commitFile, 'UTF-8');
        
        var taskRegAll = /(Finish\s+)?[Tt]ask#(\d+).*?,\s*[Cc]ost:(\d+)\s*left:(\d+)/g;
        var taskReg = /(Finish\s+)?[Tt]ask#(\d+).*?,\s*[Cc]ost:(\d+)\s*left:(\d+)/;
        var bugRegAll = /(Fix\s+)?[Bb]ug#(\d+)/g;
        var bugReg = /(Fix\s+)?[Bb]ug#(\d+)/;
        
        var matches = contents.match(taskRegAll);

        var taskTotal = 0;
        if(matches != undefined){
            for(var i = 0; i < matches.length; i++){
                var match = matches[i].match(taskReg);
                var task = {id: match[2], consumed: match[3], left: match[4]};
                taskTotal++;
                
                logger("--开始更新task#"+ task.id + ", 任务数=" + taskTotal);
                
                zentaoAPI.updateTask(task, function(body, status){
                    taskTotal--;
                    logger("--task#"+ task.id + "更新成功: status=" + status);
                    checkFinished(taskTotal);
                });
            }
        }
        
        matches = contents.match(bugRegAll);
        if(matches != undefined){
            for(var i = 0; i < matches.length; i++){
                var match = matches[i].match(bugReg);
                var bugId = match[2];
                taskTotal++;
                
                logger("--开始更新bug#"+ bugId + ", 任务数=" + taskTotal);
                zentaoAPI.updateBug(bugId, function(body, status){
                    logger("--bug#"+ bugId + "更新成功,status=" + status);
                    taskTotal--;
                    checkFinished(taskTotal);
                });
            }
        }
        
        checkFinished(taskTotal);
    });
    
    //TODO reversion信息，commitMessage信息，repo信息处理
    
    function checkFinished(total){
        logger("--正在执行的任务数:"+ total + "--");
        if(total < 1){
            logger("--提交commit信息到禅道完成--");
            
            fs.unlinkSync(commitFile);
            process.exit(0);
        }
    }
}

/**
 * 初始化字符界面
 */
function initTUI(){
    base.logToConsole = false;
    screen = blessed.screen({
        debug : true,
        fullUnicode : true
    });

    /**
     * 退出操作快捷键
     */
    screen.key('C-q', function () {
        destroyTUI();
        process.exit(0);
    });
}


function destroyTUI(){
    screen.destroy();
    base.logToConsole = false;
}
/**
 * 初始化站点列表
 */
function initSiteTable(onRowSelect) {

    siteTable = new ListTable(screen)
    siteTable.setTitle(getText('SiteTitle'));

    //FIXME 当按上下箭头时此处显示异常
    siteTable.setTip(getText('siteTableTip'));

    siteTable.setHead([getText('SiteName'), getText('SiteUrl'), getText('UserName'), getText('Password')]);

    var websites = [];
    for (var name in websiteMap) {
        websites.push([name, websiteMap[name].url, websiteMap[name].account, '******']);
    }
    
    siteTable.setData(websites);

    siteTable.render();
    siteTable.focus();

    screen.render();
    
    var msg = blessed.message({
            parent : screen,
            border : 'line',
            height : 'shrink',
            width : 'half',
            top : 'center',
            left : 'center',
            label : ' {blue-fg}Message{/blue-fg} ',
            tags : true,
            keys : true,
            hidden : true,
            vi : true
        });



    siteTable._table.on("select", function (arg) {
        var selectedIndex = siteTable.selected();
        
        var row = siteTable._data[selectedIndex];
        
        siteTable._table.hide();
        var website = websiteMap[row[0]];
        
        logger("website.select: " + JSON.stringify(website) + "," + row[0]);
        
        if(onRowSelect instanceof Function){
            onRowSelect(website, row[0]);
        }else{
            initZentaoTui(website, row[0]);            
        }
    });
}

/**
 * 初始化禅道操作信息
 */
function initZentaoTui(website){
    
    logger("initZentaoTui-start:" + JSON.stringify(website));
    initZentaoAPI(website, function (isSucess, message) {
        logger("initZentaoTui-login-done: status= " + isSucess + ",msg" + message);
        if (isSucess) {
            bugTable = initBugTable();
        } else {
            msg.display(getText('LoginFailed') + ":" + message, 3000, function(){
                destroyTUI();
            });
        }
        
    });
}

/**
 * 初始化并登录禅道
 */
function initZentaoAPI(website, callback){
    zentaoAPI = new base.ZentaoAPI(website.url, website.account, website.password);
    
    zentaoAPI.isGet().then(function(requestType){
            logger("initZentaoAPI requestType res, requestType:" + requestType);
            zentaoAPI.login(function (isSucess, msg) {
                logger("initZentaoAPI login res, isSucess:" + isSucess + ", msg:" + msg);
                callback(isSucess, msg);
        });
    });
}

/**
 * 初始化bug列表
 */
function initBugTable() {
	
	var selectedIndex = 0;
	var tabBugSelected = true;
    
	var bugTH = [getText('Select'), getText('BugID'), getText('BugTitle'), getText('BugResolved')];
    var taskTH = [getText('Select'), getText('TaskID'), getText('TaskName'), getText('ConsumedTime'), getText('RemainTime'), getText('TaskFinished')];
    
	bugTable = new ListTable(screen);
	bugTable.setTitle(getText('BugTableTitle'));
	
	bugTable.setTip(getText('BugTableTip'));
	
	bugTable.setHead(bugTH);
	
	var bugButton = blessed.text({
			content : getText(getText('BugTab')),
			top : 1,
			left : 2,
			width : 4,
			aligin : 'center',
			style : {
				fg : '#008000',
				bg : '#C0C0C0'
			}
		});
	
	var renwuButton = blessed.text({
			content : getText(getText('TaskTab')),
			top : 1,
			left : 8,
			width : 4,
			aligin : 'center',
			style : {
				fg : '#fff'
			}
		});
	screen.append(bugButton);
	screen.append(renwuButton);
	
	screen.key("S-s", function () {
		tabBugSelected = !tabBugSelected;
		
		if (tabBugSelected) {
			//BUG列表
			bugButton.style.bg = '#C0C0C0';
			bugButton.style.fg = '#008000';
			
			renwuButton.style.bg = '#000';
			renwuButton.style.fg = '#fff';
			
			bugTable.setHead(bugTH);
			
			zentaoAPI.getBugList(function (bugs) {
				var rows = [];
				for (var i = 0; i < bugs.length; i++) {
					rows.push(['☒', bugs[i].id, bugs[i].title, '']);
				}
				
				bugTable.setData(rows);
				
				bugTable.focus();
				bugTable.render();
				
			});
		} else {
			//任务列表
			
			renwuButton.style.bg = '#C0C0C0';
			renwuButton.style.fg = '#008000';
			
			bugButton.style.bg = '#000';
			bugButton.style.fg = '#fff';
			
			bugTable.setHead(taskTH);
			
			zentaoAPI.getTaskList(function (tasks) {
				var rows = [];
				for (var i = 0; i < tasks.length; i++) {
					rows.push(['☒', tasks[i].id, tasks[i].name, tasks[i].estimate, tasks[i].consumed, '']);
				}
				
				bugTable.setData(rows);
				bugTable.focus();
				bugTable.render();
			});
		}
	});
	
	var okBtn = blessed.button({
			content : getText('OK'),
			top : screen.height - 3,
			left : 4,
			width : 4,
			height : 1,
			aligin : 'center',
			style : {
				fg : '#fff',
				bg : '#00f',
				focus : {
					fg : '#00f',
					bg : '#fff'
				}
			}
		});
	
	var cancleBtn = blessed.button({
			content : getText('Cancel'),
			top : screen.height - 3,
			left : 10,
			width : 8,
			height : 1,
			aligin : 'center',
			style : {
				fg : '#fff',
				bg : '#00f',
				focus : {
					fg : '#00f',
					bg : '#fff'
				}
			}
		});
	
	screen.append(okBtn);
	screen.append(cancleBtn);
	
	screen.key(['space', '0'], function (ev) {
		if (ev == undefined) {
			return true;
		}
		
		selectedIndex = bugTable.selected();
		var isSelected = bugTable._data[selectedIndex][0] == '☑';
		if (ev == ' ') {
			
			bugTable._data[selectedIndex][0] = isSelected ? '☒' : '☑';
			
			//任务操作
			if (!tabBugSelected && !isSelected) {
				workTimeDialog(selectedIndex);
			}
			
			bugTable.setTableData(bugTable._data);
		}
		
		//只有选中任务时才触发
		if (ev == '0') {
			
			if (!tabBugSelected) {
				//任务已完成
				workTimeDialog(selectedIndex, true);
			} else {
				//BUG已解决
				var rowData = bugTable._data[selectedIndex];
				rowData[rowData.length - 1] = rowData[rowData.length - 1] == '√' ? ' ' : '√';
				bugTable._data[selectedIndex] = rowData;
				bugTable.setTableData(bugTable._data);
			}
			
		}
		
		bugTable.select(selectedIndex);
		screen.render();
	});
	
	var tabIndexItem = [bugTable._table, okBtn, cancleBtn];
	var tabIndex = 0;
	screen.on('keypress', function (ch, key) {
		if (key.name == 'tab') {
			tabIndex++;
			if (tabIndex > tabIndexItem.length - 1) {
				tabIndex = 0;
			}
			
			tabIndexItem[tabIndex].focus();
		}
		
		screen.render();
	});
	
	okBtn.on('press', function () {
		var arr = getSelected(bugTable);
		generateMessage(arr, tabBugSelected ? "bug" : "task");
		screen.destroy();
	});
	
	cancleBtn.on('press', function () {
		screen.destroy();
	});
	
	screen.render();
	
	zentaoAPI.getBugList(function (bugs) {
		var rows = [];
		for (var i = 0; i < bugs.length; i++) {
			rows.push(['☒', bugs[i].id, bugs[i].title, '']);
		}
		bugTable.setData(rows);
		bugTable.render();
		bugTable.focus();
		
	});
	
	return bugTable;
}

function getSelected(bugTable) {
	var data = bugTable._data;
	var resArr = [];
	for (var i = 0; i < data.length; i++) {
		if (data[i][0] == '☑') {
			resArr.push(data[i]);
		}
	}
	
	return resArr;
}

/**
 * 生成提交日志文件
 */
function generateMessage(arr, type) {
	var msg = [];
	
	for (var i = 0; i < arr.length; i++) {
		var str = "";
		if (type == 'bug') {
			if (arr[i][arr[i].length - 1] == '√') {
				str = "Fix ";
			}
			
			str += type + "#" + arr[i][1] + " " + arr[i][2];
		} else if (type == 'task') {
			if (arr[i][arr[i].length - 1] == '√') {
				str = "Finish ";
			}
			
			str += type + "#" + arr[i][1] + " " + arr[i][2] + ',cost:' + arr[i][3] + ' left:' + arr[i][4];
		}
		
		msg.push(str);
	}
	
	fs.writeFileSync(commitFile, msg.join('\r\n'), 'utf8');
}

/**
 * 工时统计弹窗
 */
function workTimeDialog(selectedIndex, isFinished) {
	
	var isFinished = isFinished || false;
	var form = blessed.form({
			parent : screen,
			mouse : true,
			keys : true,
			vi : true,
			left : 10,
			top : 5,
			width : 70,
			height : 15,
			style : {
				bg : '#0000FF',
				fg : '#fff'
			},
			scrollable : true,
			scrollbar : {
				ch : ' '
			}
		});
	
	var rowData = bugTable._data[selectedIndex];
	var title = blessed.text({
			content : getText('WorkTimeTitle'),
			left : 0,
			top : 0,
			style : {
				fg : '#fff',
				bg : '#0000FF'
			}
		});
	
	form.append(title);
	
	var taskLabel = blessed.text({
			content : getText('TaskName'),
			left : 2,
			top : 3,
			style : {
				fg : '#fff',
				bg : '#0000FF'
			}
		});
	
	form.append(taskLabel);
	
	var taskName = blessed.text({
			content : rowData[2],
			left : 13,
			top : 3,
			style : {
				fg : '#fff',
				bg : '#0000FF'
			}
		});
	
	form.append(taskName);
	
	var consumedLabel = blessed.text({
			content : getText('ConsumedTime'),
			left : 2,
			top : 5,
			style : {
				fg : '#fff',
				bg : '#0000FF'
			}
		});
	
	form.append(consumedLabel);
	
	var consumedTextInput = blessed.textbox({
			parent : form,
			mouse : true,
			keys : true,
			style : {
				bg : '#fff',
				fg : '#000'
			},
			height : 1,
			width : 20,
			left : 13,
			top : 5,
			name : 'consumed'
		});
	
	consumedTextInput.setValue(rowData[3]);
	
	var leftLabel = blessed.text({
			content : getText('RemainTime') ,
			left : 2,
			top : 7,
			style : {
				fg : '#fff',
				bg : '#0000FF'
			}
		});
	
	form.append(leftLabel);
	
	var leftTextInput = blessed.textbox({
			parent : form,
			mouse : true,
			keys : true,
			style : {
				bg : '#fff',
				fg : '#000'
			},
			height : 1,
			width : 20,
			left : 13,
			top : 7,
			name : 'left'
		});
	
	leftTextInput.setValue(isFinished ? '0' : rowData[4]);
	
	var finishedLabel = blessed.text({
			content : getText('TaskFinished'),
			left : 2,
			top : 9,
			style : {
				fg : '#fff',
				bg : '#0000FF'
			}
		});
	
	form.append(finishedLabel);
	
	var okBtn = blessed.button({
			content : getText('OK'),
			top : 11,
			left : 13,
			width : 4,
			height : 1,
			aligin : 'center',
			parent : form,
			style : {
				fg : '#008000',
				bg : '#C0C0C0',
				focus : {
					fg : '#C0C0C0',
					bg : '#008000'
				}
			}
		});
	
	var cancleBtn = blessed.button({
			content : getText('Cancel'),
			top : 11,
			left : 18,
			width : 8,
			height : 1,
			parent : form,
			aligin : 'center',
			style : {
				fg : '#008000',
				bg : '#C0C0C0',
				focus : {
					fg : '#C0C0C0',
					bg : '#008000'
				}
			}
		});
	
	form.focus();
	
	okBtn.on('press', function () {
		form.submit();
	});
	
	cancleBtn.on('press', function () {
		form.hide();
		bugTable.focus();
	});
	
	form.on('submit', function (data) {
		form.hide();
		bugTable.focus();
		
		//已解决
		rowData[3] = data.consumed;
		rowData[4] = data.left;
		rowData[5] = data.left == '0' ? '√' : ' ';
		bugTable._data[selectedIndex] = rowData;
		bugTable.setTableData(bugTable._data);
		bugTable.select(selectedIndex);
		screen.render();
	});
	
	screen.render();
	
	consumedTextInput.on("focus", function () {
		this.readInput();
	});
	
	leftTextInput.on("focus", function () {
		this.readInput();
	});
	
}
