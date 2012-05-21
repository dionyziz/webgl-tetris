/*
 * Developer: Dionysis "dionyziz" Zindros <dionyziz@gmail.com>
 */

var media = {
    play: function ( sample ) {
        document.getElementById( 'sound-' + sample ).play();
    },
    stop: function ( sample ) {
        document.getElementById( 'sound-' + sample ).pause();
        document.getElementById( 'sound-' + sample ).currentTime = 0;
    },
    init: function () {
    }
};
media.init();
