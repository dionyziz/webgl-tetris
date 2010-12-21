var tetromino = { // currently falling tetromino
    id: 0, // 0 ... shapes.length
    rotation: 0, // 0, 1, 2, 3
    shape: [], // 4x4 array
    position: [ 0, 0 ], // x, y
    moveLeft: function() {
        if ( !tetris.collision.checkX( -1 ) ) {
            --tetromino.position[ 0 ];
            render.draw();
            return true;
        }
        return false;
    },
    moveRight: function() {
        if ( !tetris.collision.checkX( 1 ) ) {
            ++tetromino.position[ 0 ];
            render.draw();
            return true;
        }
        return false;
    },
    moveDown: function() {
        if ( tetris.collision.checkY( 1 ) ) {
            if ( tetromino.position[ 1 ] <= 0 ) {
                tetris.over();
            }
            else {
                tetris.next();
            }
            render.draw();
            return false;
        }
        else {
            ++tetromino.position[ 1 ];
            render.draw();
            return true;
        }
    },
    hardDrop: function() {
        while ( !tetris.collision.checkY( 1 ) ) {
            tetromino.moveDown();
            tetris.addScore( 1 );
        }
        media.play( 'drop' );
    },
    rotate: function() {
        var newShape = tetris.getRotatedShape( tetromino.shape );
        
        // check if new shape is possible
        for ( var x = 0; x < 4; ++x ) {
            for ( var y = 0; y < 4; ++y ) {
                if ( newShape[ y * 4 + x ] != 0 ) {
                    if ( tetris.world[ ( y + tetromino.position[ 1 ] ) * tetris.COLS + x + tetromino.position[ 0 ] ] ) {
                        // collision with other shape during rotation
                        return;
                    }
                    if ( x + tetromino.position[ 0 ] >= tetris.COLS ) {
                        // off the right of the grid due to rotation
                        if ( tetromino.moveLeft() ) {
                            tetromino.rotate();
                        }
                        return;
                    }
                    if ( x + tetromino.position[ 0 ] <= 0 ) {
                        // off the left of the grid due to rotation
                        if ( tetromino.moveRight() ) {
                            tetromino.rotate();
                        }
                        return;
                    }
                    if ( y + tetromino.position[ 1 ] >= tetris.ROWS ) {
                        // off the bottom of the grid due to rotation
                        return;
                    }
                    if ( y + tetromino.position[ 1 ] <= 0 ) {
                        // off the top of the grid due to rotation
                        if ( tetromino.moveDown() ) {
                            tetromino.rotate();
                        }
                        return;
                    }
                }
            }
        }
        tetromino.shape = newShape;
        ++tetromino.rotation;
        tetromino.rotation %= 4;
        
        render.draw();
    },
    solidify: function () {
        if ( typeof tetromino.shapeId != 'undefined' ) {
            for ( var x = 0; x < 4; ++x ) {
                for ( var y = 0; y < 4; ++y ) {
                    if ( tetromino.shape[ 4 * y + x ] ) {
                        tetris.world[
                            tetris.COLS * ( tetromino.position[ 1 ] + y )
                            +
                            ( tetromino.position[ 0 ] + x )
                        ] = tetromino.shape[ 4 * y + x ];
                    }
                }
            }
            tetris.checkLines();
        }
    }
};
