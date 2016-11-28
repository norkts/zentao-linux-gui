targetDir=~/.zentao
sourceDir=.

install:
	mkdir $(targetDir)
	mkdir $(targetDir)/log
	mkdir $(targetDir)/tmp
	mkdir $(targetDir)/conf

	cp -R $(sourceDir)/bin $(targetDir)
	chmod 777 $(targetDir)/bin/zentao
	echo "source $(targetDir)/bin/.zentao.sh">~/.bashrc
	chmod 777 $(targetDir)/bin/.zentao.sh
	$(targetDir)/bin/.zentao.sh
uninstall:
	rm -rf $(targetDir)
	sed -i "/source .*\/bin\/\.zentao\.sh/d" ~/.bashrc