
var listener = function( e ){

    console.log( e.type + " --> " + e.record.path );
    console.log( "fetch: " + e.record.fetch.length );

    if ( require.insertStack.length ) {
        console.log( "@INSERTED!" );
        console.log( require.insertStack.length );
        console.log( require.insertStack[0].factory );
    }

    if ( e.record.module ) {
        console.log( "@MODULE!" );
        console.log( e.record.module );
        console.log( e.record.module.id );

    }

    console.log( "---------------" );

};

//require.listen( "loaded" , listener );
//require.listen( "complete" , listener );

asyncTest( "Has 1 dependency already loaded/loading and 1 fresh dependency" , function () {

    require( [ "mock/mock3" ] , function ( mock ) {

        ok( !!mock , "we have something" );

        equals( mock.id , "MOCK3" , "we got the right module!" );
        //equals( mock.a , "MOCK1" , "first dependency is correct" );
        //equals( mock.b , "MOCK2" , "second dependency is correct" );

        start();

    } );

} );