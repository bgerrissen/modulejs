/**
 * Created by IntelliJ IDEA.
 * User: bgerrissen
 * Date: 20-jun-2010
 * Time: 21:35:03
 * To change this template use File | Settings | File Templates.
 */

module('style', function(exports){

    var slice = Array.prototype.slice;

    /**
     *
     * @param name
     * @param value
     */
    exports.setStyle = function(element, name, value){
        return this;
    }

    /**
     *
     * @param map
     */
    exports.setStyles = function(element, map){
        return this;
    }

    /**
     *
     * @param name
     */
    exports.getStyle = function(element, name){
        var value;
        return value;
    }

    /**
     *
     * @param map
     */
    exports.getStyles = function(element, list){
        return {};
    }


    exports.set = function(element, a, b){
        if(typeof a === 'string' && b){
            return exports.setStyle(a,b);
        } else {
            return exports.setStyles(a);
        }
    }

    exports.get = function(a){
        if(arguments.length === 1){
            return exports.getStyle(a);
        } else {
            return exports.getStyles(slice.call(arguments));
        }
    }

});