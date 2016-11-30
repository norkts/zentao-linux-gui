targetDir=~/.zentao
sourceDir=.

ARCH = 64
ifeq ($(shell getconf LONG_BIT), 32)
    ARCH = 86
else
    ARCH = 64
endif
nodefile=node-v6.9.1-linux-x$(ARCH)

install:
	mkdir $(targetDir)
	mkdir $(targetDir)/log
	mkdir $(targetDir)/tmp
	mkdir $(targetDir)/conf
	
	ifeq ($(nodefile).tar.gz, $(wildcard $(nodefile).tar.gz))
		wget https://nodejs.org/dist/v6.9.1/$(nodefile).tar.xz --no-check-certificate
	else
		xz -d node-v6.9.1-linux-x$(ARCH).tar.xz
	endif
	
	ifeq ($(nodefile).tar, $(wildcard $(nodefile).tar))
		echo $(nodefile).tar
	else
		tar xvf node-v6.9.1-linux-x$(ARCH).tar	
	endif
	
	cp node-v6.9.1-linux-x$(ARCH)/bin/node mkdir $(targetDir)/bin/node
	
	cp -R $(sourceDir)/bin $(targetDir)
	chmod 777 $(targetDir)/bin/zentao
	echo "source $(targetDir)/bin/.zentao.sh">~/.bashrc
	chmod 777 $(targetDir)/bin/.zentao.sh
	$(targetDir)/bin/.zentao.sh
uninstall:
	rm -rf $(targetDir)
	sed -i "/source .*\/bin\/\.zentao\.sh/d" ~/.bashrc