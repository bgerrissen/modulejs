define( [ "mock/deep/mock1" , "mock/deep/mock2" ] , function ( a , b) {

    return {
        id : "MOCK3",
        a : a.id,
        b : b()
    };

} );