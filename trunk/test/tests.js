module( "core functionality" );

asyncTest( "basic mock module, no dependencies" , function () {

    require( [ "mock/mock1" ] , function ( mock ) {

        ok( !!mock , "we have something" );
        
        equals( mock.id , "MOCK1" , "we got the right module!" );

        start();

    } );

} );

asyncTest( "Has 1 dependency already loaded/loading and 1 fresh dependency" , function () {

    require( [ "mock/mock3" ] , function ( mock ) {

        ok( !!mock , "we have something" );

        equals( mock.id , "MOCK3" , "we got the right module!" );
        equals( mock.a , "MOCK1" , "first dependency is correct" );
        equals( mock.b , "MOCK2" , "second dependency is correct" );

        start();

    } );

} );

asyncTest( "Load a non existing file" , function(){

    require.config( "scriptTimeout" , 1000 );

    var timeout = require.config( "scriptTimeout" )
    , then = +new Date();

    require.listen( "error" , function ( e ) {

        var now = +new Date()
        , diff = now - then;

        e.deafen();

        ok( true , "Script timed out after " + diff + "ms" );
        ok( true , "Official timeout is " + timeout + " difference is " + ( diff - timeout ) );
        start();

    } );

    require( [ "nada" ] , function( ){

        ok( false , "SHOULD NEVER BE CALLED" );
        start();

    } );

} );

asyncTest( "Complex dependencies plus force() test on mock3" , function(){

    require.force( "wildcard" , "mock/deep/mock3" );

    require.listen( "error" , function ( e ) {

        e.deafen();
        ok( false , "Error event fired, should NOT happen @ " + e.message );

        start();

    } );

    require( [ "mock/godeep" ] , function ( godeep ) {

        equals( godeep.id , "GODEEP" , "We got the right module" );

        equals( godeep.a , "MOCK1" , "Mock1 is neatly defined and was an object" );
        equals( godeep.b , "MOCK2" , "Mock2 is neatly defined and was a function" );
        equals( godeep.c , "MOCK3" , "path 'wildcard' forced to 'mock/deep/mock3', mock3 had sub dependencies" );
        equals( godeep.d , "MOCK4" , "Mock4 was a global object" );

        start();

    } );

} );

module( "expressions !grab" );

asyncTest( "Mock4 is a global" , function () {

    require.listen( "error" , function ( e ) {

        e.deafen();
        ok( false , "Error event fired, should NOT happen @ " + e.message );

        start();

    } );

    require( [ "mock/mock4 !grab( mock4 )" ] , function ( mock4 ) {

        console.log( mock4 )

        ok( !!mock4 , "Well something was grabbed." );
        equals( mock4.id , "MOCK4" , "Good we grabbed the right object.");

        start();

    } );

} );