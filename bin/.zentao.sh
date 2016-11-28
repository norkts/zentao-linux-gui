#!/bin/bash
svnpath=/usr/bin/svn
gitpath=/usr/bin/git
zentaopath=~/.zentao/bin/zentao
exepath=$svnpath

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
	$exepath $@ -F ~/.zentao/tmp/.zentao.commit;
	$zentaopath $@;
}
