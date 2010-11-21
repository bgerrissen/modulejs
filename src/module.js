( function ( global , doc ) {

    /** Constants
     *
     */
    var FUNCTION = "function"
    , ARRAY = "array"
    , STRING = "string"
    , OBJECT = "object"
    , STATUS_FAILED = -1
    , STATUS_NEW = 0
    , STATUS_LOADING = 1
    , STATUS_PENDING = 2
    , STATUS_COMPLETE = 3
    , EVENT_COMPLETE = "complete"
    , EVENT_LOADING = "loading"
    , EVENT_LOADED = "loaded"
    , EVENT_ERROR = "error"

    , config = {}
    , setConfig = function ( settings ) {

        mixin( config , settings , true );

    }

    /** Utilities
     *
     */
    , toTypeString = Object.prototype.toString

    /** @method type( object:Object )
     *
     */
    , type = function ( obj ) {

        return toTypeString.call( obj ).replace( /\[object\s|\]/g , "" ).toLowerCase();

    }

    /** @method mixin ( receiver:Object , provider:Object , override:Boolean )
     *
     *  @return receiver:Object
     */
    , mixin = function ( receiver , provider , override ) {

        var property;

        for ( property in provider ) {

            if ( provider.hasOwnProperty( property) && ( !receiver[ property] || override ) ) {

                receiver[ property ] = provider[ property ];

            }

        }

        return receiver;

    }

    /** Event implementation
     *
     */
    , eventRegistry = {}
    , listen = function ( eventType , listener ) {

        if ( !eventRegistry[ eventType ] ) {

            eventRegistry[ eventType ] = [];

        }

        eventRegistry[ eventType ].push( listener );

    }
    , deafen = function( eventType , listener ) {

        var list = eventRegistry[ eventType ]
        , i;

        if ( list ) {

            i = list.length;

            while ( i && i-- ) {

                if ( list[ i ] === listener ) {

                    list.splice( i , 1 );

                }

            }

        }

    }
    , notify = function ( eventType , data ) {

        var eventObject
        , list = eventRegistry[ eventType ]
        , i
        , len
        , listener;

        if ( list && list.length ) {

            list = [].concat( list );

            eventObject = mixin( {
                type : eventType,
                deafen : function () {

                    deafen( eventType , eventObject.currentListener );

                }
            } , data , false );

            for ( i = 0 , len = list.length ; i < len ; i++ ) {

                listener = list[ i ];

                eventObject.currentListener = listener;

                try {

                    if ( typeof listener === FUNCTION ) {

                        listener( eventObject );

                    } else if ( listener.handleEvent ) {

                        listener.handleEvent( eventObject );

                    }

                } catch ( e ) {

                    notify( EVENT_ERROR , {
                        message : e
                    } );

                }

            }

        }

    }

    /** Expression parser
     *
     */
    , parseRegExp = /(?:([\w\d\-_]+)\s*(?:\(([^\)]*)\))?)\s*$/
    , parse = function ( expr ) {

        var exprType = type( expr )
        , result
        , processors;

        if ( exprType === STRING ) {

            processors = expr.replace( /^\s*|\s*$/g , "" ).replace( /\s*([\(\)!,])\s*/g , "$1" ).split( "!" );
            result = {
                path : processors.shift(),
                processors : processors
            }

        } else {

            result = expr;

        }

        formatProcessors( result.processors );

        return result;

    }
    , formatProcessors = function ( list ) {

        var i = list.length
        , bit;

        while ( i && i-- ) {

            bit = list[ i ];

            if ( type( bit ) != STRING ) {

                continue;

            }

            bit = bit.match( parseRegExp );

            if ( bit !== null &&  bit[ 1 ] ) {

                list[ i ] = {
                    name : bit[ 1 ],
                    param : bit[ 2 ]
                };

            }

        }

    }

    /** Processor implementation
     *
     */
    , processorRegistry = {}
    , initialiseProcessors = function ( record ) {

        var processors = record.processors
        , len = processors.length
        , i = 0
        , processor;

        for ( i ; i < len ; i++ ) {

            processor = processors[ i ];

            if ( !processorRegistry[ processor.name ] ) {

                continue;

            }

            processorRegistry[ processor.name ].call( record , record , processor.param );

        }

    }
    , setProcessor = function ( name , processor ) {

        if ( type( name ) == STRING && type( processor ) == FUNCTION ) {

            processorRegistry[ name ] = processor;

        }

    }

    /** Path resolving
     *
     */
    , forced = {}
    , contexts = {}
    , force = function ( originalPath , forcedPath ) {

        forced[ parse( originalPath ).path ] = parse( forcedPath );

    }
    , finalPath = function ( expr ) {

        var hash = {}
        , path = parse( expr ).path
        , newExp = expr;

        while ( forced[ path ] ) {

            if ( hash[ path ] ) {

                notify( EVENT_ERROR , {
                    message : "CircularReferenceError: forced path '" + expr + "' lead to a cirular reference, operation cancelled."
                } );

                return expr;

            }

            newExp = forced[ path ];
            path = parse( newExp ).path;
            hash[ path ] = true;

        }

        return newExp;

    }
    , map = function ( prefix /* , context */ ) {

        var objType = type( prefix )
        , context = arguments[ 1 ]
        , key;

        if ( objType === STRING ) {

            prefix = new RegExp( "^" + prefix );
            contexts[ context ] = prefix;

        } else if ( objType === OBJECT ) {

            for( key in prefix ) {

                map( key , prefix[key] );

            }

        }

    }
    , getContext = function ( path ) {

        for ( var context in contexts ) {

            if ( contexts.hasOwnProperty( context ) && contexts[ context ].test( path ) ) {

                return context;

            }

        }

        return config.defaultContext;

    }


    /** Module registry
     *
     */
    , moduleRegistry = {}
    , insertStack = []

    /** @method getRecord( expression:* )
     *  @param expression:String    expression string
     *  @param expression:Object    parsed expression result
     *
     *      Returns either an existing record or result of setRecord()
     *
     *  @return record:Object
     */
    , getRecord = function ( expr ) {

        expr = parse( expr );

        if ( !expr.path ) {

            // todo: notify error

            return null;

        }

        if ( moduleRegistry[ expr.path ] ) {

            return moduleRegistry[ expr.path ];

        }

        return setRecord( expr );

    }
    , format = function ( list ) {

        var i = list.length;

        while ( i && i-- ) {
            
            list[ i ] = getRecord( finalPath( list[ i ] ) );

        }

        return list;

    }
    , filter = function ( list ) {

        var i = list.length;

        while ( i && i-- ) {

            if ( list[ i ].status == STATUS_COMPLETE ) {

                list.splice( i , 1 );

            }

        }

        return list;

    }

    /** @method setRecord( expression:* )
     *  @param expression:String    expression string
     *  @param expression:Object    parsed expression result
     *
     *      Creates and stores a new record from parsed expression result.
     *      Initializes processors if any.
     *
     *  @return record:Object
     */
    , setRecord = function ( expr ) {

        expr = parse( expr );

        moduleRegistry[ expr.path ] = mixin( expr , {

            status : STATUS_NEW,
            context : getContext( expr.path ),
            extention : ".js",
            needs : [],
            fetch : []

        } , true );

        if ( expr.processors.length ) {

            initialiseProcessors( expr );

        }

        return expr;

    }

    /** @method resolve( eventObject:Object )
     *
     *
     *  @return void;
     */
    , resolve = function ( loadedPath ) {

        var data = insertStack.pop()
        , record
        , path;

        if ( !data ) {

            // todo: notify error
            return;

        }

        path = data.path || loadedPath;
        record = mixin( getRecord( path ) , data , true  );

        if ( record.status > STATUS_PENDING ) {

            // todo: notify error
            return;

        }



        if ( record.fetch.length ) {

            record.status = STATUS_PENDING;

            listen( EVENT_COMPLETE , function ( e ) {

                filter( record.fetch );

                if ( !record.fetch.length ) {

                    e.deafen();
                    complete( record );

                }

            } );

            load( record.fetch );

        } else {

            complete( record );

        }

        if ( insertStack.length ) {

            resolve( loadedPath );

        }

    }

    , cleanRecord = function ( record ) {

        if ( !config.debug ) {

            delete record.needs;
            delete record.fetch;
            delete record.context;
            delete record.extention;
            delete record.factory;
            delete record.node;
            
        }

    }
    /**
     *
     */
    , complete = function ( record ) {

        if ( !record ) {

            return;

        }

        if ( type( record.factory ) == FUNCTION ) {

            try {

                record.module = record.factory.apply( null , getImports( record.needs ) );

            } catch ( e ) {

                notify( EVENT_ERROR , {
                    message : e
                } );

            }

        }

        record.status = STATUS_COMPLETE;

        cleanRecord( record );

        notify( EVENT_COMPLETE , {
            record : record
        } );

    }
    /**
     *
     */
     , getImports = function ( list ) {

        var i = list.length
        , imports = [];

        while ( i && i-- ) {

            imports = [].concat( imports , list[ i ].module );

        }

        return imports;

    }

    /**Script loader
     *
     */
    , scripts = doc.getElementsByTagName( "script" )
    , scriptNode = doc.createElement( "script" )
    , scriptAnchor = scripts[ scripts.length - 1 ]
    , defaultContext = scriptAnchor.src.replace( /[^\\\/]*\.js[^\\\/]?$/ , "" )
    , load = function ( list ) {

        if ( list && list.length ) {

            scriptAnchor.parentNode.insertBefore(
                appendNodes( list , doc.createDocumentFragment() ) ,
                scriptAnchor
            );

        }

    }
    , appendNodes = function ( list , fragment ) {

        var i = list.length
        , node
        , record;

        while ( i && i-- ) {

            record = list[ i ];

            if ( record.status == STATUS_NEW ) {

                node = setNode( record , fragment );

            }

            record.status = STATUS_LOADING;

        }

        node = null;

        return fragment;

    }
    , startTimeout = function( record ) {

        record.timeoutID = setTimeout( function () {

            fail( record );

        } , config.scriptTimeout );

    }
    , fail = function( record ) {

        record.status = STATUS_FAILED;

        notify( EVENT_ERROR , {
            message : "LoadError: Failed to load resource '"+record.path+"' at '"+record.source+"'"
        } );

    }
    , setNode = function ( record , fragment ) {

        var node = record.node = scriptNode.cloneNode( false );

        node.src = record.context + record.path + record.extention;

        fragment.appendChild( node );

        var listener = function () {

            var node = record.node;

            if ( !node.readyState || /complete|loaded/i.test( node.readyState ) ) {

                if ( !config.debug ) {

                    node.parentNode.removeChild( node );

                }

                record.node = node.onreadystatechange = node.onload = null;

                notify( EVENT_LOADED , {
                    record : record
                } );

                clearTimeout( record.timeoutID );

                resolve( record.path );

            }

            node = null;

        };

        node.onreadystatechange = node.onload = listener;

        node = null;

        startTimeout( record );

        notify( EVENT_LOADING , {
            record : record
        } );

    }

    /** @method formatDefineArguments( arguments:Object )
     *
     *      Grabs required parameters from arguments object and returns
     *      the formatted "data" object.
     *
     *  @return data:Object
     */
    , formatDefineArguments = function ( args ) {

        var data = {}
        , i = args.length
        , obj
        , objType;

        while ( i && i-- ) {

            obj = args[ i ];
            objType = type( obj );

            if ( objType == STRING ) {

                data.path = obj;

            } else if ( objType == ARRAY ) {

                data.needs = obj;

            } else if ( objType == FUNCTION ) {

                data.factory = obj;

            } else if ( objType == OBJECT ) {

                data.module = obj;

            }

        }

        format( data.needs || [] );
        data.fetch = filter( [].concat( data.needs || [] ) );

        return data;

    }

    , require = function ( needs , callback ) {

        if ( type( needs ) != ARRAY || type( callback ) != FUNCTION ) {

            // todo: notify error
            return;

        }

        var fetch = filter( [].concat( format( needs ) ) );

        listen( EVENT_COMPLETE , function ( e ) {
            
            filter( fetch );

            if ( !fetch.length ) {

                e.deafen();
                callback.apply( null , getImports( needs  ) );

            }

        } );

        load( fetch );

    }

    , define = function ( /* [ [ strictPath:String , ] needs:Array , ] factory:* */ ) {

        var data = formatDefineArguments( arguments );

        insertStack.push( data );

    };

    setConfig( {
        scriptTimeout : 10000,
        debug : false,
        defaultContext : defaultContext
    } );

    require._insertStack = insertStack;

    require.plugin = setProcessor;

    require.config = setConfig;
    require.force = force;
    require.map = map;

    require.listen = listen;
    require.deafen = deafen;
    require.notify = notify;

    global.define = define;
    global.require = require;


} ( window , document ) );