function shuffle( a ) {
    var s = arrayCopy( a );
    var t = [];
    
    while ( s.length ) {
        t.push( s.splice( Math.random() * s.length, 1 )[ 0 ] );
    }

    return t;
}

function arrayCopy( a ) {
    var b = [];
    
    [].push.apply( b, a );
    
    return b;
}

