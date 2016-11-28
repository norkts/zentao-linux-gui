#!/bin/bash
svnpath=/usr/bin/svn
gitpath=/usr/bin/git
zentaopath=~/.zentao/bin/zentao
exepath=$svnpath
commitFile=~/.zentao/tmp/.zentao.commit

function svn(){
	exepath=$svnpath;

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
	
	if [ -f $commitFile];then
		$exepath $@ -F $commitFile;
		$zentaopath $@;
	else
		$exepath $@
	fi
}
