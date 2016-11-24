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

var argvs = process.argv;

var globalIniPath = '~/.zentao'; //配置文件地址
var commitFile = '~/.zentao.commit';//TODO 多用户处理
var workConfigPath = '~/.zentao.work';
var currentPath = process.cwd();
var zentaosh = '~/.zentao-sh';


if (os.type() == 'Windows_NT') {
	globalIniPath = '.zentao';
    commitFile = '.zentao.commit';
    workConfigPath = '.zentao.work';
    zentaosh = '.zentao-sh';
}else{
    globalIniPath = process.env.HOME + "/.zentao";
    commitFile = process.env.HOME + '/.zentao.commit';
    workConfigPath = process.env.HOME + '/.zentao.work';
    zentaosh = process.env.HOME + '/.zentao-sh';
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
});

/**
 * 主流程函数
 */
(function(){
    
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
        process.stdout.write('不支持的操作系统' + os.type() + ', 只支持linux系统\r\n');
        return;
    }
    
    process.stdout.write("开始安装zentao-for-linux\r\n");
    
    var contents = fs.readFileSync(process.env.HOME + '/.bashrc', 'utf8');
    
    //判断是否添加了命令接管
    if(content.indexOf('.zentao-sh') == -1){
        //复制命令接管脚本文件到用户目录
        contents = fs.readFileSync('.zentao-sh', 'utf8');
        fs.writeFileSync(zentaosh, contents);
        
        //每次启动终端使脚本接管生效
        fs.appendFileSync(process.env.HOME + '/.bashrc', 'source ~/.zentao-sh');
        
        //使当前终端命令接管生效
        child.execSync('source ~/.zentao-sh');
        
        //创建禅道主程序启动脚本链接
        child.execSync('ln -s ' + currentPath + '/zentao /usr/bin/zentao');
    }
    
    process.stdout.write("你没有添加过禅道站点,是否添加(y or n): ");
    var chunk = stdinRead();
    websiteMap = {};

    if(chunk == 'y'){
        while(true){
            process.stdout.write("请输入站点名称: ");
            var websiteName = stdinRead();
            
            process.stdout.write("请输入站点地址: ");
            var url = stdinRead();
            
            
            process.stdout.write("请输入站点用户名: ");
            var account = stdinRead();
            
            
            process.stdout.write("请输入站点密码: ");
            var password = stdinRead();
            
            websiteMap[websiteName] = {url : url, account: account, password: password};
            
            process.stdout.write("是否继续添加站点(y or n): ");
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
    if(websiteMap[workconfig[currentPath].name] == undefined){
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
                            console.log("登录禅道站点失败: " + zentaoAPI.url + ", 错误信息:" + msg);
                        }
                    });            
            });
    }).then(function(){
            zentaoAPI.getRepos(function(repos){
    
                logger("bindWorkRepository getRepos res:" + JSON.stringify(repos));

                for(var i = 0; i < repos.length; i++){
                    process.stdout.write(i + " : " + repos[i] + "\r\n");
                }
                
                process.stdout.write("请输入数字选择仓库地址(0-" + (repos.length - 1) + "):");
                
                var chunk = stdinRead();
                logger(chunk);
                var num = parseInt(chunk);
                
                process.stdout.write("你选择了:" + repos[num]);
                
                saveWorkConfig(selectedWebsiteName, repos[num]);
                
                view();
                

            });   
    })
}

/**
 * 读取终端输入
 */
function stdinRead(){    
    process.stdin.setEncoding('utf8');
    
    var buf = new Buffer(1000);
    buf.fill(0);
    var size = fs.readSync(process.stdin.fd, buf, 0, 1000, null);
    
    return GBK2UTF8(buf.slice(0, size)).trim();
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
    var workconfig = base.parseIniFile(workConfigPath);
    initZentaoAPI(workconfig[currentPath], function(isSuccess, msg){
       
        var contents = fs.readFileSync(commitFile, 'UTF-8');
        
        var taskRegAll = /(Finish\s+)?[Tt]ask#(\d+).*?,\s*[Cc]ost:(\d+)\s*left:(\d+)/g;
        var taskReg = /(Finish\s+)?[Tt]ask#(\d+).*?,\s*[Cc]ost:(\d+)\s*left:(\d+)/;
        var bugRegAll = /(Fix\s+)?[Bb]ug#(\d+)/g;
        var bugReg = /(Fix\s+)?[Bb]ug#(\d+)/;
        
        var matches = contents.match(taskRegAll);
        if(matches != undefined){
            for(var i = 0; i < matches.length; i++){
                var match = matches[i].match(taskReg);
                var task = {id: match[2], consumed: match[3], left: match[4]};
                zentaoAPI.updateTask(task, function(){
                    //TODO 成功的处理
                });
            }
        }
        
        contents.match(bugRegAll);
        if(matches != undefined){
            for(var i = 0; i < matches.length; i++){
                var match = matches[i].match(bugReg);
                var bugId = match[2];
                zentaoAPI.updateBug(bugId, function(){
                    //TODO 成功的处理
                });
            }
        }    
    });
    
    //TODO reversion信息，commitMessage信息，repo信息处理
}

/**
 * 初始化字符界面
 */
function initTUI(){
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
}
/**
 * 初始化站点列表
 */
function initSiteTable(onRowSelect) {

    siteTable = new ListTable(screen)
        siteTable.setTitle("站点选择");

    //FIXME 当按上下箭头时此处显示异常
    siteTable.setTip("按↑↓选择项目，按Enter进入操作");

    siteTable.setHead(['站点名称', '站点地址', '用户名', '密码']);

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
    logger("initZentaoTui " + JSON.stringify(website));
    initZentaoAPI(website, function (isSucess, message) {
        logger("initZentaoTui-initZentaoAPI " + isSucess + "," + message);
        if (isSucess) {
            bugTable = initBugTable();
        } else {
            msg.display("登录失败:" + message, 3000, function(){
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
	
	bugTable = new ListTable(screen);
	bugTable.setTitle("Bug与任务");
	
	bugTable.setTip("按↑↓选择项目，按Space键切换选择状态,按0键切换解决状态\r\n按Tab键切换工作区域,按Shift + Tab键切换任务和BUG");
	
	bugTable.setHead(['选择', 'Bug ID', '标题', '已解决']);
	
	var bugButton = blessed.text({
			content : getText('BUG'),
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
			content : getText('任务'),
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
			
			bugTable.setHead(['选择', 'Bug ID', '标题', '已解决']);
			
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
			
			bugTable.setHead(['选择', '任务 ID', '任务名称', '已用时', '剩余用时', '已完成']);
			
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
			content : getText('确定'),
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
			content : getText('取消'),
			top : screen.height - 3,
			left : 10,
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
			width : screen.width - 20,
			height : screen.height - 20,
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
			content : "工时统计",
			left : 0,
			top : 0,
			style : {
				fg : '#fff',
				bg : '#0000FF'
			}
		});
	
	form.append(title);
	
	var taskLabel = blessed.text({
			content : "任务名称",
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
			content : "已耗时",
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
			content : "剩余耗时",
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
			content : "已完成",
			left : 2,
			top : 9,
			style : {
				fg : '#fff',
				bg : '#0000FF'
			}
		});
	
	form.append(finishedLabel);
	
	var finishedCheckBox = blessed.checkbox({
			parent : form,
			mouse : true,
			keys : true,
			style : {
				bg : '#fff',
				fg : '#000'
			},
			height : 1,
			width : 5,
			checked : isFinished,
			left : 13,
			top : 9,
			name : 'finished'
		});
	
	finishedCheckBox.on("check", function () {
		leftTextInput.setValue(0);
	});
	
	var okBtn = blessed.button({
			content : getText('确定'),
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
			content : getText('取消'),
			top : 11,
			left : 18,
			width : 4,
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

/**
 * 语言处理
 */
function getText(textName) {
	return textName;
}
