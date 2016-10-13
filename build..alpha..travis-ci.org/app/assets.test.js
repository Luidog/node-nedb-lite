/* istanbul instrument in package nedb-lite */
/*jslint
    bitwise: true,
    browser: true,
    maxerr: 8,
    maxlen: 96,
    node: true,
    nomen: true,
    regexp: true,
    stupid: true
*/
(function () {
    'use strict';
    var local;



    // run shared js-env code - pre-init
    (function () {
        // init Error.stackTraceLimit
        Error.stackTraceLimit = 16;
        // init local
        local = {};
        // init modeJs
        local.modeJs = (function () {
            try {
                return typeof navigator.userAgent === 'string' &&
                    typeof document.querySelector('body') === 'object' &&
                    typeof XMLHttpRequest.prototype.open === 'function' &&
                    'browser';
            } catch (errorCaughtBrowser) {
                return module.exports &&
                    typeof process.versions.node === 'string' &&
                    typeof require('http').createServer === 'function' &&
                    'node';
            }
        }());
        switch (local.modeJs) {
        // re-init local from window.local
        case 'browser':
            local = window.local;
            local.utility2 = window.utility2;
            break;
        // re-init local from example.js
        case 'node':
            local = (module.utility2 || require('utility2')).requireExampleJsFromReadme({
                __dirname: __dirname,
                module: module
            });
            local.nedb = local[local.utility2.envDict.npm_package_name];
            /* istanbul ignore next */
            if (module.isRollup) {
                local = module;
                return;
            }
            break;
        }
        // require modules
        local.utility2.nedb = local.utility2.local.nedb = local.nedb;
        [
            'assert',
            'jsonStringifyOrdered',
            'onErrorDefault',
            'onNext'
        ].forEach(function (key) {
            local.utility2[key] = local.nedb[key];
            [
                'testCase_' + key + '_default',
                'testCase_' + key + '_error',
                'testCase_' + key + 'Xxx_default'
            ].forEach(function (key2) {
                if (local.utility2.testCaseDict[key2]) {
                    local[key2] = local.utility2.testCaseDict[key2];
                }
            });
        });
    }());



    // run shared js-env code - function
    (function () {
        local.crudOptionsSetDefault = function (options, defaults) {
        /*
         * this function will set default-values for options
         */
            options = local.utility2.objectSetDefault(options, defaults);
            options.dbTable = local.nedb.dbTableDict.TestCrud;
            // shallow-copy options
            return local.utility2.objectSetDefault({}, options);
        };

        local.testCase_consoleLog_default = function (options, onError) {
        /*
         * this function will test consoleLog's default handling-behavior
         */
            options = {};
            options.data = null;
            console.log(options.data);
            options.data = '\n';
            console.log(options.data);
            onError();
        };

        local.testCase_dbExport_default = function (options, onError) {
        /*
         * this function will test dbExport's default handling-behavior
         */
            var onParallel;
            onParallel = local.utility2.onParallel(onError);
            onParallel.counter += 1;
            options = {};
            options.name = 'testCase_dbExport_default';
            options.dbTable = local.nedb.dbTableCreate(options);
            onParallel.counter += 1;
            local.nedb.dbIndexCreate(options, {
                fieldName: 'id',
                unique: true
            }, onParallel);
            options.data = local.nedb.dbExport();
            // validate data
            local.utility2.assert(options.data.indexOf('"testCase_dbExport_default"\n' +
                '{"$$indexCreated":{"fieldName":"createdAt","unique":false,"sparse":false}}\n' +
                '{"$$indexCreated":{"fieldName":"updatedAt","unique":false,"sparse":false}}\n' +
                '{"$$indexCreated":{"fieldName":"id","unique":true,"sparse":false}}')
                >= 0, options.data);
            onParallel();
        };

        local.testCase_dbImport_default = function (options, onError) {
        /*
         * this function will test dbImport's default handling-behavior
         */
            // jslint-hack
            local.utility2.nop(options);
            local.nedb.dbImport('"testCase_dbImport_default"\n{"id":0}', onError);
        };

        local.testCase_dbStorageXxx_misc = function (options, onError) {
        /*
         * this function will test dbStorageXxx's misc handling-behavior
         */
            var onParallel;
            // jslint-hack
            local.utility2.nop(options);
            onParallel = local.utility2.onParallel(onError);
            onParallel.counter += 1;
            onParallel.counter += 1;
            // test dbStorageInit's re-init handling-behavior
            local.nedb.dbStorageInit();
            // test dbStorageKey's handling-behavior
            local.nedb.dbStorageKeys(function () {
                local.utility2.tryCatchOnError(function () {
                    // test dbStorageDefer's done handling-behavior
                    local.nedb._debugDbStorageRequest.onerror(local.utility2.errorDefault);
                }, local.utility2.nop);
                onParallel();
            });
            onParallel.counter += 1;
            // test dbStorageLength's handling-behavior
            local.nedb.dbStorageLength(onParallel);
            onParallel();
        };

        local.testCase_dbTableCountMany_default = function (options, onError) {
        /*
         * this function will test dbTableCountMany's default handling-behavior
         */
            options = local.crudOptionsSetDefault(options, {
                id: 'testCase_dbTableCountMany_default'
            });
            local.utility2.onNext(options, function (error, data) {
                switch (options.modeNext) {
                case 1:
                    options.dbTable.countMany({ query: { id: options.id } }, options.onNext);
                    break;
                case 2:
                    // validate data
                    local.utility2.assertJsonEqual(data, 1);
                    options.onNext();
                    break;
                default:
                    onError(error);
                }
            });
            options.modeNext = 0;
            options.onNext();
        };

        local.testCase_dbTableCreate_default = function (options, onError) {
        /*
         * this function will test dbTableCreate's default handling-behavior
         */
            options = {};
            options.name = 'testCase_dbTableCreate_default';
            options.dbTable = local.nedb.dbTableCreate(options);
            // test re-create handling-behavior
            options.dbTable = local.nedb.dbTableCreate(options);
            // test reset handling-behavior
            options.reset = true;
            options.dbTable = local.nedb.dbTableCreate(options);
            onError();
        };

        local.testCase_dbTableDrop_default = function (options, onError) {
        /*
         * this function will test dbTableDrop's default handling-behavior
         */
            var onParallel;
            onParallel = local.utility2.onParallel(onError);
            onParallel.counter += 1;
            options = {};
            options.name = 'testCase_dbTableDrop_default';
            options.dbTable = local.nedb.dbTableCreate(options);
            onParallel.counter += 1;
            options.dbTable.drop(onParallel);
            // test multiple-drop handling-behavior
            onParallel.counter += 1;
            options.dbTable.drop(onParallel);
            onParallel();
        };

        local.testCase_dbTableFindOne_default = function (options, onError) {
        /*
         * this function will test dbTableFindOne's default handling-behavior
         */
            options = local.crudOptionsSetDefault(options, {
                id: 'testCase_dbTableFindOne_default'
            });
            local.utility2.onNext(options, function (error, data) {
                switch (options.modeNext) {
                case 1:
                    local.nedb.dbTableFindOne(options.dbTable, {
                        query: { id: options.id }
                    }, options.onNext);
                    break;
                case 2:
                    // validate data
                    local.utility2.assertJsonEqual(data && data.id, options.id);
                    options.onNext();
                    break;
                default:
                    onError(error);
                }
            });
            options.modeNext = 0;
            options.onNext();
        };

        local.testCase_dbTableRemoveOne_default = function (options, onError) {
        /*
         * this function will test dbTableRemoveOne's default handling-behavior
         */
            options = local.crudOptionsSetDefault(options, {
                id: 'testCase_dbTableRemoveOne_default'
            });
            local.utility2.onNext(options, function (error, data) {
                switch (options.modeNext) {
                case 1:
                    local.testCase_dbTableFindOne_default(options, options.onNext);
                    break;
                case 2:
                    local.nedb.dbTableRemoveOne(options.dbTable, {
                        query: { id: options.id }
                    }, options.onNext);
                    break;
                case 3:
                    local.nedb.dbTableFindOne(options.dbTable, {
                        query: { id: options.id }
                    }, options.onNext);
                    break;
                case 4:
                    // validate data was removed
                    local.utility2.assertJsonEqual(data, null);
                    options.onNext();
                    break;
                default:
                    onError(error, data);
                }
            });
            options.modeNext = 0;
            options.onNext();
        };

        local.testCase_queryCompare_default = function (options, onError) {
        /*
         * this function will test queryCompare's default handling-behavior
         */
            options = [
                // $elemMatch
                ['$elemMatch', undefined, undefined, false],
                ['$elemMatch', [undefined], undefined, false],
                // $eq
                ['$eq', undefined, undefined, true],
                ['$eq', null, undefined, true],
                ['$eq', NaN, NaN, true],
                // $exists
                ['$exists', false, undefined, true],
                ['$exists', true, undefined, false],
                // $gt
                ['$gt', undefined, undefined, false],
                ['$gt', undefined, undefined, false],
                // $gte
                ['$gte', undefined, undefined, true],
                // $in
                ['$in', undefined, undefined, false],
                ['$in', undefined, [undefined], true],
                // $lt
                ['$lt', undefined, undefined, false],
                // $lte
                ['$lte', undefined, undefined, true],
                // $ne
                ['$ne', undefined, undefined, false],
                // $nin
                ['$nin', undefined, undefined, false],
                ['$nin', undefined, [undefined], false],
                // $regex
                ['$regex', undefined, undefined, false],
                // $size
                ['$size', undefined, undefined, false],
                ['$size', [undefined], undefined, false],
                [undefined, undefined, undefined, false]
            ];
            options.forEach(function (element) {
                local.utility2.assertJsonEqual(
                    [
                        element[0],
                        element[1],
                        element[2],
                        local.nedb.queryCompare(element[0], element[1], element[2])
                    ],
                    element
                );
            });
            onError();
        };

        local.testCase_sortCompare_default = function (options, onError) {
        /*
         * this function will test sortCompare's default handling-behavior
         */
            options = {};
            options.data = [undefined, null, false, 0, '', true, 1, 'a', local.utility2.nop];
            local.utility2.assertJsonEqual(
                options.data.sort(local.nedb.sortCompare),
                [null, false, true, 0, 1, '', 'a', null, null]
            );
            local.utility2.assertJsonEqual(
                options.data.reverse().sort(local.nedb.sortCompare),
                [null, false, true, 0, 1, '', 'a', null, null]
            );
            onError();
        };
    }());
    switch (local.modeJs) {



    // run node js-env code - function
    case 'node':
        local.testCase_build_app = function (options, onError) {
        /*
         * this function will test build's app handling-behavior
         */
            var onParallel;
            onParallel = local.utility2.onParallel(onError);
            onParallel.counter += 1;
            options = {};
            options = [{
                file: '/assets.app.js',
                url: '/assets.app.js'
            }, {
                file: '/assets.app.min.js',
                url: '/assets.app.min.js'
            }, {
                file: '/assets.example.js',
                url: '/assets.example.js'
            }, {
                file: '/assets.' + local.utility2.envDict.npm_package_name + '.css',
                url: '/assets.' + local.utility2.envDict.npm_package_name + '.css'
            }, {
                file: '/assets.' + local.utility2.envDict.npm_package_name + '.js',
                url: '/assets.' + local.utility2.envDict.npm_package_name + '.js'
            }, {
                file: '/assets.' + local.utility2.envDict.npm_package_name + '.min.js',
                transform: function (data) {
                    return local.utility2.uglifyIfProduction(
                        local.utility2.bufferToString(data)
                    );
                },
                url: '/assets.' + local.utility2.envDict.npm_package_name + '.js'
            }, {
                file: '/assets.test.js',
                url: '/assets.test.js'
            }, {
                file: '/assets.utility2.rollup.js',
                url: '/assets.utility2.rollup.js'
            }, {
                file: '/index.html',
                url: '/index.html'
            }, {
                file: '/jsonp.utility2.stateInit',
                url: '/jsonp.utility2.stateInit?callback=window.utility2.stateInit'
            }];
            options.forEach(function (options) {
                onParallel.counter += 1;
                local.utility2.ajax(options, function (error, xhr) {
                    onParallel.counter += 1;
                    // validate no error occurred
                    onParallel(error);
                    switch (local.path.extname(options.file)) {
                    case '.css':
                    case '.js':
                    case '.json':
                        local.utility2.jslintAndPrintConditional(
                            xhr.responseText,
                            options.file
                        );
                        // validate no error occurred
                        local.utility2.assert(
                            !local.utility2.jslint.errorText,
                            local.utility2.jslint.errorText
                        );
                        break;
                    }
                    local.utility2.fsWriteFileWithMkdirp(
                        local.utility2.envDict.npm_config_dir_build + '/app' + options.file,
                        (options.transform || local.utility2.echo)(xhr.response),
                        onParallel
                    );
                });
            });
            onParallel();
        };

        local.testCase_build_doc = function (options, onError) {
        /*
         * this function will test build's doc handling-behavior
         */
            options = {};
            local.utility2.onNext(options, function (error) {
                switch (options.modeNext) {
                case 1:
                    options.moduleDict = {
                        'nedb-lite': {
                            exampleList: [],
                            exports: local.nedb
                        },
                        'nedb-lite.Index': {
                            exampleList: [],
                            exports: local.nedb.Index
                        },
                        'nedb-lite.Index.prototype': {
                            exampleList: [],
                            exports: local.nedb.Index.prototype
                        },
                        'nedb-lite.Persistence': {
                            exampleList: [],
                            exports: local.nedb.Persistence
                        },
                        'nedb-lite.Persistence.prototype': {
                            exampleList: [],
                            exports: local.nedb.Persistence.prototype
                        },
                        'nedb-lite._Table.prototype': {
                            exampleList: [],
                            exports: local.nedb._Table.prototype
                        }
                    };
                    Object.keys(options.moduleDict).forEach(function (key) {
                        options.moduleDict[key].example = [
                            'README.md',
                            'test.js',
                            'index.js'
                        ]
                            .concat(options.moduleDict[key].exampleList)
                            .map(function (file) {
                                return '\n\n\n\n\n\n\n\n' +
                                    local.fs.readFileSync(file, 'utf8') +
                                    '\n\n\n\n\n\n\n\n';
                            }).join('');
                    });
                    // create doc.api.html
                    local.utility2.fsWriteFileWithMkdirp(
                        local.utility2.envDict.npm_config_dir_build + '/doc.api.html',
                        local.utility2.docApiCreate(options),
                        options.onNext
                    );
                    break;
                case 2:
                    local.utility2.browserTest({
                        modeBrowserTest: 'screenCapture',
                        url: 'file://' + local.utility2.envDict.npm_config_dir_build +
                            '/doc.api.html'
                    }, options.onNext);
                    break;
                default:
                    onError(error);
                }
            });
            options.modeNext = 0;
            options.onNext();
        };

        local.testCase_webpage_default = function (options, onError) {
        /*
         * this function will test the webpage's default handling-behavior
         */
            options = {
                modeCoverageMerge: true,
                url: local.utility2.serverLocalHost + '?modeTest=1'
            };
            local.utility2.browserTest(options, onError);
        };
        break;
    }



    // run shared js-env code - post-init
    (function () {
        // init dbSeedList
        local.utility2.dbSeedList = local.utility2.dbSeedList.concat([{
            dbIndexCreateList: [{
                expireAfterSeconds: 30,
                fieldName: 'field1',
                sparse: true,
                unique: true
            }],
            dbRowList: [{
                id: 'testCase_dbTableCountMany_default'
            }, {
                id: 'testCase_dbTableFindOne_default'
            }, {
                id: 'testCase_dbTableRemoveOne_default'
            }],
            name: 'TestCrud'
        }]);
    }());
    switch (local.modeJs) {



    // run browser js-env code - post-init
    case 'browser':
        // run tests
        local.utility2.nop(
            local.utility2.modeTest && document.querySelector('#testRunButton1').click()
        );
        break;



    /* istanbul ignore next */
    // run node js-env code - post-init
    case 'node':
        // run test-server
        local.utility2.testRunServer(local);
        // init repl debugger
        local.utility2.replStart();
        /* istanbul ignore next */
        if (module !== require.main || module.isRollup) {
            break;
        }
        // init assets
        local.utility2.assetsDict['/assets.app.js'] = [
            'header',
            '/assets.utility2.rollup.js',
            'local.utility2.stateInit',
            '/assets.nedb-lite.js',
            '/assets.example.js',
            '/assets.test.js'
        ].map(function (key) {
            switch (key) {
/* jslint-ignore-begin */
case 'header':
return '\
/*\n\
assets.app.js\n\
\n' + local.utility2.envDict.npm_package_description + '\n\
\n\
instruction\n\
    1. save this script as assets.app.js\n\
    2. run the shell command:\n\
        $ PORT=8081 node assets.app.js\n\
    3. open a browser to http://localhost:8081\n\
    4. edit or paste script in browser to eval\n\
*/\n\
';
/* jslint-ignore-end */
            case 'local.utility2.stateInit':
                return '// ' + key + '\n' +
                    local.utility2.assetsDict['/assets.utility2.rollup.content.js']
                    .replace(
                        '/* utility2.rollup.js content */',
                        key + '(' + JSON.stringify(
                            local.utility2.middlewareJsonpStateInit({ stateInit: true })
                        ) + ');'
                    );
            default:
                return '// ' + key + '\n' + local.utility2.assetsDict[key];
            }
        }).join('\n\n\n\n');
        local.utility2.assetsDict['/assets.app.min.js'] =
            local.utility2.uglifyIfProduction(local.utility2.assetsDict['/assets.app.js']);
        break;
    }
}());
