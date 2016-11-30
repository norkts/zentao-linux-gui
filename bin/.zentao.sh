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
	logCommond="log -r COMMITTED -v"
	
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
	logCommond="log -1 --name-status"
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
	$zentaopath $@;
	
	if [ -f $commitFile ]; then
		$exepath $@ -F $commitFile;
		echo $exepath>$logInfoFile
		$exepath $logCommond>>$logInfoFile
		$zentaopath $@;
	else
		$exepath $@
	fi
}
