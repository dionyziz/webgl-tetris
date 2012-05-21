/*
 * Developer: Dionysis "dionyziz" Zindros <dionyziz@gmail.com>
 */

var input = {
    enable: 0,
    handle: 0,
    keys: {},
    KEY_LEFT_ARROW: 37, KEY_UP_ARROW: 38, KEY_RIGHT_ARROW: 39, KEY_DOWN_ARROW: 40, KEY_SPACE: 32,
    init: function () {
        window.onkeydown = function ( e ) {
            if ( input.keys[ e.keyCode ] ) {
                return;
            }
            input.keys[ e.keyCode ] = true;
            input.handlerOnce( e.keyCode );
            input.handlerRepeat( e.keyCode );
            clearInterval( input.handle );
            clearTimeout( input.enable );
            input.enable = setTimeout( function () {
                input.handle = setInterval( input.handlerRepeat, 30 );
            }, 200 );
        };
        window.onkeyup = function ( e ) {
            input.keys[ e.keyCode ] = false;
        };
    },
    userHandlers: {
        repeat: {},
        once: {}
    },
    handlerRepeat: function() {
        for ( var key in input.userHandlers.repeat ) {
            var callback = input.userHandlers.repeat[ key ];
            if ( input.keys[ key ] ) {
                input.userHandlers.repeat[ key ]();
            }
        }
    },
    handlerOnce: function( key ) {
        if ( typeof input.userHandlers.once[ key ] !== 'undefined' ) {
            input.userHandlers.once[ key ]();
        }
    },
    registerHandler: function ( key, callback, repeat ) {
        if ( repeat ) {
            input.userHandlers.repeat[ key ] = callback;
        }
        else {
            input.userHandlers.once[ key ] = callback;
        }
    }
};
input.init();
