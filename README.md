***A variant to RequireJS, ModularJS***

*status: UNSTABLE*
 - breaks in IE

ModularJS is mostly intended as an experimentation project, consider it a *what if* namespace.
Code is written from scratch and based on my old projects rather then RequireJS.
The only similarity is the core API (namely require() and define(), everything else is completely different.

I still recommend using [RequireJS][0] over ModularJS since RequireJS simply has better support, more contributors
and a wider range of options (serverside, webworkers, l18n support). And frankly, I code these libraries as a hobby
and expression of creativity.

ModularJS is mainly focused on Client Side features and API conveniences.
I try to conform to [Modules/AsynchronousDefinition][1] as much as possible.

The biggest difference between ModularJS and RequireJS is it's event system.

    require.listen( eventType , listener );
    require.deafen( eventType , listener );
    require.notify( eventType , dataObject );

Which can be used for plugins to modify module records at various stages.

    require.plugin( "foo" , function ( record , params ) {

         // This function is called once a record is created.
         // A record is created at the time a path (minus path expressions) is first encountered.

         // params argument is always a string, up to the plugin to resolve it.
         params = params.split( "," );

         // We can also inject dependencies at this stage.
         record.needs.push( "foo/bar" );

         // Or change the HTML node
         record.node = function () {

             var n = document.createElement( "link" );
             n.href = record.context + record.path + ".css";
             n.rel = "stylesheet";
             return n;

         }

         require.listen( "complete" , function ( e ) {

             if ( e.record === record ) {

                 e.deafen(); // curtesy clean up
                 record.module.foo = true; // modify module to support foo-ness.

             }

         }

    } );

Plugins can be used by adding path-expressions to dependencies.

    require( [ "root/module !foo()" ] , callbackFunction );
    define( [ "root/module !foo()" ] , moduleFactoryFunction );



[0]: http://requirejs.org/
[1]: http://wiki.commonjs.org/wiki/Modules/AsynchronousDefinition