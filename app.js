var base = require('./base');
var blessed = require("blessed");
var fs = require("fs");

function logger() {
	for (var i = 0; i < arguments.length; i++) {
		fs.appendFile("out.txt", JSON.stringify(arguments[i]) + "\r\n");
	}
}


var websiteMap = base.parseIniFile('.zentao');

var websites = [];
for(var name in websiteMap){
    websites.push([name, websiteMap[name].url, websiteMap[name].account, '******']);
}


var ListTable = base.ListTable;

var screen = blessed.screen({
		debug : true,
		fullUnicode : true
	});

screen.key('C-q', function () {
	return screen.destroy();
});

var tableArr = [];

var siteTable = new ListTable(screen);
var bugTable;

siteTable.setTitle("站点选择");

//FIXME 当按上下箭头时此处显示异常
siteTable.setTip("按↑↓选择项目，按Enter进入操作");

siteTable.setHead(['站点名称', '站点地址', '用户名', '密码']);

siteTable.setData(websites);

siteTable.render();
siteTable.focus();

var zentaoAPI = undefined;
var msg = blessed.message({
  parent: screen,
  border: 'line',
  height: 'shrink',
  width: 'half',
  top: 'center',
  left: 'center',
  label: ' {blue-fg}Message{/blue-fg} ',
  tags: true,
  keys: true,
  hidden: true,
  vi: true
});


process.on('uncaughtException', function(error){
    siteTable.focus();
});

siteTable._table.on("select", function (arg) {
    
	var selectedIndex = siteTable.selected();
    
	var row = siteTable._data[selectedIndex];
	
	siteTable._table.hide();
    
    var website = websiteMap[row[0]];

	zentaoAPI = new base.ZentaoAPI(website.url, website.account, website.password);
    
    zentaoAPI.isGet().then(function(){
        zentaoAPI.login(function(isSucess){
            if(isSucess){
                bugTable = initBugTable();
            }else{
                msg.display("登录失败", 3000);
                
                siteTable.focus();
            }
        });

    });
	
});

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
			
            
            zentaoAPI.getBugList(function(bugs){
                var rows = [];
                for(var i = 0; i < bugs.length; i++){
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
            
            zentaoAPI.getTaskList(function(tasks){
                var rows = [];
                for(var i = 0; i < tasks.length; i++){
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
                focus:{
                    fg:'#00f',
                    bg: '#fff'
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
                focus:{
                    fg:'#00f',
                    bg: '#fff'
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
            if(!tabBugSelected && !isSelected){
                workTimeDialog(selectedIndex);
            }
            
			bugTable.setTableData(bugTable._data);
		}
		
        //只有选中任务时才触发
		if (ev == '0') {
            
            if(!tabBugSelected){
                //任务已完成
                workTimeDialog(selectedIndex, true);
            }else{
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
    screen.on('keypress', function(ch, key){
        if(key.name == 'tab'){
            tabIndex++;
            if(tabIndex > tabIndexItem.length - 1){
                tabIndex = 0;
            }

            tabIndexItem[tabIndex].focus();
        }
        
        screen.render();
    });
    
    okBtn.on('press', function(){
        var arr = getSelected(bugTable);
        logger(arr);
        screen.destroy();
    });
    
    cancleBtn.on('press', function(){
        screen.destroy();
    });
    
	screen.render();
	
    zentaoAPI.getBugList(function(bugs){
        var rows = [];
        for(var i = 0; i < bugs.length; i++){
            rows.push(['☒', bugs[i].id, bugs[i].title, '']);
        }
        bugTable.setData(rows);
        bugTable.render();
        bugTable.focus();

    });
    
	return bugTable;
}

function getSelected(bugTable){
    var data = bugTable._data;
    var resArr = [];
    for(var i = 0; i < data.length; i++){
        if(data[i][0] == '☑'){
            resArr.push(data[i]);
        }
    }
    
    return resArr;
}

function generateMessage(arr){
    
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
            height: screen.height - 20,
			style : {
				bg : '#0000FF',
                fg: '#fff'
			},
			scrollable : true,
			scrollbar : {
				ch : ' '
			}
		});
	
    var rowData = bugTable._data[selectedIndex];
	var title = blessed.text({
			content : "工时统计",
            left: 0,
            top: 0,
            style:{
                fg: '#fff',
                bg: '#0000FF'
            }
        });

    form.append(title);
    
    var taskLabel = blessed.text({
			content : "任务名称",
            left: 2,
            top: 3,
            style:{
                fg: '#fff',
                bg: '#0000FF'
            }
        });
        
    form.append(taskLabel);
    
    var taskName = blessed.text({
			content : rowData[2],
            left: 13,
            top: 3,
            style:{
                fg: '#fff',
                bg: '#0000FF'
            }
        });
        
    form.append(taskName);
    
    var consumedLabel = blessed.text({
        content : "已耗时",
        left: 2,
        top: 5,
        style:{
            fg: '#fff',
            bg: '#0000FF'
        }
    });
        
    form.append(consumedLabel);
    
    var consumedTextInput = blessed.textbox({
          parent: form,
          mouse: true,
          keys: true,
          style: {
            bg: '#fff',
            fg: '#000'
          },
          height: 1,
          width: 20,
          left: 13,
          top: 5,
          name: 'consumed'
    });

    consumedTextInput.setValue(rowData[3]);
    
    var leftLabel = blessed.text({
        content : "剩余耗时",
        left: 2,
        top: 7,
        style:{
            fg: '#fff',
            bg: '#0000FF'
        }
    });
        
    form.append(leftLabel);
    
    var leftTextInput = blessed.textbox({
          parent: form,
          mouse: true,
          keys: true,
          style: {
            bg: '#fff',
            fg: '#000'
          },
          height: 1,
          width: 20,
          left: 13,
          top: 7,
          name: 'left'
    });
    
    leftTextInput.setValue(isFinished ? '0' : rowData[4]);
    
   var finishedLabel = blessed.text({
        content : "已完成",
        left: 2,
        top: 9,
        style:{
            fg: '#fff',
            bg: '#0000FF'
        }
    });
        
    form.append(finishedLabel);
    
    var finishedCheckBox = blessed.checkbox({
          parent: form,
          mouse: true,
          keys: true,
          style: {
            bg: '#fff',
            fg: '#000'
          },
          height: 1,
          width: 5,
          checked: isFinished,
          left: 13,
          top: 9,
          name: 'finished'
    });
    
    finishedCheckBox.on("check", function(){
        leftTextInput.setValue(0);
    });
    
    var okBtn = blessed.button({
			content : getText('确定'),
			top : 11,
			left : 13,
			width : 4,
			height : 1,
			aligin : 'center',
            parent: form,
			style : {
				fg : '#008000',
				bg : '#C0C0C0',
                focus:{
                    fg: '#C0C0C0',
                    bg: '#008000'
                }
			}
		});
	
	var cancleBtn = blessed.button({
			content : getText('取消'),
			top : 11,
			left : 18,
			width : 4,
			height : 1,
            parent: form,
			aligin : 'center',
			style : {
				fg : '#008000',
				bg : '#C0C0C0',
                focus:{
                    fg: '#C0C0C0',
                    bg: '#008000'
                }
			}
		});
    
    form.focus();
    
    
    okBtn.on('press', function() {
        form.submit();
    });
    
    cancleBtn.on('press', function(){
        form.hide();
        bugTable.focus();
    });
    
    form.on('submit', function(data){
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
    
    consumedTextInput.on("focus", function(){
        this.readInput();
    });
    
    leftTextInput.on("focus", function(){
        this.readInput();
    });
    
}

/**
 * 语言处理
 */
function getText(textName) {
	return textName;
}
