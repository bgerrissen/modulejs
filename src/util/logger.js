module(function(exp, req){

    function k(arg){
        return arg;
    }

    function Logger(){
        this.clear();
    }

    Logger.prototype = {
        log: function(msg, data){
            this.logs.push({
                message: msg,
                timestamp: +new Date(),
                data: data
            })
        },
        each: function(handler){
            typeof handler == 'function' || (handler = k);
            var list = [].concat(this.logs)
            , i = 0
            , log;

            for(;list[i];i++){
                handler(list[i],i);
            }
        },
        clear: function(){
            this.logs = [];
        }
    };

    exp.Logger = Logger;

});