module('parser', function(exports){

    var rq = /^\s*function\s*\([^,\)]*,\s*([^\s,\)]*)/
    var re = /[^\\](['"])|[^\\.]require\(([^\)]*)/g;
    var clean = /^\s*["']\s*|\s*["']\s*$/g;

    exports.parse = function(code){

        code = code.toString();
        var inString, list=[], found={};
        var m = code.match(rq)[1];

        if(m) {
            re = new RegExp("[^\\\\](['\"])|[^\\.](?:require|"+m+")\\(([^\\)]*)","g");
        }

        re.lastIndex = 0;

        while((m = re.exec(code)) != null){

            m[1] && (inString = !inString);
            m[2] && (m[2] = m[2].replace(clean, ''));

            if(!inString && m[2] && !found[m[2]]) {
                found[m[2]] = list.push(m[2].replace(clean,''));
            }

        }

        return list;

    }

});