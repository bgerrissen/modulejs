require.plugin("grab", function (record, param) {

    var list = param.replace(/\s*/g, "").split(",")
    , i = list.length;

    require.listen("loaded", function (e) {

        if (e.record === record) {

            e.deafen();

            if (i === 1) {

                record.module = window[ list[ 0 ] ];

            } else if (i > 1) {

                record.module = {};

                while (i--) {

                    record.module[ list[ i ] ] = window[ list[ i ] ];

                }

            }

        }

    });

});

require.plugin("clean", function (record, param) {

    var list = param.replace(/\s*/g, "").split(",")
            , i = list.length
            , data = {};

    require.listen("complete", function (e) {

        if (e.record === record) {

            e.deafen();

            while (i--) {

                this[ list[ i ] ] = null;
                delete this[ list[ i ] ];

            }

        }

    });

});

require.plugin("final", function (record, param) {

    record.context = "";
    record.extension = "";

});