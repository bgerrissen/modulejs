module('test', function(exp, req){

    req('jquery/1.4.2/jquery.min');
    exp.test = function(){
        console.log('Test succeeded.')
    }


});