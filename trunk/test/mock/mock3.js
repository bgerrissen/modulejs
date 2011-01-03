define( [ "mock/mock1" , "mock/mock2" , "mock/mock4" ] , function ( a , b , c ) {
    console.log( "DEFINING MOCK3" );

    return {
        id : "MOCK3",
        a : a.id,
        b : b(),
        c : mock4.id
    };

} );
console.log( "MOCK3 INTERPRETED" );