var base = require("./base");
var fs = require("fs");

var zentao = new base.ZentaoAPI('http://demo.zentao.net/', 'demo', '123456');

var executor = base.executor;
var os = require("os");
var configPath = '~/.zentao';
if(os.type() == 'Windows_NT'){
    configPath = '.zentao';
}

var matches = "Fix bug#194 1111\r\nFix bug#165 提交错误".match(/(Fix\s+)?[Bb]ug#(\d+)/g);
console.log(matches);

/* var mapWebSite = base.parseIniFile(configPath);


zentao.isGet().then(function(){
    return executor(function(resolve){
        zentao.login(resolve);
    });
}).then(function(loginSuccess, msg){
    console.log(msg);
    if(loginSuccess){
        zentao.getRepos(function(repos){

            base.logger("bindWorkRepository getRepos res:" + repos.length);

            for(var i = 0; i < repos.length; i++){
                process.stdout.write(i + " : " + repos[i] + "\r\n");
            }
            
            process.stdout.write("请输入数字选择仓库地址(0-" + (repos.length - 1) + "):");
            
            var num = parseInt(process.stdin.read());
            
            process.stdout.write("你选择了:" + repos[num]);
            

        });
    }else{
        console.log('--login-failed:' + msg);
    }
}) */