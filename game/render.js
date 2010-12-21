var render = {
    numFrames: 0, // FPS counter
    // 20x10 array with whatever has been drawn on the scene
    // including current shape
    graphicWorld: [],
    // cube instances to be used by the drawing engine
    graphicBlocks: [],
    levelBox: null,
    nextPreview: [],
    colors: [
        [ 0, 1, 1, 1 ],
        [ 0, 0, 1, 1 ],
        [ 1, 0.5, 0, 1 ],
        [ 1, 1, 0, 1 ],
        [ 0, 1, 0, 1 ],
        [ 1, 0, 1, 1 ],
        [ 1, 0, 0, 1 ]
    ],
    animateLineGone: function( y, callback ) {
        var t = 0;
        var SPEED = 0.3;
        
        function animate() {
            t += SPEED;
            for ( var x = 0; x < tetris.COLS; ++x ) {
                i = x + tetris.COLS * y;
                render.graphicBlocks[ i ].move( +( 9 % tetris.COLS ) * 1.1 / 2 - ( i % tetris.COLS ) * 1.1, 0, 0 );
                render.graphicBlocks[ i ].rotateY( SPEED );
                render.graphicBlocks[ i ].move( -( 9 % tetris.COLS ) * 1.1 / 2 + ( i % tetris.COLS ) * 1.1, 0, 0 );
            }
            if ( t > Math.PI ) {
                for ( var x = 0; x < tetris.COLS; ++x ) {
                    i = x + tetris.COLS * y;
                    render.graphicBlocks[ i ].move( +( 9 % tetris.COLS ) * 1.1 / 2 - ( i % tetris.COLS ) * 1.1, 0, 0 );
                    render.graphicBlocks[ i ].rotateY( -t );
                    render.graphicBlocks[ i ].move( -( 9 % tetris.COLS ) * 1.1 / 2 + ( i % tetris.COLS ) * 1.1, 0, 0 );
                }
                callback();
                render.draw();
            }
            else {
                setTimeout( arguments.callee, 20 );
            }
        }
        animate();
    },
    draw: function() {
        var prevGraphicWorld = arrayCopy( render.graphicWorld );
        var blockLocation;
        
        render.graphicWorld = arrayCopy( tetris.world );
        
        for ( var x = 0; x < 4; ++x ) {
            for ( var y = 0; y < Math.min( 4, tetris.ROWS - tetromino.position[ 1 ] ); ++y ) {
                blockLocation = tetris.COLS * ( tetromino.position[ 1 ] + y ) + ( tetromino.position[ 0 ] + x );
                render.graphicWorld[ blockLocation ] = Math.max(
                    tetromino.shape[ 4 * y + x ], render.graphicWorld[ blockLocation ]
                );
            }
        }
        
        for ( var i = 0; i < render.graphicBlocks.length; ++i ) {
            if ( prevGraphicWorld[ i ] != render.graphicWorld[ i ] ) {
                if ( render.graphicWorld[ i ] > 0 && prevGraphicWorld[ i ] == 0 ) {
                    render.graphicBlocks[ i ].show();
                }
                else if ( render.graphicWorld[ i ] == 0 && prevGraphicWorld[ i ] > 0 ) {
                    render.graphicBlocks[ i ].hide();
                }
                render.graphicBlocks[ i ].material = render.materialByIndex( render.graphicWorld[ i ] );
            }
        }
        render.perform();
    },
    countFPS: function () {
        document.title = render.numFrames + 'fps';
        render.numFrames = 0;
    },
    showNextPreview: function () {
        for ( var x = 0; x < 4; ++x ) {
            for ( var y = 0; y < 4; ++y ) {
                var i = 4 * y + x;
                
                if ( tetris.nextShape[ i ] ) {
                    render.nextPreview[ i ].material = render.materialByIndex( tetris.nextShape[ i ] );
                    render.nextPreview[ i ].show();
                }
                else {
                    render.nextPreview[ i ].hide();
                }
            }
        }
    },
    perform: function() {
        ++render.numFrames;
        engine.draw();    
    },
    materialByIndex: function ( idx ) {
        return {
            ambientColor: [ 0, 0, 0, 1 ],
            diffuseColor: render.colors[ idx - 1 ],
            specularColor: [ 0.5, 0.5, 0.5, 1 ],
            specularExponent: 100
        };
    },
    initCanvas: function () {
        //Init a WebGL context and return a handle to the canvas element
        try {
            var canvas = engine.init( window.innerWidth, window.innerHeight );
        }
        catch ( e ) {
            // alert( e.message );
            document.getElementById( 'missing-webgl' ).style.display = '';
            return false;
        }
        document.body.appendChild( canvas );
        
        return true;
    },
    initEngine: function () {
        //Set the camera location ( x, y, z ) and direction ( pitch, yaw, roll )
        engine.setCamera( 0, -1, 15, -Math.PI / 12, 0, 0 );
        
        engine.setLight( {
            position: [ 0, 2, -40, 1 ],
            ambientColor: [ 0.1, 0.1, 0.1, 1 ],
            diffuseColor: [ 1, 1, 1, 1 ],
            specularColor: [ 1, 1, 1, 1 ],
            spotDirection: [ 0, 0 , -1 ],
            attenuationFactors: [ 1000, 1000, 1000 ],
            computeDistanceAttenulation: 0,
            spotExponent: 10,
            spotCutoffAngle: 180
        } );
    },
    initGeometry: function () {
        var BLOCK_WIDTH = 1.05;
        
        // one block
        var box = new engine.Model( engine.utils.makeParallelepiped( -0.5, -0.5, -0.5, 0.5, 0.5, 0.5 ) );
        
        // level area
        render.levelBox = engine.utils.makeParallelepiped(
            -9 * BLOCK_WIDTH / 2 - 0.6, tetris.VISIBLE_ROWS + 0.5, -10,
            9 * BLOCK_WIDTH / 2 + 0.6, tetris.VISIBLE_ROWS * ( 1 - BLOCK_WIDTH ) + 0.4, -100
        );
        var border = engine.utils.makeParallelepiped(
            -9 * BLOCK_WIDTH / 2 - 0.5, tetris.VISIBLE_ROWS + 0.5, -49.5,
            9 * BLOCK_WIDTH / 2 + 0.5, tetris.VISIBLE_ROWS * ( 1 - BLOCK_WIDTH ) + 0.5, -50.5
        );

        // remove front and back sides
        border.indices.splice( 8 * 3, 3 );
        border.indices.splice( 8 * 3, 3 );
        border.indices.splice( 8 * 3, 3 );
        border.indices.splice( 8 * 3, 3 );
        
        render.levelBox.normals = engine.utils.genNormals( render.levelBox.vertices, render.levelBox.indices );
        border.normals = engine.utils.genNormals( border.vertices, border.indices );
        for ( i = 0; i < render.levelBox.normals.length; ++i ) {
            render.levelBox.normals[ i ] = -render.levelBox.normals[ i ];
        }
        for ( i = 0; i < border.normals.length; ++i ) {
            border.normals[ i ] = -border.normals[ i ];
        }
        border.material = {
            ambientColor: [ 1, 0, 0, 1 ],
            diffuseColor: [ 1, 0, 0, 1 ],
            specularColor: [ 1, 0, 0, 1 ],
            specularExponent: 20
        };
        var border = new engine.Model( border );
        render.levelBox = new engine.Model( render.levelBox );
        render.levelBox = new engine.Instance( render.levelBox );
        new engine.Instance( border );
        
        for ( var i = 0; i < tetris.ROWS * tetris.COLS; ++i ) {
            render.graphicWorld.push( 0 );
            render.graphicBlocks[ i ] = new engine.Instance( box );
            render.graphicBlocks[ i ].move( 0, tetris.ROWS - Math.floor( i / tetris.COLS ) * BLOCK_WIDTH, -50 );
            render.graphicBlocks[ i ].move( -( 9 % tetris.COLS ) * BLOCK_WIDTH / 2 + ( i % tetris.COLS ) * BLOCK_WIDTH, 0, 0 );
            render.graphicBlocks[ i ].hide();
        }
        
        for ( var x = 0; x < 4; ++x ) {
            for ( var y = 0; y < 4; ++y ) {
                var i = 4 * y + x;
                render.nextPreview[ i ] = new engine.Instance( box );
                render.nextPreview[ i ].move( -4.8, 7 - y * BLOCK_WIDTH, -30 );
                render.nextPreview[ i ].rotateY( Math.PI / 2 );
                render.nextPreview[ i ].move( x * BLOCK_WIDTH, 0, 0 );
                render.nextPreview[ i ].hide();
            }
        }
    },
    init: function () {
        if ( !render.initCanvas() ) {
            return false;
        }
        render.initEngine();
        render.initGeometry();
        
        tetris.addEventListener( 'lineschange', render.displayLines );
        tetris.addEventListener( 'scorechange', render.displayScore );
        tetris.addEventListener( 'levelchange', render.displayLevel );
        
        setInterval( render.perform, 15 );
        setInterval( render.countFPS, 1000 );
        
        return true;
    },
    displayLevel: function ( level ) {
        var levelColor = render.colors[ tetris.level % render.colors.length ];
        
        render.levelBox.material = {
            ambientColor: [ 1 * levelColor[ 0 ], 1 * levelColor[ 1 ], 1 * levelColor[ 2 ], 1 ],
            diffuseColor: [ 1, 1, 1, 1 ],
            specularColor: [ 0, 0, 0, 1 ],
            specularExponent: 100
        };
        
        document.getElementById( 'level' ).innerHTML = tetris.level;
    },
    displayLines: function ( lines ) {
        document.getElementById( 'lines' ).innerHTML = tetris.lines;
    },
    displayScore: function ( score ) {
        document.getElementById( 'score' ).innerHTML = tetris.score;
    }
};
