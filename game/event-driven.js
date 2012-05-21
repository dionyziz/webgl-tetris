/*
 * Developer: Dionysis "dionyziz" Zindros <dionyziz@gmail.com>
 */

var eventDriven = {
    create: function ( object, eventname ) {
        object[ 'on' + eventname ] = function () {
            eventDriven.handle( this, eventname, arguments );
        };
        if ( typeof object._event_ == 'undefined' ) {
            // first time event.create is called upon this object
            object._event_ = {};
            if ( typeof object.addListener != 'undefined' ) {
                throw "Object " + object + " already contains a native addListener method. eventDriven could not create the event " + eventname;
            }
            else {
                object.addListener = eventDriven.addListener;
            }
        }
        
        object._event_[ eventname ] = [];
    },
    handle: function ( object, eventname, args ) {
        for ( var i in object._event_[ eventname ] ) {
            object._event_[ eventname ][ i ].apply( object, args );
        }
    },
    addListener: function ( eventname, action ) {
        // (this) is the object by which the event was fired
        for ( var i in this._event_[ eventname ] ) {
            if ( this._event_[ eventname ][ i ] == action ) {
                return; // already attached
            }
        }
        this._event_[ eventname ].push( action );
    },
};
