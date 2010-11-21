(function(context) {

    var registry = {}

    , pending = {}

    , repositories = {}

    , manifest = {}

    , timeout = 2000

    , failed = {}

    , lostStack = []

    , events = {
        loaded: [],
        complete: [],
        error: []
    }

    , listen = function(type, listener){
        events[type] && events[type].push(listener);
    }

    , deafen = function(type, listener){
        var list = events[type], i;
        if (list && (i = list.length)) {
            while (i--) {
                list[i] === listener && list.splice(i, 1);
            }
        }
    }

    , announce = function(type, data){
        var list = events[type]
        , i = 0
        , listener;
        data || (data = {});
        data.type = type;
        data.deafen = function(){
            deafen(type, listener);
        }
        if (list && (list = [].concat(list)) && list.length) {
            while ((listener = list[i++])) {
                if(typeof listener == 'function') {
                    listener(data);
                } else if(typeof listener.handleEvent == 'function') {
                    listener.handleEvent(data);
                }
            }
            delete data.deafen;
        }
    }

    , module = function(name, code, dependencies) {

        if(typeof name == 'function' && typeof code != 'function'){
            dependencies = code;
            code = name;
            name = null;
        }

        console.log('------------------');
        console.log('name: '+name);
        console.log(code)
        console.log('------------------');

        if(!name && typeof code == 'function '){
            lostStack.push({
                code: code,
                dependencies: dependencies
            });
            return;
        }

        dependencies || (dependencies = check(manifest[name]) || module.extract(code));

        for(var path in pending){

            if(pending.hasOwnProperty(path) && pending[path].name === name){

                registry[path] = {
                    name: name,
                    code: code,
                    needs: dependencies
                };

                if(!dependencies.length){
                    runModule(path);
                    clean(path);
                } else {
                    listen('complete', function(e){
                        var i = dependencies.length;
                        while(i && i--){
                            dependencies[i] === e.path && dependencies.splice(i,1);
                        }
                        if(!dependencies.length){
                            e.deafen();
                            runModule(path);
                        }
                    });
                    load(dependencies);
                }

            }
        }

    }

    , clean = function(path){
        if(pending[path]){
            clearTimeout(pending[path].tid);
            delete pending[path];
        }
        if(failed[path]){
            delete registry[path];
        }
    }

    , runModule = function(path){
        var record = registry[path];
        if(record){
            setRequire();
            module.id = path;
            try {
                record.code((record.mod={}), require);
            }catch(e){
                announce('error', {
                    path: path,
                    module: true,
                    message: e.message,
                    error:e
                });
            }
            delete module.id;
            unsetRequire();
        }
        announce('complete', {
            path: path,
            module: true
        });
    }

    , check = function(list){
        if(list){
            var i = list.length, record;
            while(i && --i){
                (record = registry[list[i]]) && record.mod && list.splice(i, 1);
            }
        }
        return list;
    }

    , scriptNode = document.createElement('script')
    , scriptAnchor = (function(){
        var list = document.getElementsByTagName('script')
        , i = list.length
        , node
        , re = /module[^\/\\]*\.js.?$/i;
        module.root = ''; 
        while((node = list[--i])){
            if(/module\.js/.test(node.src)){
                module.root = node.src.replace(re, '');
                return node;
            }
        }
        return node;
    }())

    , load = function(list) {
        var fragment = document.createDocumentFragment()
        , i = list.length
        , path
        , node;
        while(i && (path = list[--i])){
            if(pending[path]) continue;
            node = scriptNode.cloneNode(true);
            node.id = path;
            node.src = getUrl(path);
            appendListener(node);
            fragment.appendChild(node);
            pending[path]= {
                name: path.split(/[\\\/]/).pop(),
                tid: startTimeout(path)
            };
        }
        scriptAnchor.parentNode.insertBefore(fragment, scriptAnchor);
        node = fragment = null;
    }

    , fail = function(path) {
        var data = {
            path: path,
            timeout: timeout,
            failedDependencies: []
        }
        , list
        , dependency
        , i;
        if(registry[path] && (list = registry[path].needs)){
            for(i=0;dependency = list[i++];){
                if(failed[dependency]){
                    data.failedDependencies.push(dependency);
                }
            }
        }
        announce('error', data);
        failed[path] = true;
        clean(path);
    }

    , startTimeout = function(path){
        return setTimeout(function(){
            fail(path);
            clean(path);
        },timeout);
    }

    , getUrl = function(resource){
        for(var url in repositories){
            if(repositories.hasOwnProperty(url) && repositories[url].test(resource)){
                return url + resource + '.js';
            }
        }
        return module.root + resource + '.js';
    }

    , appendListener = function(node){

        node.onload = node.onreadystatechange = function(){

            if(!node.readyState || /complete|loaded/i.test(node.readyState)) {

                var path = node.id, mod;

                announce('loaded', {
                    path: path
                });

                if(!registry[path]){

                    if(lostStack.length === 1) {
                        // assuming lostStack contains the module code.
                        mod = lostStack.pop();
                        module(path.split(/[\\\/]/).pop(), mod.code, mod.dependencies );
                    } else {
                        // assuming resource that doesn't use module();
                        registry[path] = {module:'no module inserted for '+path};
                        announce('complete',{
                            path: path,
                            module: false
                        });
                    }
                    // clear the lostStack
                    lostStack.length = 0;
                }

                node.parentNode.removeChild(node);
                node = node.onload = node.onreadystatechange = null;
            }
        }

    }

    , require = function(path) {
        var target = path.split(/\\\//).pop();
        return registry[target].mod;
    }

    , oldRequire

    , setRequire = function(){
        oldRequire = context.require;
        context.require = require;
    }

    , runFunction = function(fn){
        setRequire();
        try{
            fn();
        } catch(e){}
        unsetRequire();
    }

    , unsetRequire = function(){
        context.require = oldRequire;
    }

    /** Method to extract require calls from a function expression.
     *  'parmReg' serves to attain the functions parameters, we want the 2nd parameter name if present.
     *  'requireReg' is the default regexp to scan a functions body for require calls.
     *  'cleanReg' is used to clean up extracted paths.
     *
     */
    , parmReg = /^\s*function\s*\([^,\)]*,\s*([^\s,\)]*)/

    , requireReg = /[^\\](['"])|[^\\.]require\(([^\)]*)/g

    , cleanReg = /^\s*["']\s*|\s*["']\s*$/g

    , extract = function(code){
        code = code + '';
        var inString
        , re = requireReg
        , list=[]
        , found={}
        , m = code.match(parmReg);

        // if we have a reference parameter to require (2nd function param), build a new regexp to scan with.
        if(m && (m = m[1])) {
            re = new RegExp("[^\\\\](['\"])|[^\\.](?:require|"+m+")\\(([^\\)]*)","g");
        }

        re.lastIndex = 0;

        while((m = re.exec(code)) != null){

            m[1] && (inString = !inString);
            m[2] && (m[2] = m[2].replace(cleanReg, ''));

            // ignore matches to 'require' that are inside a string
            if(!inString && m[2] && !found[m[2]]) {
                found[m[2]] = list.push(m[2].replace(clean,''));
            }

        }

        return list;

    };

    listen('complete', function(e){
        clean(e.path);
    });

    // exposed so people can hack it for possible better versions.
    module.extract = extract;

    module.run = function(path){
        if(typeof path == "string" && !registry[path]){
            load([path]);    
        }
    }

    module.repository = module.repo = function(pattern, url){
        repositories[url] = new RegExp("^"+pattern);
    }

    module.repositories = module.repos = function(map){
        for(var pattern in map){
            if(map.hasOwnPropert(pattern)){
                repositories[map[pattern]] = new RegExp("^"+pattern);
            }
        }
    }

    /**@method manifest(map)
     *      Tell module() in advance what the dependency mappings are.
     * @usage
     *      map({
     *          moduleOne: ['path/dependencyOne', 'dependencyTwo'],
     *          moduleTwo: 'dependencyThree'
     *      });
     * @param map
     */
    module.manifest = function(map){
        for(var name in map){
            if(map.hasOwnProperty(name)){
                manifest[name] = [].concat(map[name]);
            }
        }
    }

    module.listen = listen;
    module.deafen = deafen;


    context.module = module;

})(this);