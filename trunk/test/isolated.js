asyncTest( "Has 1 dependency already loaded/loading and 1 fresh dependency" , function () {

    require( [ "mock/mock3" ] , function ( mock ) {

        ok( !!mock , "we have something" );

        equals( mock.id , "MOCK3" , "we got the right module!" );
        equals( mock.a , "MOCK1" , "first dependency is an object" );
        equals( mock.b , "MOCK2" , "second dependency is a function call" );
        equals( mock.c , "MOCK4" , "third dependency is a global" );

        start();

    } );

} );