var base = require("./base");

var websiteMap = base.parseIniFile('.zentao');

var websites = [];
for(var name in websiteMap){
    websites.push([name, websiteMap[name].url, websiteMap[name].account, '******']);
}

console.log(websites);