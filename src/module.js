

(function(context) {

    var registry = {};

    var pending = {};

    var events = {
        loaded: [],
        complete: []
    };

    var listen = function(type, listener){
        events[type] && events[type].push(listener);
    }

    var deafen = function(type, listener){
        var list = events[type], i;
        if (list && (i = list.length)) {
            while (i--) {
                list[i] === listener && list.splice(i, 1);
            }
        }
    }

    var announce = function(type, data){
        var list = events[type]
        , i = 0
        , listener;
        data || (data = {});
        data.type = type;
        if (list && (list = [].concat(list)) && list.length) {
            while ((listener = list[i++])) {
                data.currentListener = listener;
                listener(data);
            }
        }
    }

    var module = function(name, code) {

        var missing = extractResources(code.toString());

        for(var path in pending){
            if(pending[path] === name){

                registry[path] = {
                    name: name,
                    code: code,
                    needs: missing
                };

                if(!missing.length){
                    runCode(path);
                    delete pending[path];
                } else {
                    listen('complete', function(e){
                        var i = missing.length;
                        while(i && i--){
                            missing[i] === e.path && missing.splice(i,1);
                        }
                        if(!missing.length){
                            deafen('complete', e.currentListener);
                            runCode(path);
                        }
                    });
                    load(missing);
                }

                return;
            }
        }

        throw "Module name '"+name+"' does not equal filename.";

    }

    var runCode = function(path){
        var record = registry[path];
        if(record){
            setRequire();
            record.code((record.module={}));
            unsetRequire();
        }
        announce('complete', {
            path: path
        });
    }

    var pattern = /[^\w\d\.]require[\s]*\((["'])([^\)]*)\1\)/g;

    var extractResources = function(code) {

        var match, result = [];

        while ((match = pattern.exec(code)) !== null) {
            match[2] && (match[2] = match[2].replace(/#[^#]*$/,''));
            match[2] && !registry[match[2]] && result.push(match[2]);
        }

        return result;

    }

    var scriptNode = document.createElement('script');
    var scriptAnchor = document.getElementsByTagName('script')[0];

    var load = function(list) {
        var fragment = document.createDocumentFragment();
        var i = list.length;
        var resource, node;
        while(i && (resource = list[--i])){
            if(pending[resource]) continue;
            node = scriptNode.cloneNode(true);
            node.id = resource;
            node.src = module.root + resource + '.js';
            appendListener(node);
            fragment.appendChild(node);
            pending[resource] = resource.split(/[\\\/]/).pop();
        }
        scriptAnchor.parentNode.insertBefore(fragment, scriptAnchor);
        node = fragment = null;
    }

    var appendListener = function(node){

        node.onload = node.onreadystatechange = function(){

            if(!node.readyState || /complete|loaded/i.test(node.readyState)) {

                announce('loaded', {
                    path: node.id,
                    src: node.src
                });

                node.onload = node.onreadystatechange = null;
                delete pending[node.id];
                //node.parentNode.removeChild(node);
                node = null;
            }
        }

    }

    module.run = function(path){
        load([path]);
    }

    var require = function(path) {
        var target = path.split(/\\\//).pop();
        var bits = target.split('#');
        target = bits[0];
        return bits[1] ? registry[target].module[bits[1]] : registry[target].module;
    }

    var old;

    var setRequire = function(){
        old = context.require;
        context.require = require;
    }

    var unsetRequire = function(){
        context.require = old;
    }

    context.module = module;

})(this);