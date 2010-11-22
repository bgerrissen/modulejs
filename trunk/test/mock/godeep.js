define( [ "mock/deep/mock1" , "mock/deep/mock2", "wildcard" , "mock/deep/mock4" ] , function ( a , b , c , d ) {

    return {
        id: "GODEEP",
        a : a.id,
        b : b(),
        c : c.id,
        d : mock4.id
    };

} );