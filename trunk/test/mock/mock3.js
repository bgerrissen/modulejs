define( [ "mock/mock1" , "mock/mock2" ] , function ( a , b) {

    return {
        id : "MOCK3",
        a : a.id,
        b : b()
    };

} );