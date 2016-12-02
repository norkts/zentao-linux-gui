#!/bin/bash
svnpath=/usr/bin/svn
gitpath=/usr/bin/git
zentaopath=~/.zentao/bin/zentao
exepath=$svnpath
commitFile=~/.zentao/tmp/.zentao.commit
logInfoFile=~/.zentao/tmp/.commit.log
logCommond=""
function svn(){
	exepath=$svnpath;
	logCommond="log -r COMMITTED -v --xml"
	
	case $1 in 
		commit)
			runZentao $@;
			;;
		ci)
			runZentao $@;
			;;
		*)
			$exepath $@;
			;;
	esac
}

function git(){
	exepath=$gitpath;
	logCommond="log -1 --name-status --pretty=oneline"
	case $1 in 
		commit)
			runZentao $@;
			;;
		ci)
			runZentao $@;
			;;
		*)
			$exepath $@;
			;;
	esac

}

function runZentao(){
	
	#执行禅道TUI操作命令
	$zentaopath $@;
	
	#当zentao执行成功并生成了提交文件才执行提交命令
	if [ -f $commitFile ]; then
		$exepath $@ -F $commitFile;
		
		#commit命令成功时执行
		if [ $? -eq 0 ]; then
			echo "$exepath">$logInfoFile
			$exepath $logCommond>>$logInfoFile
			$zentaopath $@;
		fi
	else
		$exepath $@
	fi
	
	if [ -f $commitFile ]; then
		rm $commitFile;
	fi
	
	if [ -f $logInfoFile ]; then
		rm $logInfoFile;
	fi
}
