/*
 * Developer: Dionysis "dionyziz" Zindros <dionyziz@gmail.com>
 */

var tetris = {
    COLS: 10,
    ROWS: 20,
    LINES_PER_LEVEL: 10,
    VISIBLE_ROWS: 20,
    dropSpeed: 1000,
    level: 0,
    score: 0,
    lines: 0,
    // 20x10 array with the current world state
    // excluding current shape
    world: [],
    shapes: [
        [ 0, 0, 0, 0,
          1, 1, 1, 1 ],
        [ 1, 0, 0, 0,
          1, 1, 1, 0 ],
        [ 0, 0, 1, 0,
          1, 1, 1, 0 ],
        [ 0, 1, 1, 0,
          0, 1, 1, 0 ],
        [ 0, 1, 1, 0,
          1, 1, 0, 0 ],
        [ 0, 1, 0, 0,
          1, 1, 1, 0 ],
        [ 1, 1, 0, 0,
          0, 1, 1, 0 ]
    ],
    bag: [],
    nextShapeId: null,
    nextShapeRotation: null,
    nextShape: [],
    runGame: 0,
    pause: function() {
        clearInterval( tetris.runGame );
        tetris.runGame = 0;
    },
    resume: function() {
        if ( tetris.runGame == 0 ) {
            tetris.runGame = setInterval( tetris.tick, tetris.dropSpeed );
        }
    },
    over: function() {
        document.title = 'Game over!';
        media.stop( 'music' );
        media.play( 'gameover' );
        clearInterval( runGame );
        tetris.pause();
    },
    next: function() {
        var empty;
        
        if ( tetris.bag.length == 0 ) {
            // generate a bag
            tetris.bag = shuffle( [ 0, 1, 2, 3, 4, 5, 6 ] );
        }
        
        tetromino.solidify();
        tetromino.shapeId = tetris.nextShapeId;
        tetris.nextShapeId = tetris.bag.pop();
        tetromino.shapeRotation = tetris.nextShapeRotation;
        tetris.nextShapeRotation = Math.floor( Math.random() * 4 );
        tetromino.shape = arrayCopy( tetris.nextShape );
        tetris.nextShape = [];
        tetris.nextShape.push( 0, 0, 0, 0 );
        [].push.apply( tetris.nextShape, tetris.shapes[ tetris.nextShapeId ] );
        tetris.nextShape.push( 0, 0, 0, 0 );
        tetris.nextShape = tetris.getRotatedShape( tetris.nextShape, tetris.nextShapeRotation );
        tetromino.position[ 1 ] = 0;
        for ( y = 0; y < 4; ++y ) {
            for ( x = 0; x < 4; ++x ) {
                if ( tetris.nextShape[ x + y * 4 ] != 0 ) {
                    tetris.nextShape[ x + y * 4 ] = tetris.nextShapeId + 1;
                }
            }
        }
        empty = true;
        for ( y = 0; y < 4; ++y ) {
            for ( x = 0; x < 4; ++x ) {
                if ( tetromino.shape[ x + y * 4 ] != 0 ) {
                    empty = false;
                }
            }
            if ( empty ) {
                --tetromino.position[ 1 ];
            }
        }
        tetromino.position[ 0 ] = 3;
        render.showNextPreview();
    },
    checkLines: function () {
        var line;
        var clear = [];
        
        for ( var y = tetris.ROWS - 1; y >= 0; --y ) {
            line = true;
            for ( var x = 0; x < tetris.COLS; ++x ) {
                if ( tetris.world[ tetris.COLS * y + x ] == 0 ) {
                    line = false;
                    break;
                }
            }
            if ( line ) {
                clear.push( y );
            }
        }
        if ( clear.length ) {
            tetris.clearLines( clear );
        }
    },
    clearLines: function ( clear ) {
        var toClear;
        
        media.play( 'line' );
        toClear = clear.length;
        switch ( clear.length ) {
            case 1:
                tetris.addScore( 40 * ( tetris.level + 1 ) );
                break;
            case 2:
                tetris.addScore( 100 * ( tetris.level + 1 ) );
                break;
            case 3:
                tetris.addScore( 300 * ( tetris.level + 1 ) );
                break;
            case 4:
                tetris.addScore( 1200 * ( tetris.level + 1 ) );
                break;
        }
        tetris.lines += clear.length;
        tetris.onlineschange( tetris.lines );
        if ( tetris.level != Math.floor( tetris.lines / tetris.LINES_PER_LEVEL ) ) {
            tetris.level = Math.floor( tetris.lines / tetris.LINES_PER_LEVEL );
            tetris.onlevelchange( tetris.level );
            tetris.dropSpeed *= 0.9;
            tetris.pause(); tetris.resume();
        }
        
        tetris.onclearlines( clear );
        setTimeout( function () {
            tetris.removeLines( clear );
            tetris.resume();
        }, 100 );
        tetris.pause();
    },
    removeLines: function ( clear ) {
        // remove line(s) from game; move all other blocks onto it
        var i = 0;
        for ( var y in clear ) {
            var line = clear[ y ] + i;
            for ( var yy = line; yy >= 0; --yy ) {
                for ( var xx = 0; xx < tetris.COLS; ++xx ) {
                    if ( yy == 0 ) {
                        tetris.world[ tetris.COLS * yy + xx ] = 0;
                    }
                    else {
                        tetris.world[ tetris.COLS * yy + xx ] = tetris.world[ tetris.COLS * ( yy - 1 ) + xx ];
                    }
                }
            }
            ++i;
        }
    },
    addScore: function ( points ) {
        tetris.score += points;
        tetris.onscorechange( points );
    },
    getRotatedShape: function ( source, times ) {
        var newShape = [];
        
        if ( typeof times == 'undefined' ) {
            times = 1;
        }
        
        for ( var i = 0; i < times; ++i ) {
            for ( var x = 0; x < 4; ++x ) {
                for ( var y = 0; y < 4; ++y ) {
                    newShape[ y * 4 + x ] = source[ ( 3 - x ) * 4 + y ];
                }
            }
            source = arrayCopy( newShape );
        }
        
        return source;
    },
    init: function () {
        eventDriven.create( this, 'lineschange' );
        eventDriven.create( this, 'levelchange' );
        eventDriven.create( this, 'scorechange' );
        eventDriven.create( this, 'clearlines' );
        
        if ( !render.init() ) {
            return;
        }
        
        for ( var i = 0; i < tetris.ROWS * tetris.COLS; ++i ) {
            tetris.world.push( 0 );
        }
        
        input.registerHandler( input.KEY_LEFT_ARROW, tetromino.moveLeft, true );
        input.registerHandler( input.KEY_RIGHT_ARROW, tetromino.moveRight, true );
        input.registerHandler( input.KEY_UP_ARROW, tetromino.rotate );
        input.registerHandler( input.KEY_SPACE_ARROW, tetromino.rotate );
        input.registerHandler( input.KEY_DOWN_ARROW, tetromino.hardDrop );
        
        tetris.next();
        tetris.next();
        tetris.resume();
    },
    tick: function () {
        tetromino.moveDown();
    },
    collision: {
        checkX: function( xoffset ) {
            for ( var x = 0; x < 4; ++x ) {
                for ( var y = 0; y < 4; ++y ) {
                    if ( tetromino.shape[ 4 * y + x ] != 0 ) {
                        if ( x + tetromino.position[ 0 ] + xoffset < 0 ) { 
                            // shape collided with left end
                            return true;
                        }
                        if ( x + tetromino.position[ 0 ] + xoffset >= tetris.COLS ) {
                            // shape collided with right end
                            return true;
                        }
                        if (
                            tetris.world[
                                tetris.COLS * ( y + tetromino.position[ 1 ] ) +
                                ( x + tetromino.position[ 0 ] + xoffset )
                            ] != 0
                            ) { // shape collided with another shape on the left or right
                            return true;
                        }
                    }
                }
            }
            return false;
        },
        checkY: function ( yoffset ) {
            var followingBlock;
            
            // check if the shape can go further down
            for ( var x = 0; x < 4; ++x ) {
                for ( var y = 0; y < 4; ++y ) {
                    followingBlock = tetris.COLS * ( tetromino.position[ 1 ] + y + yoffset )
                                     + ( tetromino.position[ 0 ] + x );
                    if ( tetromino.shape[ 4 * y + x ] != 0 ) {
                        if ( typeof tetris.world[ followingBlock ] == 'undefined' ) {
                            // shape reached bottom
                            return true;
                        }
                        if ( tetris.world[ followingBlock ] != 0 ) {
                            // shape fell on existing world
                            return true;
                        }
                    }
                }
            }
            return false;
        }
    }
};

tetris.init();
