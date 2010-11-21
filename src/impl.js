module('impl', function(exp, param){

    var parser = require("parser");

    //console.profile();
    var list = parser.parse(function(exp, req){

        var y = '1';
        var z = 'req("serf")';
        var x = y;

        req (  '  parser  ' );

        req('some/lib');
        req('./bill ');

        var obj = {get:function(){}};



        obj.req('parser');
        obj.req('jan')


    });
    //console.profileEnd();
    
    console.log(list);

    var serf = require('serf');

    serf.inject(function(a,b,c){

        console.log(test);

    });

});