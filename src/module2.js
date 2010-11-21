(function(global, doc){

    /*
    Util
     */
    var augment = function(receiver, provider, override){
        for(var property in provider){
            if(!receiver[property] || override){
                receiver[property] = provider[property];
            }
        }
        return receiver;
    }

    /*
    Registry
     */
    , registry = {}

    , register = function(record){
        if(!registry.hasOwnProperty(record.path)){
            registry[record.path] = record;
        }
    }

    , require = function(path) {
        path = path.replace(/\*$/, 'package');
        if (registry.hasOwnProperty(path)) {
            return registry[path].exports;
        }
        notify('error', {
            message: 'Required path "' + path + '" not in registry.',
            path: path
        },1);
    }

    , reduce = function(list){
        var i = list.length-1, path;
        while((path = list[i])){
            list[i] = path.replace(/\*/,'package');
            if(typeof path != 'string' || registry.hasOwnProperty(path)){
                list.splice(i,1);
            }
            i--;
        }
        return list;
    }

    /*
    Events
     */

    , iEvents = {} // internal
    , eEvents = {} // external
    , eLoaded = 'loaded'
    , eRun = 'run'
    , eRan = 'ran'
    , eError = 'error'
    , eComplete = 'complete'

    , listen = function(type, listener, internal){
        var events = internal ? iEvents : eEvents;
        (events[type] || (events[type] = [])).push(listener);
    }

    , deafen = function(type, listener, internal){
        var list = (internal ? iEvents : eEvents)[type]
        , i;
        if (list && (i = list.length)) {
            while (i--) {
                list[i] === listener && list.splice(i, 1);
            }
        }
    }

    , notify = function(type, data, internal){
        var list = (internal ? iEvents : eEvents)[type]
        , i = 0
        , listener;
        data || (data = {});
        data.type = type;
        data.deafen = function(){
            deafen(type, listener, internal);
        };
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

    /*
    Loader
     */

    , timeout = 5000

    // contains external uri's or uri aliases.
    // uri's will be matched by path pattern mapping.
    , repositories = {}

    , addRepositories = function(map){
        var uri
        , pattern;
        for(pattern in map) {
            repositories[map[pattern]] = new RegExp('^'+pattern);
        }
    }

    // will contain paths that are still being loaded or processed (pending).
    , pending = {}

    // will contain paths that failed to load.
    , failed = {}

    , root = ''
    
    , scriptNode = doc.createElement('script')

    , scriptAnchor = (function(){

        var list = doc.getElementsByTagName('script')
        , i = list.length
        , node
        , re = /module[^\/\\]*\.js.?$/i;
        while(i && (node = list[--i])){
            if(/module\.js/.test(node.src)){
                root = node.src.replace(re, '');
                return node;
            }
        }
        return node;

    }())

    , getUrl = function(path){
        path = path.replace(/\*$/, 'package');
        for(var url in repositories){
            if(repositories.hasOwnProperty(url) && repositories[url].test(path)){
                return url + path + '.js';
            }
        }
        return root + path + '.js';
    }

    , appendListener = function(node){

        var listener = function(){
            var node = listener.node
            , e
            , path = node.id;
            if(!node.readyState || /complete|loaded/i.test(node.readyState)) {
                e = {
                    path: path,
                    node: node
                };
                notify(eLoaded, e, 0);
                notify(eLoaded, e, 1);
                node.onload = node.onreadystatechange = null;
            }
            node = null;
        };
        listener.node = node;

        node.onload = node.onreadystatechange = listener;

        node = null;
    }

    , load = function(list){
        var fragment = doc.createDocumentFragment()
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
                tid: startTimeout(path),
                needs: list
            };
        }
        scriptAnchor.parentNode.insertBefore(fragment, scriptAnchor);
        node = fragment = null;
    }

    , startTimeout = function(path){
        return setTimeout(function(){
            fail(path, path + ' timed out');
        }, timeout);
    }

    , fail = function(path, msg){
        var data = {
            path: path,
            timeout: timeout,
            message: msg,
            failedDependencies: []
        }
        , list
        , dependency
        , i;
        if(pending[path] && (list = pending[path].needs)){
            for(i=0;dependency = list[i++];){
                if(failed[dependency]){
                    data.failedDependencies.push(dependency);
                }
            }
        }
        failed[path] = true;
        clean(path);
        notify('error', data, 0);
    }

    /*
        Dependency parser, rudimentary for the moment disallowing freedom of expression.
        Hopefully will be able to develop a better parser, but for now, this wil do.
     */
    , parser = {
        regExps: {},
        parse: function(code){
            code = ''+code;

            var paramRegExp = /^\s*function\s*\([^,\)]*,\s*([^\s,\)]*)/
            , requireRegExp = /[^\\](['"])|[^\\.]require\(([^\)]*)/g
            , trimRegExp = /^\s*["']\s*|\s*["']\s*$/g
            , inString
            , list = []
            , found = {}
            , m = code.match(paramRegExp);

            m && (m = m[1]);

            if(m) {
                requireRegExp = this.regExps[m] || (this.regExps[m] = new RegExp("[^\\\\](['\"])|[^\\.](?:require|"+m+")\\(([^\\)]*)","g"));
            }

            requireRegExp.lastIndex = 0;

            while((m = requireRegExp.exec(code)) != null){

                m[1] && (inString = !inString);
                m[2] && (m[2] = m[2].replace(trimRegExp, ''));

                if(!inString && m[2] && !found[m[2]]) {
                    found[m[2]] = list.push(m[2].replace(trimRegExp,''));
                }

            }

            return list;

        }
    }

    /*
    Module
     */

    , stack = []

    , module = function(/*[name,] [needs,] code */){

        var name
        , needs
        , code
        , arg
        , i = arguments.length;

        while((arg = arguments[--i])){
            (!code && (code = arg))
            || (!needs && typeof arg != 'string' && (needs = arg))
            || (name = arg);
            if(name){break;}
        }

        needs = reduce(needs || parser.parse(code));

        stack.push({
            name: name,
            code: code,
            needs: needs,
            complete: !needs.length,
            exports: {}
        });
    }

    , clean = function(path){
        if(pending[path]){
            clearTimeout(pending[path].tid);
            delete pending[path];
        }
    }

    , finalize = function(record){
        var old = global.require
        , e = {
            path: record.path,
            module: true,
            exports: record.exports
        };
        global.require = require;
        module.id = record.path;
        try {
            notify(eRun, e, 0);
            record.code(record.exports, require);
            notify(eRan, e, 0);
            register(record);
            clean(record.path);
            notify(eComplete, e, 0);
            notify(eComplete, e, 1);
        } catch(e){
            fail(record.path, e);
        } finally {
            delete module.id;
            global.require = old;
        }
    }

    , process = function(path, record, isPackage){
        // TODO: sort packages
        if(record.complete){
            if(isPackage){
                /* TODO: sort packages
                    - error and fail if no record.name
                    - concat path + record.name (=module )
                 */
            }
            record.path = path;
            finalize(record);
        } else {
            var needs = record.needs;
            pending[path] = augment(record, pending[path], 0);
            listen(eComplete, function(e){
                var i = needs.length;
                while(i--){
                    if(e.path === needs[i]){
                        needs.splice(i, 1);
                    }
                }
                if(!needs.length){
                    e.deafen();
                    record.complete = true;
                    process(path, record, isPackage);
                }
            }, 1);
            load(needs);
        }
    };

    listen(eLoaded, function(e){
        var path = e.path
        , record;
        if(stack.length === 1){
            process(path, stack.pop(),0);
        } else if(stack.length > 1) {
            // TODO: resolve packages
            notify(eError, {
                path: e.path,
                message: 'No package support implemented yet.'
            }, 0);
        } else {
            // assume a non module library
            // register an empty dummy record.
            var r = {
                path: path,
                exports:{},
                module: false
            };
            register(r);
            clean(path);
            notify(eComplete, r, 0); // external
            notify(eComplete, r, 1); // internal
        }
        e.node.parentNode.removeChild(e.node);
    }, 1);

    module.config = function(config){
        config.timeout && (timeout = config.timeout);
        config.root && (root = config.root);
        config.repositories && addRepositories(config.repositories);
        config.parser && typeof config.parser.parse == 'function' && (parser = config.parse);
    };

    module.run = function(path){
        if(typeof path == 'string') {
            load([path]);
        } else if(typeof path == 'function') {
            var needs = parser.parse(path);
            listen(eComplete, function(e){
                var i = needs.length;
                while(i--){
                    if(e.path === needs[i]){
                        needs.splice(i, 1);
                    }
                }
                if(!needs.length){
                    e.deafen();
                    var old = global.require
                    global.require = require;
                    try{
                        path({}, require);
                    } catch(e){
                        notify(eError, e, 0);
                    } finally {
                        global.require = old;
                    }
                }
            }, 1);
            load(needs);
        }

    };

    module.listen = function(type, listener){listen(type, listener, 0);};
    module.deafen = function(type, listener){deafen(type, listener, 0);};

    global.module = module;

}(this, document));