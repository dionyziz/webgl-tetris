/*
 * Developer: Petros "petrosagg" Aggelatos <petrosagg@gmail.com>
 */

var engine = {
    defaults: {
        material: {
            ambientColor: [ 1, 1, 1, 1 ],
            diffuseColor: [ 1, 1, 1, 1 ],
            specularColor: [ 1, 1, 1, 1 ],
            specularExponent: 20
        }
    },
    gl: null,
    program: null,
    vertexShader: null,
    fragmentShader: null,
    world: {},
    worldId: 0,
    models: {},
    modelId: 0,
    cameraMatrix: null,
    perspectiveMatrix: null,
    currentLight: null,
    pendingOperations: [],
    log: function( a ) {
        if( typeof console === 'undefined' ) {
            return;
        }
        console.log( a );
    },
    AbstractObject: function() {
        this.setTranslation = function( x, y, z ) {
            this.cachedMatrix[ 12 ] = x;
            this.cachedMatrix[ 13 ] = y;
            this.cachedMatrix[ 14 ] = z;
        };
        this.move = function( x, y, z ) {
            mat4.translate( this.cachedMatrix, [ x, y, z ] );
        };
        this.rotate = function( angle, axis ) {
            mat4.rotate( this.cachedMatrix, angle, axis );
        };
        this.rotateX = function( angle ) {
            mat4.rotateX( this.cachedMatrix, angle );
        };
        this.rotateY = function( angle ) {
            mat4.rotateY( this.cachedMatrix, angle );
        }
        this.rotateZ = function( angle ) {
            mat4.rotateZ( this.cachedMatrix, angle );
        }
        this.scale = function( factor ) {
            mat4.scale( this.cachedMatrix, [ factor, factor, factor ] );
        };
    },
    lights: {
        DirectionalLight: function() {
            this.ambientColor = [ 1, 1, 1, 1 ];
            this.diffuseColor = [ 1, 1, 1, 1 ];
            this.specularColor = [ 1, 1, 1, 1 ];
        },
        SpotLight: function() {
            this.ambientColor = [ 1, 1, 1, 1 ];
            this.diffuseColor = [ 1, 1, 1, 1 ];
            this.specularColor = [ 1, 1, 1, 1 ];
            this.attenuationFactors = [ 0, 0, 0 ];
            this.computeDistanceAttenulation = 0;
            this.spotExponent = 1;
            this.spotCutoffAngle = 45;
        }
    },
    Camera: function() {
        this.active = function() {
            
        };
        this.perspective = function() {
        
        }
    },
    Model: function( object ) {
        var vertices, indices, normals, material;
        if( typeof object.vertices === 'undefined' || typeof object.indices === 'undefined' ) {
            return;
        }
        
        this.cachedMatrix = mat4.create();
        mat4.identity( this.cachedMatrix );
        
        vertices = object.vertices;
        indices = object.indices;
        normals = object.normals || engine.utils.genNormals( vertices, indices );
        material = object.material || engine.defaults.material;
        
        var vBuffer = engine.gl.createBuffer();
        //Set the current working buffer to the one just created
        engine.gl.bindBuffer( engine.gl.ARRAY_BUFFER, vBuffer );
        //Fill it with the values of vertices Javascript Array
        engine.gl.bufferData( engine.gl.ARRAY_BUFFER, new Float32Array( vertices ), engine.gl.STATIC_DRAW );
        
        var iBuffer = engine.gl.createBuffer();
        //Set the current working buffer to the one just created
        engine.gl.bindBuffer( engine.gl.ELEMENT_ARRAY_BUFFER, iBuffer );
        //Fill it with the values of indices Javascript Array
        engine.gl.bufferData( engine.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array( indices ), engine.gl.STATIC_DRAW );
        
        var nBuffer = engine.gl.createBuffer();
        //Set the current working buffer to the one just created
        engine.gl.bindBuffer( engine.gl.ARRAY_BUFFER, nBuffer );
        //Fill it with the values of vertices Javascript Array
        engine.gl.bufferData( engine.gl.ARRAY_BUFFER, new Float32Array( normals ), engine.gl.STATIC_DRAW );
        
        vBuffer.length = vertices.length;
        iBuffer.length = indices.length;
        nBuffer.length = normals.length;
        
        this.id = engine.modelId++;
        this.vBuffer = vBuffer;
        this.iBuffer = iBuffer;
        this.nBuffer = nBuffer;
        this.material = material;
        this.unload = function() {
            for( instance in engine.world ) {
                if( engine.world[ instance ].model.id == this.id ) {
                    engine.world[ instance ].remove();
                }
            }
            engine.gl.deleteBuffer( this.vBuffer );
            engine.gl.deleteBuffer( this.nBuffer );
            engine.gl.deleteBuffer( this.iBuffer );
        }
    },
    Instance: function( model ) {
        this.cachedMatrix = mat4.create();
        mat4.identity( this.cachedMatrix );
    
        var id = engine.worldId++;
        
        this.id = id;
        this.model = model;
        this.visible = true;
        this.material = model.material;
        this.show = function() {
            this.visible = true;
        };
        this.hide = function() {
            this.visible = false;
        };
        this.remove = function() {
            delete engine.world[ this.id ];
        };
        
        engine.world[ id ] = this;
    },
    init: function( width, height ) {
        engine.lights.DirectionalLight.prototype = new engine.AbstractObject();
        engine.lights.SpotLight.prototype = new engine.AbstractObject();
        engine.Model.prototype = new engine.AbstractObject();
        engine.Instance.prototype = new engine.AbstractObject();
        //engine.Camera.prototype = new engine.abstractObject();
        
        var canvas = document.createElement( 'canvas' );
        canvas.width = width;
        canvas.height = height;
        engine.gl = canvas.getContext( 'experimental-webgl' );
        //Set the viewport size equal to the canvas size
        engine.gl.viewport( 0, 0, width, height );
        //Set the clear color to black
        engine.gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
        
        engine.gl.clearDepth( 1.0 );
        engine.gl.enable( engine.gl.DEPTH_TEST );
        engine.gl.depthFunc( engine.gl.LEQUAL );
        
        
        engine.cameraMatrix = mat4.create();
        mat4.identity( engine.cameraMatrix );
        
        engine.perspectiveMatrix = mat4.create();
        mat4.identity( engine.perspectiveMatrix );
        
        engine.combinedMatrix = mat4.create();
        mat4.identity( engine.combinedMatrix );
        
        engine.setPerspective( 60, width, height, 1, 1000 );
        
        var vReq = new XMLHttpRequest();
        vReq.open( 'GET', 'vertex.c', true );
        vReq.onreadystatechange = function() {
            if( vReq.readyState == 4 ) {
                var data = vReq.responseText;
                engine.loadShader( data, 'vertex' );
                if( engine.program == null ) { 
                    return;
                }
                var p;
                while( p = engine.pendingOperations.pop() ){
                    p();
                }
            }
        }
        vReq.send();
        
        var fReq = new XMLHttpRequest();
        fReq.open( 'GET', 'fragment.c', true );
        fReq.onreadystatechange = function() {
            if( fReq.readyState == 4 ) {
                var data = fReq.responseText;
                engine.loadShader( data, 'fragment' );
                if( engine.program == null ) { 
                    return;
                }
                var p;
                while( p = engine.pendingOperations.pop() ){
                    p();
                }
            }
        }
        fReq.send();
        
        return canvas;
    },
    loadShader: function( source, type ) {
        if( type == 'vertex' ) {
            var shader = engine.gl.createShader( engine.gl.VERTEX_SHADER );
            engine.gl.shaderSource( shader, source );
            engine.gl.compileShader( shader );
            engine.log( "Vertex Shader compile log:\n" + engine.gl.getShaderInfoLog( shader ) );
            engine.vertexShader = shader;
            engine.makeProgram();
        }
        if( type == 'fragment' ) {
            var shader = engine.gl.createShader( engine.gl.FRAGMENT_SHADER );
            engine.gl.shaderSource( shader, source );
            engine.gl.compileShader( shader );
            engine.log( "Fragment Shader compile log:\n" + engine.gl.getShaderInfoLog( shader ) );
            engine.fragmentShader = shader;
            engine.makeProgram();
        }
    },
    makeProgram: function() {
        if( engine.vertexShader == null || engine.fragmentShader == null ) {
            return;
        }
        //Create Shader Program. Attach Vertex and Fragment shaders. Link.
        var shaderProgram = engine.gl.createProgram();
        engine.gl.attachShader( shaderProgram, engine.vertexShader );
        engine.gl.attachShader( shaderProgram, engine.fragmentShader );
        engine.gl.linkProgram( shaderProgram );
        engine.log( "Program linking log:\n" + engine.gl.getProgramInfoLog( shaderProgram ) );
        //Use the program just created for rendering
        engine.gl.useProgram( shaderProgram );
        engine.program = shaderProgram;
    },
    setCamera: function( x, y, z, pitch, yaw, roll ) {
        mat4.identity( engine.cameraMatrix );
        mat4.rotateX( engine.cameraMatrix, pitch );
        mat4.rotateY( engine.cameraMatrix, yaw );
        mat4.rotateZ( engine.cameraMatrix, roll );
        mat4.translate( engine.cameraMatrix, [ x, y, z ] );
        mat4.multiply( engine.perspectiveMatrix, engine.cameraMatrix, engine.combinedMatrix );
    },
    setPerspective: function( fov, width, height, near, far ) {
        mat4.perspective( fov, width / height, near, far, engine.perspectiveMatrix );
        
        mat4.multiply( engine.perspectiveMatrix, engine.cameraMatrix, engine.combinedMatrix );
    },
    setPerspectivePlanes: function( left, right, bottom, top, near, far ) {
        mat4.frustrum( left, right, bottom, top, near, far, engine.perspectiveMatrix );
            
        mat4.multiply( engine.perspectiveMatrix, engine.cameraMatrix, engine.combinedMatrix );
    },
    setLight: function( lightObj ) {
        if( engine.program == null ) {
            engine.pendingOperations.push( function() {
                engine.setLight( lightObj );
            } );
            return;
        }
        var uniformLocation = engine.glOpt.getUniformLocation( "light.position" );
        engine.gl.uniform4fv( uniformLocation, lightObj.position );
        
        uniformLocation = engine.glOpt.getUniformLocation( "light.ambient_color" );
        engine.gl.uniform4fv( uniformLocation, lightObj.ambientColor );
        
        uniformLocation = engine.glOpt.getUniformLocation( "light.diffuse_color" );
        engine.gl.uniform4fv( uniformLocation, lightObj.diffuseColor );
        
        uniformLocation = engine.glOpt.getUniformLocation( "light.specular_color" );
        engine.gl.uniform4fv( uniformLocation, lightObj.specularColor );
        
        uniformLocation = engine.glOpt.getUniformLocation( "light.spot_direction" );
        engine.gl.uniform3fv( uniformLocation, lightObj.spotDirection );
        
        uniformLocation = engine.glOpt.getUniformLocation( "light.attenuation_factors" );
        engine.gl.uniform3fv( uniformLocation, lightObj.attenuationFactors );
        
        uniformLocation = engine.glOpt.getUniformLocation( "light.compute_distance_attenuation" );
        engine.gl.uniform1i( uniformLocation, lightObj.computeDistanceAttenuation );
        
        uniformLocation = engine.glOpt.getUniformLocation( "light.spot_exponent" );
        engine.gl.uniform1f( uniformLocation, lightObj.spotExponent );
        
        uniformLocation = engine.glOpt.getUniformLocation( "light.spot_cutoff_angle" );
        engine.gl.uniform1f( uniformLocation, lightObj.spotCutoffAngle );
        
    },
    setMaterial: function( materialObj ) {
        if( engine.program == null ) {
            engine.pendingOperations.push( function() {
                engine.setMaterial( materialObj );
            } );
            return;
        }
        
        var uniformLocation = engine.glOpt.getUniformLocation( "material.ambient_color" );
        engine.gl.uniform4fv( uniformLocation, materialObj.ambientColor );
        
        uniformLocation = engine.glOpt.getUniformLocation( "material.diffuse_color" );
        engine.gl.uniform4fv( uniformLocation, materialObj.diffuseColor );
        
        uniformLocation = engine.glOpt.getUniformLocation( "material.specular_color" );
        engine.gl.uniform4fv( uniformLocation, materialObj.specularColor );
        
        uniformLocation = engine.glOpt.getUniformLocation( "material.specular_exponent" );
        engine.gl.uniform1f( uniformLocation, materialObj.specularExponent );
        
    },
    draw: function() {
        if( engine.program == null ) {
            return;
        }
        //Clear the screen
        engine.gl.clear( engine.gl.COLOR_BUFFER_BIT | engine.gl.DEPTH_BUFFER_BIT );
        var attrLocation
        
        //Combined Matrix. Camera + Perspective. Same for all elements
        var matLocation = engine.glOpt.getUniformLocation( "combined" );
        engine.gl.uniformMatrix4fv( matLocation, false, engine.combinedMatrix );
        
        var pMatrix = mat4.create();//, mMatrix;
        var instance;
        for( instance in engine.world ) {
            if( !engine.world[ instance ].visible ) {
                continue;
            }
            mat4.multiply( engine.world[ instance ].cachedMatrix, engine.world[ instance ].model.cachedMatrix, pMatrix );
            //iMatrix = engine.world[ instance ].cachedMatrix;
            
            attrLocation = engine.glOpt.getAttribLocation( "vPosition" );
            engine.gl.bindBuffer( engine.gl.ARRAY_BUFFER, engine.world[ instance ].model.vBuffer );
            engine.gl.vertexAttribPointer( attrLocation, 3, engine.gl.FLOAT, false, 0, engine.world[ instance ].model.vBuffer );
            engine.gl.enableVertexAttribArray( attrLocation );
            
            attrLocation = engine.glOpt.getAttribLocation( "vNormal" );
            engine.gl.bindBuffer( engine.gl.ARRAY_BUFFER, engine.world[ instance ].model.nBuffer );
            engine.gl.vertexAttribPointer( attrLocation, 3, engine.gl.FLOAT, false, 0, engine.world[ instance ].model.nBuffer );
            engine.gl.enableVertexAttribArray( attrLocation );
            
            //Model's matrix multiplied by Model instance's matrix
            matLocation = engine.glOpt.getUniformLocation( "pmatrix" );
            engine.gl.uniformMatrix4fv( matLocation, false, pMatrix );            
            
            /*Model instance's matrix
            matLocation = engine.glOpt.getUniformLocation( "iMatrix" );
            engine.gl.uniformMatrix4fv( matLocation, false, new Float32Array( iMatrix.flatten() ) );*/
            
            engine.setMaterial( engine.world[ instance ].material );
            
            engine.gl.bindBuffer( engine.gl.ELEMENT_ARRAY_BUFFER, engine.world[ instance ].model.iBuffer );
            engine.gl.drawElements( engine.gl.TRIANGLES, engine.world[ instance ].model.iBuffer.length, engine.gl.UNSIGNED_SHORT, 0 );
        }
    },
    glOpt: {
        uniformCache: {},
        attributeCache: {},
        getUniformLocation: function( uniform ) {
            if( typeof( engine.glOpt.uniformCache[ uniform ] ) !== 'undefined' ) {
                return engine.glOpt.uniformCache[ uniform ];
            }
            return engine.glOpt.uniformCache[ uniform ] = engine.gl.getUniformLocation( engine.program, uniform );
        },
        getAttribLocation: function( attribute ) {
            if( typeof( engine.glOpt.attributeCache[ attribute ] ) !== 'undefined' ){
                return engine.glOpt.attributeCache[ attribute ];
            }
            return engine.glOpt.attributeCache[ attribute ] = engine.gl.getAttribLocation( engine.program, attribute );
        }
    },
    utils: {
        makeSphere: function ( radius, precision ) {
            precision = precision || 0.1;
            var model = {
                vertices: [],
                normals: [],
                indices: []
            };
            
            for ( var p = 0; p < 1; p += precision ) {
                for ( var t = 0; t < 1; t += precision ) {
                    var phi = p * Math.PI;
                    var theta = t * Math.PI * 2;
                    var a = [
                        Math.sin( phi ) * Math.cos( theta ),
                        Math.sin( phi ) * Math.sin( theta ),
                        Math.cos( phi )
                    ];
                    var b = [
                        Math.sin( phi ) * Math.cos( theta + 2 * Math.PI * precision ),
                        Math.sin( phi ) * Math.sin( theta + 2 * Math.PI * precision ),
                        Math.cos( phi )
                    ];
                    var c = [
                        Math.sin( phi + Math.PI * precision ) * Math.cos( theta + 2 * Math.PI * precision ),
                        Math.sin( phi + Math.PI * precision ) * Math.sin( theta + 2 * Math.PI * precision ),
                        Math.cos( phi + Math.PI * precision )
                    ];
                    var d = [
                        Math.sin( phi + Math.PI * precision ) * Math.cos( theta ),
                        Math.sin( phi + Math.PI * precision ) * Math.sin( theta ),
                        Math.cos( phi + Math.PI * precision )
                    ];
                    
                    l = model.vertices.length / 3;
                    
                    model.vertices.push(
                        radius * a[ 0 ], radius * a[ 1 ], radius * a[ 2 ],
                        radius * b[ 0 ], radius * b[ 1 ], radius * b[ 2 ],
                        radius * c[ 0 ], radius * c[ 1 ], radius * c[ 2 ],
                        radius * d[ 0 ], radius * d[ 1 ], radius * d[ 2 ]
                    );
                    
                    model.normals.push(
                        a[ 0 ], a[ 1 ], a[ 2 ],
                        b[ 0 ], b[ 1 ], b[ 2 ],
                        c[ 0 ], c[ 1 ], c[ 2 ],
                        d[ 0 ], d[ 1 ], d[ 2 ]
                    );
                    
                    model.indices.push(
                        l + 0, l + 1, l + 2
                    );
                    
                    if ( p <= 1 - precision ) {
                        model.indices.push(
                            l + 0, l + 2, l + 3
                        );
                    }
                }
            }

            return model;
        },
        genNormals: function( points, indices ) {
            var a, b, c;
            var ax, ay, az;
            var bx, by, bz;
            var cx, cy, cz;
            var AB, BC, N;
            var normals = [];

            // default normal
            for ( var i = 0; i < points.length; ++i ) {
                normals[ i ] = [];
            }

            for ( var triangle = 0; triangle < indices.length / 3; ++triangle ) {
                a = indices[ triangle * 3 + 0 ];
                b = indices[ triangle * 3 + 1 ];
                c = indices[ triangle * 3 + 2 ];
                ax = points[ a * 3 + 0 ];
                ay = points[ a * 3 + 1 ];
                az = points[ a * 3 + 2 ];
                bx = points[ b * 3 + 0 ];
                by = points[ b * 3 + 1 ];
                bz = points[ b * 3 + 2 ];
                cx = points[ c * 3 + 0 ];
                cy = points[ c * 3 + 1 ];
                cz = points[ c * 3 + 2 ];

                AB = vec3.create( [ bx - ax, by - ay, bz - az ] );
                BC = vec3.create( [ cx - bx, cy - by, cz - bz ] );
                N = vec3.normalize( vec3.cross( AB, BC ) );

                normals[ a ].push( N );
                normals[ b ].push( N );
                normals[ c ].push( N );
            }

            var fNormals = [];
            for ( var j, i = 0; i < normals.length; ++i ) {
                if ( normals[ i ].length == 0 ) {
                    fNormals.push( 0, 0, 1 );
                    continue;
                }
                if ( normals[ i ].length == 1 ) {
                    fNormals.push( normals[ i ][ 0 ][ 0 ], normals[ i ][ 0 ][ 1 ], normals[ i ][ 0 ][ 2 ] );
                    continue;
                }
                for ( j = 1; j < normals[ i ].length; ++j ) {
                    vec3.add( normals[ i ][ 0 ], normals[ i ][ j ] );
                }
                vec3.normalize( normals[ i ][ 0 ] );
                fNormals.push( normals[ i ][ 0 ][ 0 ], normals[ i ][ 0 ][ 1 ], normals[ i ][ 0 ][ 2 ] );
            }

            return fNormals;
        },
        makeParallelepiped: function ( x1, y1, z1, x2, y2, z2 ) {
            var vertices = [
                x1, y1, z1,
                x1, y1, z2,
                x1, y2, z1,

                x1, y1, z2,
                x1, y2, z2,
                x1, y2, z1,

                x2, y2, z1,
                x2, y1, z2,
                x2, y1, z1,

                x2, y2, z1,
                x2, y2, z2,
                x2, y1, z2,

                x1, y1, z1,
                x2, y1, z2,
                x1, y1, z2,

                x1, y1, z1,
                x2, y1, z1,
                x2, y1, z2,

                x1, y2, z1,
                x1, y2, z2,
                x2, y2, z2,

                x1, y2, z1,
                x2, y2, z2,
                x2, y2, z1,
                
                x1, y2, z1,
                x2, y1, z1,
                x1, y1, z1,
                
                x1, y2, z1,
                x2, y2, z1,
                x2, y1, z1,
                
                x1, y1, z2,
                x2, y1, z2,
                x2, y2, z2,

                x1, y2, z2,
                x1, y1, z2,
                x2, y2, z2
            ];
            var indices = [];
            for ( var i = 0; i < vertices.length / 3; ++i ) {
                indices.push( i );
            }
            return {
                vertices: vertices,
                indices:  indices
            };
        }
    },
    subdivide: function ( model ) {
        var facePoints = [];
        var edgePoints = [];
        var vertexPoints = [];
        var newVertices = [];
        var newIndices = [];
        var vertices = model.vertices;
        var indices = model.indices;
        
        var a, b, c;
        var facePoint;
        
        // calculate face points
        for ( var i = 0; i < indices.length / 3; ++i ) {
            a = indices[ 3 * i + 0 ];
            b = indices[ 3 * i + 1 ];
            c = indices[ 3 * i + 2 ];
            facePoint = [
                ( vertices[ 3 * a + 0 ] + vertices[ 3 * b + 0 ] + vertices[ 3 * c + 0 ] ) / 3,
                ( vertices[ 3 * a + 1 ] + vertices[ 3 * b + 1 ] + vertices[ 3 * c + 1 ] ) / 3,
                ( vertices[ 3 * a + 2 ] + vertices[ 3 * b + 2 ] + vertices[ 3 * c + 2 ] ) / 3
            ];
            facePoints[ i ] = facePoint;
        }
        
        var edges = {};
        
        function pushEdge( side1, side2 ) {
            if ( typeof edges[ a + '.' + b ] == 'undefined' ) {
                edges[ a + '.' + b ] = [ i ];
            }
            else {
                edges[ a + '.' + b ].push( i );
            }
        }
        
        for ( var i = 0; i < indices.length / 3; ++i ) {
            a = indices[ 3 * i + 0 ];
            b = indices[ 3 * i + 1 ];
            c = indices[ 3 * i + 2 ];
            pushEdge( a, b, 3 * i );
            pushEdge( b, c, 3 * i );
            pushEdge( c, a, 3 * i );
        }
        
        // calculate edge points
        
        // calculate new vertex points
        // create new vertices and faces
        
        return { vertices: vertices, indices: indices };
    }
}
