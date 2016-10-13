/*
 * assets.nedb-lite.js
 *
 * this package will run a standalone, browser-compatible version of the nedb v1.8.0 database
 * with zero npm-dependencies
 *
 * browser example:
 *     <script src="assets.nedb-lite.js"></script>
 *     <script>
 *     var table1 = window.nedb_lite.dbTableCreate({ name: "table1" });
 *     table1.insert({ field1: 'hello', field2: 'world'}, console.log.bind(console));
 *     </script>
 *
 * node example:
 *     var nedb = require('./assets.nedb-lite.js');
 *     var table1 = window.nedb_lite.dbTableCreate({ name: "table1" });
 *     table1.insert({ field1: 'hello', field2: 'world'}, console.log.bind(console));
 */



/* istanbul instrument in package nedb-lite */
/*jslint
    bitwise: true,
    browser: true,
    maxerr: 8,
    maxlen: 196,
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
        // init global
        local.global = local.modeJs === 'browser'
            ? window
            : global;
        local.nedb = {};
        local.nedb.local = local;
    }());



    // run shared js-env code - function
    (function () {
        local.nedb.assert = function (passed, message) {
        /*
         * this function will throw the error message if passed is falsey
         */
            var error;
            if (passed) {
                return;
            }
            error = message && message.message
                // if message is an error-object, then leave it as is
                ? message
                : new Error(typeof message === 'string'
                    // if message is a string, then leave it as is
                    ? message
                    // else JSON.stringify message
                    : JSON.stringify(message));
            throw error;
        };

        local.nedb.dbExport = function () {
        /*
         * this function will export the database as a serialized dbTableList
         */
            var data;
            data = '';
            Object.keys(local.nedb.dbTableDict).map(function (key) {
                data += local.nedb.dbTableExport({ name: key }) + '\n\n';
            });
            return data.slice(0, -2);
        };

        local.nedb.dbImport = function (dbTableList, onError) {
        /*
         * this function will import the serialized dbTableList
         */
            dbTableList.trim().split('\n\n').forEach(function (dbTable) {
                local.nedb.dbTableCreate({
                    persistenceData: dbTable,
                    name: JSON.parse((/.*/).exec(dbTable)[0])
                }, onError);
            });
        };

        local.nedb.dbIndexCreate = function (dbTable, options, onError) {
        /*
         * this function will create an index for the given dbTable
         */
        /**
         * Create an index is for this field. Same parameters as lib/indexes
         * For now this function is synchronous, we need to test how much time it takes
         * We use an async API for consistency with the rest of the code
         * @param {String} options.fieldName
         * @param {Boolean} options.unique
         * @param {Boolean} options.sparse
         * @param {Number} options.expireAfterSeconds - Optional, if set this index
         *     becomes a TTL index (only works on Date fields, not arrays of Date)
         * @param {Function} onError - callback, signature: error
         */
            var self;
            // require options.fieldName
            local.nedb.assert(options.fieldName, options.fieldName);
            self = local.nedb.dbTableDict[dbTable.name];
            self.indexes[options.fieldName] = new local.nedb.Index(options);
            // With this implementation index creation is not necessary to ensure TTL
            // but we stick with MongoDB's API here
            if (options.expireAfterSeconds !== undefined) {
                self.ttlIndexes[options.fieldName] = options.expireAfterSeconds;
            }
            self.indexes[options.fieldName].insert(local.nedb.dbTableFindAll(self));
            // We may want to force all options to be persisted including defaults,
            // not just the ones passed the index creation function
            self.persistence.persistNewState([{ $$indexCreated: options }], onError);
        };

        local.nedb.dbIndexRemove = function (dbTable, options, onError) {
        /*
         * this function will remove the dbIndex from dbTable with the given options
         */
            var self;
            self = local.nedb.dbTableDict[dbTable.name];
            delete self.indexes[options.fieldName];
            self.persistence.persistNewState([{
                $$indexRemoved: options.fieldName
            }], onError);
        };

        local.nedb.dbReset = function (onError) {
        /*
         * this function will reset nedb's persistence
         */
            var onParallel, options;
            options = {};
            local.nedb.onNext(options, function (error) {
                switch (options.modeNext) {
                case 1:
                    onParallel = local.nedb.onParallel(onError);
                    onParallel.counter = 0;
                    onParallel.counter += 1;
                    Object.keys(local.nedb.dbTableDict).forEach(function (key) {
                        // drop dbTable
                        onParallel.counter += 1;
                        local.nedb.dbTableDrop({ name: key }, onParallel);
                    });
                    onParallel.counter += 1;
                    local.nedb.dbStorageClear(onParallel);
                    onParallel();
                    break;
                default:
                    onError(error);
                }
            });
            options.modeNext = 0;
            options.onNext();
        };

        local.nedb.dbTableCountMany = function (dbTable, options, onError) {
        /*
         * this function will count the number of dbRow's in dbTable with the given options
         */
            var result, self;
            options = local.nedb.objectSetDefault({}, options);
            options = local.nedb.objectSetDefault(options, { query: {} });
            local.nedb.onNext(options, function (error, data) {
                data = data || [];
                switch (options.modeNext) {
                case 1:
                    result = 0;
                    self = local.nedb.dbTableDict[dbTable.name];
                    self.getCandidates(options.query, options.onNext);
                    break;
                case 2:
                    data.forEach(function (dbRow) {
                        if (local.nedb.queryMatch(dbRow, options.query)) {
                            result += 1;
                        }
                    });
                    options.onNext();
                    break;
                default:
                    onError(error, result);
                }
            });
            options.modeNext = 0;
            options.onNext();
        };

        local.nedb.dbStorageClear = function (onError) {
        /*
         * this function will clear dbStorage
         */
            local.nedb.dbStorageDefer({ action: 'clear' }, onError);
        };

        local.nedb.dbStorageDefer = function (options, onError) {
        /*
         * this function will defer options.action until dbStorage is ready
         */
            var data, done, objectStore, onError2, request, tmp;
            if (!local.nedb.dbStorage) {
                local.nedb.dbStorageDeferList.push(function () {
                    local.nedb.dbStorageDefer(options, onError);
                });
                return;
            }
            if (options.action === 'onError') {
                onError();
                return;
            }
            switch (local.modeJs) {
            case 'browser':
                onError2 = function () {
                    if (done) {
                        return;
                    }
                    done = true;
                    onError(
                        request && (request.error || request.transaction.error),
                        data || request.result
                    );
                };
                switch (options.action) {
                case 'clear':
                case 'removeItem':
                case 'setItem':
                    objectStore = local.nedb.dbStorage
                        .transaction('nedb', 'readwrite')
                        .objectStore('nedb');
                    break;
                default:
                    objectStore = local.nedb.dbStorage
                        .transaction('nedb', 'readonly')
                        .objectStore('nedb');
                }
                switch (options.action) {
                case 'clear':
                    request = objectStore.clear();
                    break;
                case 'getItem':
                    request = objectStore.get(options.key);
                    break;
                case 'keys':
                    data = [];
                    request = objectStore.openCursor();
                    request.onsuccess = function () {
                        if (!request.result) {
                            onError2();
                            return;
                        }
                        data.push(request.result.key);
                        request.result.continue();
                    };
                    break;
                case 'length':
                    request = objectStore.count();
                    break;
                case 'removeItem':
                    request = objectStore.delete(options.key);
                    break;
                case 'setItem':
                    request = objectStore.put(options.value, options.key);
                    break;
                }
                ['onabort', 'onerror', 'onsuccess'].forEach(function (handler) {
                    request[handler] = request[handler] || onError2;
                });
                // debug request
                local.nedb._debugDbStorageRequest = request;
                break;
            case 'node':
                switch (options.action) {
                case 'clear':
                    local.child_process.spawn('sh', ['-c', 'rm ' + local.nedb.dbStorage + '/*'], {
                        stdio: ['ignore', 1, 2]
                    }).once('exit', function () {
                        onError();
                    });
                    break;
                case 'getItem':
                    local.nedb.assert(typeof options.key === 'string', options.key);
                    local.fs.readFile(
                        local.nedb.dbStorage + '/' + encodeURIComponent(options.key),
                        'utf8',
                        function (error, data) {
                            // jslint-hack
                            local.nedb.nop(error);
                            onError(null, data || '');
                        }
                    );
                    break;
                case 'keys':
                    local.fs.readdir(local.nedb.dbStorage, function (error, data) {
                        onError(error, data && data.map(decodeURIComponent));
                    });
                    break;
                case 'length':
                    local.fs.readdir(local.nedb.dbStorage, function (error, data) {
                        onError(error, data && data.length);
                    });
                    break;
                case 'removeItem':
                    local.nedb.assert(typeof options.key === 'string', options.key);
                    local.fs.unlink(
                        local.nedb.dbStorage + '/' + encodeURIComponent(options.key),
                        // ignore error
                        function () {
                            onError();
                        }
                    );
                    break;
                case 'setItem':
                    local.nedb.assert(typeof options.key === 'string', options.key);
                    local.nedb.assert(typeof options.value === 'string', options.value);
                    tmp = local.os.tmpdir() + '/' + Date.now() + Math.random();
                    // save to tmp
                    local.fs.writeFile(tmp, options.value, function (error) {
                        // jslint-hack
                        local.nedb.nop(error);
                        // rename tmp to key
                        local.fs.rename(
                            tmp,
                            local.nedb.dbStorage + '/' + encodeURIComponent(options.key),
                            onError
                        );
                    });
                    break;
                }
                break;
            }
        };

        local.nedb.dbStorageDeferList = [];

        local.nedb.dbStorageGetItem = function (key, onError) {
        /*
         * this function will get the item with the given key from dbStorage
         */
            local.nedb.assert(typeof key === 'string');
            local.nedb.dbStorageDefer({ action: 'getItem', key: key }, onError);
        };

        local.nedb.dbStorageInit = function () {
        /*
         * this function will init dbStorage
         */
            var options, request;
            options = {};
            local.nedb.onNext(options, function (error) {
                // validate no error occurred
                local.nedb.assert(!error, error);
                if (local.modeJs === 'browser') {
                    local.nedb.dbStorage = local.global.nedb_storage;
                }
                switch (options.modeNext) {
                case 1:
                    if (local.nedb.dbStorage) {
                        options.onNext();
                        return;
                    }
                    switch (local.modeJs) {
                    case 'browser':
                        // init indexedDB
                        try {
                            request = local.global.indexedDB.open('nedb');
                            request.onerror = options.onNext;
                            request.onsuccess = function () {
                                local.global.nedb_storage = request.result;
                                options.onNext();
                            };
                            request.onupgradeneeded = function () {
                                if (!request.result.objectStoreNames.contains('nedb')) {
                                    request.result.createObjectStore('nedb');
                                }
                            };
                        } catch (ignore) {
                        }
                        break;
                    case 'node':
                        // mkdirp dbStorage
                        local.nedb.dbStorage = 'tmp/nedb.persistence.' + local.nedb.NODE_ENV;
                        local.child_process.spawnSync('mkdir', ['-p', local.nedb.dbStorage], {
                            stdio: ['ignore', 1, 2]
                        });
                        options.onNext();
                        break;
                    }
                    break;
                // run deferred actions
                case 2:
                    while (local.nedb.dbStorageDeferList.length) {
                        local.nedb.dbStorageDeferList.shift()();
                    }
                    break;
                }
            });
            options.modeNext = 0;
            options.onNext();
        };

        local.nedb.dbStorageKeys = function (onError) {
        /*
         * this function will get all the keys in dbStorage
         */
            local.nedb.dbStorageDefer({ action: 'keys' }, onError);
        };

        local.nedb.dbStorageLength = function (onError) {
        /*
         * this function will get the number of items in dbStorage
         */
            local.nedb.dbStorageDefer({ action: 'length' }, onError);
        };

        local.nedb.dbStorageRemoveItem = function (key, onError) {
        /*
         * this function will remove the item with the given key from dbStorage
         */
            local.nedb.assert(typeof key === 'string');
            local.nedb.dbStorageDefer({ action: 'removeItem', key: key }, onError);
        };

        local.nedb.dbStorageSetItem = function (key, value, onError) {
        /*
         * this function will set the item with the given key and value to dbStorage
         */
            local.nedb.assert(typeof key === 'string');
            local.nedb.assert(typeof value === 'string');
            local.nedb.dbStorageDefer({ action: 'setItem', key: key, value: value }, onError);
        };

        local.nedb.dbTableCreate = function (options, onError) {
        /*
         * this function will create a dbTable with the given options.name
         */
            var self;
            options = local.nedb.objectSetDefault({}, options);
            local.nedb.onNext(options, function (error, data) {
                switch (options.modeNext) {
                case 1:
                    self = local.nedb.dbTableDict[options.name] =
                        local.nedb.dbTableDict[options.name] || new local.nedb._Table();
                    if (self.initialized) {
                        options.onNext();
                        return;
                    }
                    self.initialized = 1;
                    self.dropped = null;
                    // validate name
                    local.nedb.assert(
                        options && options.name && typeof options.name === 'string',
                        options && options.name
                    );
                    self.name = self.name || options.name;
                    // Persistence handling
                    self.persistence = new local.nedb.Persistence({ db: self });
                    // Indexed by field name, dot notation can be used
                    // _id is always indexed and since _ids are generated randomly
                    // the underlying binary is always well-balanced
                    self.indexes = {
                        _id: new local.nedb.Index({ fieldName: '_id', unique: true }),
                        createdAt: new local.nedb.Index({ fieldName: 'createdAt' }),
                        updatedAt: new local.nedb.Index({ fieldName: 'updatedAt' })
                    };
                    self.ttlIndexes = {};
                    // init deferList
                    self.deferList = [];
                    options.onNext();
                    break;
                // import data
                case 2:
                    data = (options.persistenceData || '').trim();
                    if (options.reset) {
                        data = 'undefined';
                    }
                    if (!data) {
                        options.onNext();
                        return;
                    }
                    self.isLoaded = null;
                    data += '\n';
                    data = data.slice(data.indexOf('\n') + 1);
                    local.nedb.dbStorageSetItem(self.name, data, options.onNext);
                    break;
                // load persistence
                case 3:
                    if (self.isLoaded) {
                        options.modeNext += 2;
                        options.onNext();
                        return;
                    }
                    self.isLoaded = true;
                    local.nedb.dbStorageGetItem(self.name, options.onNext);
                    break;
                case 4:
                    // Load the database
                    // 1) Create all indexes
                    // 2) Insert all data
                    // 3) Compact the database
                    // This means pulling data out of the data file
                    // or creating it if it doesn't exist.
                    // Also, all data is persisted right away,
                    // which has the effect of compacting the database file.
                    // This operation is very quick at startup for a big dbTable
                    // (60ms for ~10k docs).
                    if (self.dropped) {
                        options.onNext();
                        return;
                    }
                    data = self.persistence.treatRawData(data || '');
                    // Recreate all indexes in the datafile
                    Object.keys(data.indexes).forEach(function (key) {
                        self.indexes[key] = new local.nedb.Index(data.indexes[key]);
                    });

                    // Fill cached database (i.e. all indexes) with data
                    Object.keys(self.indexes).forEach(function (key) {
                        self.indexes[key].reset(data.data);
                    });
                    self.persistence.persistCachedDatabase(options.onNext);
                    break;
                default:
                    // validate no error occurred
                    local.nedb.assert(!error, error);
                    if (onError) {
                        onError(error, self);
                    }
                }
            });
            options.modeNext = 0;
            options.onNext();
            return self;
        };

        local.nedb.dbTableDict = {};

        local.nedb.dbTableDrop = function (dbTable, onError) {
        /*
         * this function will drop the dbTable with the given dbTable.name
         */
            var self;
            self = local.nedb.dbTableDict[dbTable.name];
            if (!self) {
                onError();
                return;
            }
            self.dropped = true;
            Object.keys(self).forEach(function (key) {
                switch (key) {
                case 'deferList':
                case 'dropped':
                case 'name':
                    break;
                default:
                    delete self[key];
                }
            });
            local.nedb.dbStorageRemoveItem(self.name, onError);
        };

        local.nedb.dbTableExport = function (dbTable) {
        /*
         * this function will export dbTable with the given dbTable.name
         */
            var data, self;
            self = local.nedb.dbTableDict[dbTable.name];
            data = '';
            data += JSON.stringify(String(dbTable.name)) + '\n';
            local.nedb.dbTableFindAll(self).forEach(function (dbRow) {
                data += JSON.stringify(dbRow) + '\n';
            });
            Object.keys(self.indexes).forEach(function (fieldName) {
                if (fieldName === '_id') {
                    return;
                }
                data += JSON.stringify({ $$indexCreated: {
                    fieldName: fieldName,
                    unique: self.indexes[fieldName].unique,
                    sparse: self.indexes[fieldName].sparse
                } }) + '\n';
            });
            return data.slice(0, -1);
        };

        local.nedb.dbTableFindAll = function (dbTable) {
        /*
         * this function will find all dbRow's in dbTable
         */
            var result, self;
            self = local.nedb.dbTableDict[dbTable.name];
            result = [];
            self.indexes._id.tree.executeOnEveryNode(function (node) {
                node.data.forEach(function (dbRow) {
                    result.push(dbRow);
                });
            });
            return result;
        };

        local.nedb.dbTableFindMany = function (dbTable, options, onError) {
        /**
         * this function will find all dbRow's in dbTable with the given options
         */
            var limit, projection, result, self, skip, sort, tmp;
            options = local.nedb.objectSetDefault({}, options);
            options = local.nedb.objectSetDefault(options, {
                limit: Infinity,
                projection: {},
                query: {},
                skip: 0,
                sort: {}
            });
            local.nedb.onNext(options, function (error, data) {
                data = data || [];
                switch (options.modeNext) {
                case 1:
                    result = [];
                    self = local.nedb.dbTableDict[dbTable.name];
                    self.getCandidates(options.query, options.onNext);
                    break;
                case 2:
                    sort = Object.keys(options.sort).map(function (key) {
                        return {
                            key: key,
                            direction: options.sort[key]
                        };
                    });
                    // optimization - no sort
                    if (!sort.length) {
                        limit = options.limit;
                        skip = options.skip;
                        data.some(function (dbRow) {
                            if (!local.nedb.queryMatch(dbRow, options.query)) {
                                return;
                            }
                            skip -= 1;
                            if (skip >= 0) {
                                return;
                            }
                            result.push(dbRow);
                            limit -= 1;
                            if (limit <= 0) {
                                return true;
                            }
                        });
                        options.onNext();
                        return;
                    }
                    // sort
                    result = data;
                    result = result.filter(function (dbRow) {
                        return local.nedb.queryMatch(dbRow, options.query);
                    });
                    result = result.sort(function (aa, bb) {
                        sort.some(function (element) {
                            tmp = element.direction * local.nedb.sortCompare(
                                local.nedb.queryGetDotValue(aa, element.key),
                                local.nedb.queryGetDotValue(bb, element.key)
                            );
                            return tmp;
                        });
                        return tmp;
                    });
                    // limit and skip
                    result = result.slice(options.skip, options.skip + options.limit);
                    options.onNext();
                    break;
                case 4:
                    // projection
                    projection = Object.keys(options.projection);
                    if (!projection.list) {
                        options.onNext();
                        return;
                    }
                    // pick-type projection
                    if (options.projection[projection.list[0]] === 1) {
                        result = result.map(function (dbRow) {
                            tmp = {};
                            projection.forEach(function (key) {
                                tmp[key] = dbRow[key];
                            });
                            return tmp;
                        });
                    // omit-type projection
                    } else {
                        result = result.map(function (dbRow) {
                            tmp = {};
                            Object.keys(dbRow).forEach(function (key) {
                                if (!options.projection.hasOwnProperty(key)) {
                                    tmp[key] = dbRow[key];
                                }
                            });
                            return tmp;
                        });
                    }
                    options.onNext();
                    break;
                default:
                    onError(error, result);
                }
            });
            options.modeNext = 0;
            options.onNext();
        };

        local.nedb.dbTableFindOne = function (dbTable, options, onError) {
        /**
         * this function will find one dbRow in dbTable with the given options
         */
            local.nedb.dbTableFindMany(dbTable, {
                limit: 1,
                query: options.query
            }, function (error, data) {
                onError(error, data[0] || null);
            });
        };

        local.nedb.dbTableRemoveMany = function (dbTable, options, onError) {
        /*
         * this function will remove many dbRow's in dbTable with the given options
         */
            var removedList, result, self;
            options = local.nedb.objectSetDefault({}, options);
            options = local.nedb.objectSetDefault(options, { one: null, query: {} });
            local.nedb.onNext(options, function (error, data) {
                data = data || [];
                switch (options.modeNext) {
                case 1:
                    removedList = [];
                    result = 0;
                    self = local.nedb.dbTableDict[dbTable.name];
                    self.getCandidates(options.query, options.onNext);
                    break;
                case 2:
                    data.some(function (dbRow) {
                        if (local.nedb.queryMatch(dbRow, options.query)) {
                            result += 1;
                            removedList.push({
                                $$deleted: true,
                                _id: dbRow._id
                            });
                            self.removeFromIndexes(dbRow);
                            if (options.one) {
                                return true;
                            }
                        }
                    });
                    self.persistence.persistNewState(removedList, options.onNext);
                    break;
                default:
                    onError(error, result);
                }
            });
            options.modeNext = 0;
            options.onNext();
        };

        local.nedb.dbTableRemoveOne = function (dbTable, options, onError) {
        /*
         * this function will remove one dbRow in dbTable with the given options
         */
            options = local.nedb.objectSetDefault({}, options);
            options = local.nedb.objectSetDefault(options, { one: true });
            local.nedb.dbTableRemoveMany(dbTable, options, onError);
        };

        local.nedb.jsonCopy = function (arg) {
        /*
         * this function will return a deep-copy of the JSON-arg
         */
            return arg === undefined
                ? undefined
                : JSON.parse(JSON.stringify(arg));
        };

        local.nedb.jsonStringifyOrdered = function (element, replacer, space) {
        /*
         * this function will JSON.stringify the element,
         * with object-keys sorted and circular-references removed
         */
            var circularList, stringify, tmp;
            stringify = function (element) {
            /*
             * this function will recursively JSON.stringify the element,
             * with object-keys sorted and circular-references removed
             */
                // if element is an object, then recurse its items with object-keys sorted
                if (element &&
                        typeof element === 'object' &&
                        typeof element.toJSON !== 'function') {
                    // ignore circular-reference
                    if (circularList.indexOf(element) >= 0) {
                        return;
                    }
                    circularList.push(element);
                    // if element is an array, then recurse its elements
                    if (Array.isArray(element)) {
                        return '[' + element.map(function (element) {
                            tmp = stringify(element);
                            return typeof tmp === 'string'
                                ? tmp
                                : 'null';
                        }).join(',') + ']';
                    }
                    return '{' + Object.keys(element)
                        // sort object-keys
                        .sort()
                        .map(function (key) {
                            tmp = stringify(element[key]);
                            return typeof tmp === 'string'
                                ? JSON.stringify(key) + ':' + tmp
                                : undefined;
                        })
                        .filter(function (element) {
                            return typeof element === 'string';
                        })
                        .join(',') + '}';
                }
                // else JSON.stringify as normal
                return JSON.stringify(element);
            };
            circularList = [];
            return JSON.stringify(element && typeof element === 'object'
                ? JSON.parse(stringify(element))
                : element, replacer, space);
        };

        local.nedb.nop = function () {
        /*
         * this function will do nothing
         */
            return;
        };

        local.nedb.objectSetDefault = function (arg, defaults) {
        /*
         * this function will set defaults for arg
         */
            arg = arg || {};
            defaults = defaults || {};
            Object.keys(defaults).forEach(function (key) {
                if (defaults[key] !== undefined) {
                    arg[key] = arg[key] || defaults[key];
                }
            });
            return arg;
        };

        local.nedb.onErrorDefault = function (error) {
        /*
         * this function will print error.stack or error.message to stderr
         */
            // if error is defined, then print error.stack
            if (error && !local.global.__coverage__) {
                console.error('\nonErrorDefault - error\n' +
                    error.message + '\n' + error.stack + '\n');
            }
        };

        local.nedb.onNext = function (options, onError) {
        /*
         * this function will wrap onError inside the recursive function options.onNext,
         * and append the current stack to any error
         */
            options.onNext = function (error, data, meta) {
                try {
                    options.modeNext = error
                        ? Infinity
                        : options.modeNext + 1;
                    onError(error, data, meta);
                } catch (errorCaught) {
                    // throw errorCaught to break infinite recursion-loop
                    if (options.errorCaught) {
                        throw options.errorCaught;
                    }
                    options.errorCaught = errorCaught;
                    options.onNext(errorCaught, data, meta);
                }
            };
            return options;
        };

        local.nedb.onParallel = function (onError, onDebug) {
        /*
         * this function will return a function that will
         * 1. run async tasks in parallel
         * 2. if counter === 0 or error occurred, then call onError with error
         */
            var self;
            onDebug = onDebug || local.nedb.nop;
            self = function (error) {
                onDebug(error, self);
                // if previously counter === 0 or error occurred, then return
                if (self.counter === 0 || self.error) {
                    return;
                }
                // handle error
                if (error) {
                    self.error = error;
                    // ensure counter will decrement to 0
                    self.counter = 1;
                }
                // decrement counter
                self.counter -= 1;
                // if counter === 0, then call onError with error
                if (self.counter === 0) {
                    onError(error);
                }
            };
            // init counter
            self.counter = 0;
            // return callback
            return self;
        };

        local.nedb.queryCompare = function (operator, aa, bb) {
        /*
         * this function will query-compare aa vs bb
         */
            try {
                switch (operator) {
                case '$elemMatch':
                    // If match for array element, return true
                    return (Array.isArray(aa)
                        ? aa
                        : []).some(function (element) {
                        return local.nedb.queryMatch(element, bb);
                    });
                case '$eq':
                    return local.nedb.sortCompare(aa, bb) === 0;
                case '$exists':
                    return !((!aa) ^ (!bb));
                case '$gt':
                    return local.nedb.sortCompare(aa, bb) > 0;
                case '$gte':
                    return local.nedb.sortCompare(aa, bb) >= 0;
                case '$in':
                    return Array.isArray(bb) && bb.some(function (cc) {
                        return local.nedb.sortCompare(aa, cc) === 0;
                    });
                case '$lt':
                    return local.nedb.sortCompare(aa, bb) < 0;
                case '$lte':
                    return local.nedb.sortCompare(aa, bb) <= 0;
                case '$ne':
                    return local.nedb.sortCompare(aa, bb) !== 0;
                case '$nin':
                    return Array.isArray(bb) && bb.every(function (cc) {
                        return local.nedb.sortCompare(aa, cc) !== 0;
                    });
                case '$regex':
                    return bb.test(aa);
                case '$size':
                    return (Array.isArray(aa) && aa.length === bb);
                default:
                    return false;
                }
            } catch (errorCaught) {
                local.nedb.onErrorDefault(errorCaught);
                return false;
            }
        };

        local.nedb.sortCompare = function (aa, bb) {
        /*
         * this function will sort-compare aa vs bb
         */
            var type1, type2;
            if (aa === undefined) {
                aa = null;
            }
            if (bb === undefined) {
                bb = null;
            }
            // compare equal
            if (aa === bb) {
                return 0;
            }
            // compare null
            if (aa === null) {
                return -1;
            }
            if (bb === null) {
                return 1;
            }
            // compare different-types
            type1 = typeof aa;
            type2 = typeof bb;
            if (type1 !== type2) {
                if (type1 === 'boolean') {
                    return -1;
                }
                if (type2 === 'boolean') {
                    return 1;
                }
                if (type1 === 'number') {
                    return -1;
                }
                if (type2 === 'number') {
                    return 1;
                }
                if (type1 === 'string') {
                    return -1;
                }
                if (type2 === 'string') {
                    return 1;
                }
            }
            // default compare
            return aa < bb
                ? -1
                : aa > bb
                ? 1
                : 0;
        };

        // legacy
        local.nedb.isRegExp = function (obj) {
            return Object.prototype.toString.call(obj) === '[object RegExp]';
        };
        local.nedb.listUnique = function (list) {
        /*
         * this function will remove duplicate elements from the array
         */
            var seen;
            seen = {};
            return list.filter(function (element) {
                if (seen.hasOwnProperty(element)) {
                    return;
                }
                seen[element] = true;
                return true;
            });
        };
    }());



// init lib nedb
// https://github.com/louischatriot/nedb/blob/cadf4ef434e517e47c4e9ca1db5b89e892ff5981/browser-version/out/nedb.js
    (function () {
        var modifierFunctions = {},
            lastStepModifierFunctions = {},
            logicalOperators = {};

        function checkKey(k, v) {
        /**
         * Check a key, throw an error if the key is non valid
         * @param {String} k key
         * @param {Model} v value, needed to treat the Date edge case
         * Non-treatable edge cases here: if part of the object if of the form { $$date: number } or { $$deleted: true }
         * Its serialized-then-deserialized version it will transformed into a Date object
         * But you really need to want it to trigger such behaviour, even when warned not to use '$' at the beginning of the field names...
         */
            if (typeof k === 'number') {
                k = k.toString();
            }

            if (k[0] === '$' && !(k === '$$date' && typeof v === 'number') && !(k === '$$deleted' && v === true) && !(k === '$$indexCreated') && !(k === '$$indexRemoved')) {
                throw new Error('Field names cannot begin with the $ character');
            }

            if (k.indexOf('.') !== -1) {
                throw new Error('Field names cannot contain a .');
            }
        }
        function checkObject(obj) {
        /**
         * Check a DB object and throw an error if it's not valid
         * Works by applying the above checkKey function to all fields recursively
         */
            if (Array.isArray(obj)) {
                obj.forEach(function (o) {
                    checkObject(o);
                });
            }

            if (typeof obj === 'object' && obj !== null) {
                Object.keys(obj).forEach(function (k) {
                    checkKey(k, obj[k]);
                    checkObject(obj[k]);
                });
            }
        }
        local.nedb.dbRowDeepCopy = function (obj, strictKeys) {
        /**
         * Deep copy a DB object
         * The optional strictKeys flag (defaulting to false) indicates whether to copy everything or only fields
         * where the keys are valid, i.e. don't begin with $ and don't contain a .
         */
            var res;

            if (typeof obj === 'boolean' ||
                    typeof obj === 'number' ||
                    typeof obj === 'string' ||
                    obj === null) {
                return obj;
            }

            if (Array.isArray(obj)) {
                res = [];
                obj.forEach(function (o) {
                    res.push(local.nedb.dbRowDeepCopy(o, strictKeys));
                });
                return res;
            }

            if (typeof obj === 'object') {
                res = {};
                Object.keys(obj).forEach(function (k) {
                    if (!strictKeys || (k[0] !== '$' && k.indexOf('.') === -1)) {
                        res[k] = local.nedb.dbRowDeepCopy(obj[k], strictKeys);
                    }
                });
                return res;
            }

            return undefined; // For now everything else is undefined. We should probably throw an error instead
        };
        function isPrimitiveType(obj) {
        /**
         * Tells if an object is a primitive type or a 'real' object
         * Arrays are considered primitive
         */
            return (typeof obj === 'boolean' ||
                typeof obj === 'number' ||
                typeof obj === 'string' ||
                obj === null ||
                Array.isArray(obj));
        }
        // ==============================================================
        // Updating dbRow's
        // ==============================================================

        /**
         * The signature of modifier functions is as follows
         * Their structure is always the same: recursively follow the dot notation while creating
         * the nested dbRow's if needed, then apply the 'last step modifier'
         * @param {Object} obj The model to modify
         * @param {String} field Can contain dots, in that case that means we will set a subfield recursively
         * @param {Model} value
         */

        lastStepModifierFunctions.$set = function (obj, field, value) {
        /**
         * Set a field to a new value
         */
            obj[field] = value;
        };
        lastStepModifierFunctions.$unset = function (obj, field) {
        /**
         * Unset a field
         */
            delete obj[field];
        };
        lastStepModifierFunctions.$push = function (obj, field, value) {
        /**
         * Push an element to the end of an array field
         * Optional modifier $each instead of value to push several values
         * Optional modifier $slice to slice the resulting array, see https://docs.mongodb.org/manual/reference/operator/update/slice/
         * Différeence with MongoDB: if $slice is specified and not $each, we act as if value is an empty array
         */
            // Create the array if it doesn't exist
            if (!obj.hasOwnProperty(field)) {
                obj[field] = [];
            }

            if (!Array.isArray(obj[field])) {
                throw new Error("Can't $push an element on non-array values");
            }

            if (value !== null && typeof value === 'object' && value.$slice && value.$each === undefined) {
                value.$each = [];
            }

            if (value !== null && typeof value === 'object' && value.$each) {
                if (Object.keys(value).length >= 3 || (Object.keys(value).length === 2 && value.$slice === undefined)) {
                    throw new Error('Can only use $slice in cunjunction with $each when $push to array');
                }
                if (!Array.isArray(value.$each)) {
                    throw new Error('$each requires an array value');
                }

                value.$each.forEach(function (v) {
                    obj[field].push(v);
                });

                if (value.$slice === undefined || typeof value.$slice !== 'number') {
                    return;
                }

                if (value.$slice === 0) {
                    obj[field] = [];
                } else {
                    var start, end, n = obj[field].length;
                    if (value.$slice < 0) {
                        start = Math.max(0, n + value.$slice);
                        end = n;
                    } else if (value.$slice > 0) {
                        start = 0;
                        end = Math.min(n, value.$slice);
                    }
                    obj[field] = obj[field].slice(start, end);
                }
            } else {
                obj[field].push(value);
            }
        };
        lastStepModifierFunctions.$addToSet = function (obj, field, value) {
        /**
         * Add an element to an array field only if it is not already in it
         * No modification if the element is already in the array
         * Note that it doesn't check whether the original array contains duplicates
         */
            var addToSet = true;

            // Create the array if it doesn't exist
            if (!obj.hasOwnProperty(field)) {
                obj[field] = [];
            }

            if (!Array.isArray(obj[field])) {
                throw new Error("Can't $addToSet an element on non-array values");
            }

            if (value !== null && typeof value === 'object' && value.$each) {
                if (Object.keys(value).length > 1) {
                    throw new Error("Can't use another field in conjunction with $each");
                }
                if (!Array.isArray(value.$each)) {
                    throw new Error('$each requires an array value');
                }

                value.$each.forEach(function (v) {
                    lastStepModifierFunctions.$addToSet(obj, field, v);
                });
            } else {
                obj[field].forEach(function (v) {
                    if (local.nedb.sortCompare(v, value) === 0) {
                        addToSet = false;
                    }
                });
                if (addToSet) {
                    obj[field].push(value);
                }
            }
        };
        lastStepModifierFunctions.$pop = function (obj, field, value) {
        /**
         * Remove the first or last element of an array
         */
            if (!Array.isArray(obj[field])) {
                throw new Error("Can't $pop an element from non-array values");
            }
            if (typeof value !== 'number') {
                throw new Error(value + " isn't an integer, can't use it with $pop");
            }
            if (value === 0) {
                return;
            }

            if (value > 0) {
                obj[field] = obj[field].slice(0, obj[field].length - 1);
            } else {
                obj[field] = obj[field].slice(1);
            }
        };
        lastStepModifierFunctions.$pull = function (obj, field, value) {
        /**
         * Removes all instances of a value from an existing array
         */
            var arr, ii;

            if (!Array.isArray(obj[field])) {
                throw new Error("Can't $pull an element from non-array values");
            }

            arr = obj[field];
            for (ii = arr.length - 1; ii >= 0; ii -= 1) {
                if (local.nedb.queryMatch(arr[ii], value)) {
                    arr.splice(ii, 1);
                }
            }
        };
        lastStepModifierFunctions.$inc = function (obj, field, value) {
        /**
         * Increment a numeric field's value
         */
            if (typeof value !== 'number') {
                throw new Error(value + ' must be a number');
            }

            if (typeof obj[field] !== 'number') {
                if (!obj.hasOwnProperty(field)) {
                    obj[field] = value;
                } else {
                    throw new Error("Don't use the $inc modifier on non-number fields");
                }
            } else {
                obj[field] += value;
            }
        };

        lastStepModifierFunctions.$max = function (obj, field, value) {
        /**
         * Updates the value of the field, only if specified field is greater than the current value of the field
         */
            if (obj[field] === undefined) {
                obj[field] = value;
            } else if (value > obj[field]) {
                obj[field] = value;
            }
        };

        lastStepModifierFunctions.$min = function (obj, field, value) {
        /**
         * Updates the value of the field, only if specified field is smaller than the current value of the field
         */
            if (obj[field] === undefined) {
                obj[field] = value;
            } else if (value < obj[field]) {
                obj[field] = value;
            }
        };

        // Given its name, create the complete modifier function
        function createModifierFunction(modifier) {
            return function (obj, field, value) {
                var fieldParts = typeof field === 'string' ? field.split('.') : field;

                if (fieldParts.length === 1) {
                    lastStepModifierFunctions[modifier](obj, field, value);
                } else {
                    if (obj[fieldParts[0]] === undefined) {
                        if (modifier === '$unset') {
                            return;
                        } // Bad looking specific fix, needs to be generalized modifiers that behave like $unset are implemented
                        obj[fieldParts[0]] = {};
                    }
                    modifierFunctions[modifier](obj[fieldParts[0]], fieldParts.slice(1), value);
                }
            };
        }

        // Actually create all modifier functions
        Object.keys(lastStepModifierFunctions).forEach(function (modifier) {
            modifierFunctions[modifier] = createModifierFunction(modifier);
        });
        function modify(obj, updateQuery) {
        /**
         * Modify a DB object according to an update query
         */
            var keys, dollarFirstChars, firstChars, modifiers, newDoc;
            keys = Object.keys(updateQuery);
            firstChars = keys.map(function (item) {
                return item[0];
            });
            dollarFirstChars = firstChars.filter(function (cc) {
                return cc === '$';
            });

            if (keys.indexOf('_id') !== -1 && updateQuery._id !== obj._id) {
                throw new Error("You cannot change a dbRow's _id");
            }

            if (dollarFirstChars.length !== 0 && dollarFirstChars.length !== firstChars.length) {
                throw new Error('You cannot mix modifiers and normal fields');
            }

            if (dollarFirstChars.length === 0) {
                // Simply replace the object with the update query contents
                newDoc = local.nedb.jsonCopy(updateQuery);
                newDoc._id = obj._id;
            } else {
                // Apply modifiers
                modifiers = local.nedb.listUnique(keys);
                newDoc = local.nedb.jsonCopy(obj);
                modifiers.forEach(function (m) {

                    if (!modifierFunctions[m]) {
                        throw new Error('Unknown modifier ' + m);
                    }

                    // Can't rely on Object.keys throwing on non objects since ES6
                    // Not 100% satisfying as non objects can be interpreted as objects but no false negatives so we can live with it
                    if (typeof updateQuery[m] !== 'object') {
                        throw new Error('Modifier ' + m + "'s argument must be an object");
                    }

                    Object.keys(updateQuery[m]).forEach(function (k) {
                        modifierFunctions[m](newDoc, k, updateQuery[m][k]);
                    });
                });
            }

            // Check result is valid and return it
            checkObject(newDoc);

            if (obj._id !== newDoc._id) {
                throw new Error("You can't change a dbRow's _id");
            }
            return newDoc;
        }
        // ==============================================================
        // Finding dbRow's
        // ==============================================================

        local.nedb.queryGetDotValue = function (obj, field) {
        /**
         * Get a value from object with dot notation
         * @param {Object} obj
         * @param {String} field
         */
            var fieldParts, ii, objs;
            fieldParts = typeof field === 'string'
                ? field.split('.')
                : field;

            if (!obj) {
                return undefined;
            } // field cannot be empty so that means we should return undefined so that nothing can match

            if (fieldParts.length === 0) {
                return obj;
            }

            if (fieldParts.length === 1) {
                return obj[fieldParts[0]];
            }

            if (Array.isArray(obj[fieldParts[0]])) {
                // If the next field is an integer, return only this item of the array
                ii = parseInt(fieldParts[1], 10);
                if (typeof ii === 'number' && !isNaN(ii)) {
                    return local.nedb.queryGetDotValue(obj[fieldParts[0]][ii], fieldParts.slice(2));
                }

                // Return the array of values
                objs = [];
                for (ii = 0; ii < obj[fieldParts[0]].length; ii += 1) {
                    objs.push(local.nedb.queryGetDotValue(obj[fieldParts[0]][ii], fieldParts.slice(1)));
                }
                return objs;
            }
            return local.nedb.queryGetDotValue(obj[fieldParts[0]], fieldParts.slice(1));
        };
        function areThingsEqual(aa, bb) {
        /**
         * Check whether 'things' are equal
         * Things are defined as any native types (string, number, boolean, null, date) and objects
         * In the case of object, we check deep equality
         * Returns true if they are, false otherwise
         */
            var aKeys, bKeys, ii;

            // Strings, booleans, numbers, null
            if (aa === null || typeof aa === 'string' || typeof aa === 'boolean' || typeof aa === 'number' ||
                    bb === null || typeof bb === 'string' || typeof bb === 'boolean' || typeof bb === 'number') {
                return aa === bb;
            }

            // Arrays (no match since arrays are used as aa $in)
            // undefined (no match since they mean field doesn't exist and can't be serialized)
            if ((!(Array.isArray(aa) && Array.isArray(bb)) && (Array.isArray(aa) || Array.isArray(bb))) || aa === undefined || bb === undefined) {
                return false;
            }

            // General objects (check for deep equality)
            // aa and bb should be objects at this point
            try {
                aKeys = Object.keys(aa);
                bKeys = Object.keys(bb);
            } catch (errorCaught) {
                return false;
            }

            if (aKeys.length !== bKeys.length) {
                return false;
            }
            for (ii = 0; ii < aKeys.length; ii += 1) {
                if (bKeys.indexOf(aKeys[ii]) === -1) {
                    return false;
                }
                if (!areThingsEqual(aa[aKeys[ii]], bb[aKeys[ii]])) {
                    return false;
                }
            }
            return true;
        }
        logicalOperators.$or = function (obj, query) {
        /**
         * Match any of the subqueries
         * @param {Model} obj
         * @param {Array of Queries} query
         */
            var ii;

            if (!Array.isArray(query)) {
                throw new Error('$or operator used without an array');
            }

            for (ii = 0; ii < query.length; ii += 1) {
                if (local.nedb.queryMatch(obj, query[ii])) {
                    return true;
                }
            }

            return false;
        };
        logicalOperators.$and = function (obj, query) {
        /**
         * Match all of the subqueries
         * @param {Model} obj
         * @param {Array of Queries} query
         */
            var ii;

            if (!Array.isArray(query)) {
                throw new Error('$and operator used without an array');
            }

            for (ii = 0; ii < query.length; ii += 1) {
                if (!local.nedb.queryMatch(obj, query[ii])) {
                    return false;
                }
            }

            return true;
        };
        logicalOperators.$not = function (obj, query) {
        /**
         * Inverted match of the query
         * @param {Model} obj
         * @param {Query} query
         */
            return !local.nedb.queryMatch(obj, query);
        };
        logicalOperators.$where = function (obj, fn) {
        /**
         * Use a function to match
         * @param {Model} obj
         * @param {Query} query
         */
            var result;

            if (typeof fn !== 'function') {
                throw new Error('$where operator used without a function');
            }

            result = fn.call(obj);
            if (typeof result !== 'boolean') {
                throw new Error('$where function must return boolean');
            }

            return result;
        };
        local.nedb.queryMatch = function (obj, query) {
        /**
         * Tell if a given dbRow matches a query
         * @param {Object} obj dbRow to check
         * @param {Object} query
         */
            function matchQueryPart(obj, queryKey, queryValue, treatObjAsValue) {
            /**
             * Match an object against a specific { key: value } part of a query
             * if the treatObjAsValue flag is set, don't try to match every part separately, but the array as a whole
             */
                var objValue, ii, keys, firstChars, dollarFirstChars, tmp;

                objValue = local.nedb.queryGetDotValue(obj, queryKey);

                // Check if the value is an array if we don't force a treatment as value
                if (Array.isArray(objValue) && !treatObjAsValue) {
                    // If the queryValue is an array, try to perform an exact match
                    if (Array.isArray(queryValue)) {
                        return matchQueryPart(obj, queryKey, queryValue, true);
                    }

                    // Check if we are using an array-specific comparison function
                    if (queryValue !== null && typeof queryValue === 'object' && !local.nedb.isRegExp(queryValue)) {
                        tmp = Object.keys(queryValue).some(function (key) {
                            switch (key) {
                            case '$elemMatch':
                            case '$size':
                                return matchQueryPart(obj, queryKey, queryValue, true);
                            }
                        });
                        if (tmp) {
                            return tmp;
                        }
                    }

                    // If not, treat it as an array of { obj, query } where there needs to be at least one match
                    for (ii = 0; ii < objValue.length; ii += 1) {
                        if (matchQueryPart({
                                k: objValue[ii]
                            }, 'k', queryValue)) {
                            return true;
                        } // k here could be any string
                    }
                    return false;
                }

                // queryValue is an actual object. Determine whether it contains comparison operators
                // or only normal fields. Mixed objects are not allowed
                if (queryValue !== null && typeof queryValue === 'object' && !local.nedb.isRegExp(queryValue) && !Array.isArray(queryValue)) {
                    keys = Object.keys(queryValue);
                    firstChars = keys.map(function (item) {
                        return item[0];
                    });
                    dollarFirstChars = firstChars.filter(function (cc) {
                        return cc === '$';
                    });

                    if (dollarFirstChars.length !== 0 && dollarFirstChars.length !== firstChars.length) {
                        throw new Error('You cannot mix operators and normal fields');
                    }

                    // queryValue is an object of this form: { $comparisonOperator1: value1, ... }
                    if (dollarFirstChars.length > 0) {
                        return keys.every(function (key) {
                            return local.nedb.queryCompare(key, objValue, queryValue[key]);
                        });
                    }
                }

                // Using regular expressions with basic querying
                if (local.nedb.isRegExp(queryValue)) {
                    return local.nedb.queryCompare('$regex', objValue, queryValue);
                }

                // queryValue is either a native value or a normal object
                // Basic matching is possible
                if (!areThingsEqual(objValue, queryValue)) {
                    return false;
                }

                return true;
            }
            // Primitive query against a primitive type
            // This is a bit of a hack since we construct an object with an arbitrary key only to dereference it later
            // But I don't have time for a cleaner implementation now
            if (isPrimitiveType(obj) || isPrimitiveType(query)) {
                return matchQueryPart({
                    needAKey: obj
                }, 'needAKey', query);
            }

            // Normal query
            return Object.keys(query).every(function (key) {
                if (key[0] === '$') {
                    if (!logicalOperators[key]) {
                        throw new Error('Unknown logical operator ' + key);
                    }
                    if (!logicalOperators[key](obj, query[key])) {
                        return;
                    }
                } else if (!matchQueryPart(obj, key, query[key])) {
                    return;
                }
                return true;
            });
        };
        // Interface
        /**
         * Handle models (i.e. docs)
         * Serialization/deserialization
         * Copying
         * Querying, update
         */
        local.nedb.dbRowCheckObject = checkObject;
        local.nedb.dbRowIsPrimitiveType = isPrimitiveType;
        local.nedb.dbRowModify = modify;
        local.nedb.AvlTree = function (options) {
        /**
         * Constructor of the internal AvlTree
         *
         * @param {Object} options Optional
         * @param {Boolean}  options.unique Whether to enforce a 'unique' constraint on the key or not
         * @param {Key}      options.key Initialize this AvlTree's key with key
         * @param {Value}    options.value Initialize this AvlTree's data with [value]
         */
            this.left = null;
            this.right = null;
            this.parent = options.parent !== undefined ? options.parent : null;
            if (options.hasOwnProperty('key')) {
                this.key = options.key;
            }
            this.data = options.hasOwnProperty('value') ? [options.value] : [];
            this.unique = options.unique || false;

        };
        // ================================
        // Methods used to test the tree
        // ================================
        local.nedb.AvlTree.prototype.getMaxKeyDescendant = function () {
        /**
         * Get the descendant with max key
         */
            return this.right
                ? this.right.getMaxKeyDescendant()
                : this;
        };
        // ============================================
        // Methods used to actually work on the tree
        // ============================================

        local.nedb.AvlTree.prototype.createSimilar = function (options) {
        /**
         * Create a BST similar (i.e. same options except for key and value) to the current one
         * Use the same constructor (i.e. AvlTree)
         * @param {Object} options see constructor
         */
            options = options || {};
            options.unique = this.unique;

            return new this.constructor(options);
        };
        local.nedb.AvlTree.prototype.createLeftChild = function (options) {
        /**
         * Create the left child of this BST and return it
         */
            var leftChild = this.createSimilar(options);
            leftChild.parent = this;
            this.left = leftChild;

            return leftChild;
        };
        local.nedb.AvlTree.prototype.createRightChild = function (options) {
        /**
         * Create the right child of this BST and return it
         */
            var rightChild = this.createSimilar(options);
            rightChild.parent = this;
            this.right = rightChild;

            return rightChild;
        };
        local.nedb.AvlTree.prototype.insert = function (key, value) {
        /**
         * Insert a new element
         */
            // Empty tree, insert as root
            if (!this.hasOwnProperty('key')) {
                this.key = key;
                this.data.push(value);
                return;
            }

            // Same key as root
            if (local.nedb.sortCompare(this.key, key) === 0) {
                if (this.unique) {
                    var error = new Error("Can't insert key " + key + ", it violates the unique constraint");
                    error.key = key;
                    error.errorType = 'uniqueViolated';
                    throw error;
                }
                this.data.push(value);
            }

            if (local.nedb.sortCompare(key, this.key) < 0) {
                // Insert in left subtree
                if (this.left) {
                    this.left.insert(key, value);
                } else {
                    this.createLeftChild({
                        key: key,
                        value: value
                    });
                }
            } else {
                // Insert in right subtree
                if (this.right) {
                    this.right.insert(key, value);
                } else {
                    this.createRightChild({
                        key: key,
                        value: value
                    });
                }
            }
        };
        local.nedb.AvlTree.prototype.search = function (key) {
        /**
         * Search for all data corresponding to a key
         */
            if (!this.hasOwnProperty('key')) {
                return [];
            }

            if (local.nedb.sortCompare(this.key, key) === 0) {
                return this.data;
            }

            if (local.nedb.sortCompare(key, this.key) < 0) {
                if (this.left) {
                    return this.left.search(key);
                }
                return [];
            }
            if (this.right) {
                return this.right.search(key);
            }
            return [];
        };
        local.nedb.AvlTree.prototype.getLowerBoundMatcher = function (query) {
        /**
         * Return a function that tells whether a given key matches a lower bound
         */
            // No lower bound
            if (!query.hasOwnProperty('$gt') && !query.hasOwnProperty('$gte')) {
                return function () {
                    return true;
                };
            }

            if (query.hasOwnProperty('$gt') && query.hasOwnProperty('$gte')) {
                if (local.nedb.sortCompare(query.$gte, query.$gt) === 0) {
                    return function (key) {
                        return local.nedb.sortCompare(key, query.$gt) > 0;
                    };
                }

                if (local.nedb.sortCompare(query.$gte, query.$gt) > 0) {
                    return function (key) {
                        return local.nedb.sortCompare(key, query.$gte) >= 0;
                    };
                }
                return function (key) {
                    return local.nedb.sortCompare(key, query.$gt) > 0;
                };
            }

            if (query.hasOwnProperty('$gt')) {
                return function (key) {
                    return local.nedb.sortCompare(key, query.$gt) > 0;
                };
            }
            return function (key) {
                return local.nedb.sortCompare(key, query.$gte) >= 0;
            };
        };
        local.nedb.AvlTree.prototype.getUpperBoundMatcher = function (query) {
        /**
         * Return a function that tells whether a given key matches an upper bound
         */
            // No lower bound
            if (!query.hasOwnProperty('$lt') && !query.hasOwnProperty('$lte')) {
                return function () {
                    return true;
                };
            }

            if (query.hasOwnProperty('$lt') && query.hasOwnProperty('$lte')) {
                if (local.nedb.sortCompare(query.$lte, query.$lt) === 0) {
                    return function (key) {
                        return local.nedb.sortCompare(key, query.$lt) < 0;
                    };
                }

                if (local.nedb.sortCompare(query.$lte, query.$lt) < 0) {
                    return function (key) {
                        return local.nedb.sortCompare(key, query.$lte) <= 0;
                    };
                }
                return function (key) {
                    return local.nedb.sortCompare(key, query.$lt) < 0;
                };
            }

            if (query.hasOwnProperty('$lt')) {
                return function (key) {
                    return local.nedb.sortCompare(key, query.$lt) < 0;
                };
            }
            return function (key) {
                return local.nedb.sortCompare(key, query.$lte) <= 0;
            };
        };
        // Append all elements in toAppend to array
        function append(array, toAppend) {
            var ii;

            for (ii = 0; ii < toAppend.length; ii += 1) {
                array.push(toAppend[ii]);
            }
        }
        local.nedb.AvlTree.prototype.betweenBounds = function (query, lbm, ubm) {
        /**
         * Get all data for a key between bounds
         * Return it in key order
         * @param {Object} query Mongo-style query where keys are $lt, $lte, $gt or $gte (other keys are not considered)
         * @param {Functions} lbm/ubm matching functions calculated at the first recursive step
         */
            var res = [];

            if (!this.hasOwnProperty('key')) {
                return [];
            } // Empty tree

            lbm = lbm || this.getLowerBoundMatcher(query);
            ubm = ubm || this.getUpperBoundMatcher(query);

            if (lbm(this.key) && this.left) {
                append(res, this.left.betweenBounds(query, lbm, ubm));
            }
            if (lbm(this.key) && ubm(this.key)) {
                append(res, this.data);
            }
            if (ubm(this.key) && this.right) {
                append(res, this.right.betweenBounds(query, lbm, ubm));
            }

            return res;
        };
        local.nedb.AvlTree.prototype.deleteIfLeaf = function () {
        /**
         * Delete the current node if it is a leaf
         * Return true if it was deleted
         */
            if (this.left || this.right) {
                return false;
            }

            // The leaf is itself a root
            if (!this.parent) {
                delete this.key;
                this.data = [];
                return true;
            }

            if (this.parent.left === this) {
                this.parent.left = null;
            } else {
                this.parent.right = null;
            }

            return true;
        };
        local.nedb.AvlTree.prototype.deleteIfOnlyOneChild = function () {
        /**
         * Delete the current node if it has only one child
         * Return true if it was deleted
         */
            var child;

            if (this.left && !this.right) {
                child = this.left;
            }
            if (!this.left && this.right) {
                child = this.right;
            }
            if (!child) {
                return false;
            }

            // Root
            if (!this.parent) {
                this.key = child.key;
                this.data = child.data;

                this.left = null;
                if (child.left) {
                    this.left = child.left;
                    child.left.parent = this;
                }

                this.right = null;
                if (child.right) {
                    this.right = child.right;
                    child.right.parent = this;
                }

                return true;
            }

            if (this.parent.left === this) {
                this.parent.left = child;
                child.parent = this.parent;
            } else {
                this.parent.right = child;
                child.parent = this.parent;
            }

            return true;
        };
        local.nedb.AvlTree.prototype.delete = function (key, value) {
        /**
         * Delete a key or just a value
         * @param {Key} key
         * @param {Value} value Optional. If not set, the whole key is deleted. If set, only this value is deleted
         */
            var newData, replaceWith, self;
            newData = [];
            self = this;

            if (!this.hasOwnProperty('key')) {
                return;
            }

            if (local.nedb.sortCompare(key, this.key) < 0) {
                if (this.left) {
                    this.left.delete(key, value);
                }
                return;
            }

            if (local.nedb.sortCompare(key, this.key) > 0) {
                if (this.right) {
                    this.right.delete(key, value);
                }
                return;
            }

            if (local.nedb.sortCompare(key, this.key) !== 0) {
                return;
            }

            // Delete only a value
            if (this.data.length > 1 && value !== undefined) {
                this.data.forEach(function (d) {
                    if (d !== value) {
                        newData.push(d);
                    }
                });
                self.data = newData;
                return;
            }

            // Delete the whole node
            if (this.deleteIfLeaf()) {
                return;
            }
            if (this.deleteIfOnlyOneChild()) {
                return;
            }

            // We are in the case where the node to delete has two children
            if (Math.random() >= 0.5) { // Randomize replacement to avoid unbalancing the tree too much
                // Use the in-order predecessor
                replaceWith = this.left.getMaxKeyDescendant();

                this.key = replaceWith.key;
                this.data = replaceWith.data;

                if (this === replaceWith.parent) { // Special case
                    this.left = replaceWith.left;
                    if (replaceWith.left) {
                        replaceWith.left.parent = replaceWith.parent;
                    }
                } else {
                    replaceWith.parent.right = replaceWith.left;
                    if (replaceWith.left) {
                        replaceWith.left.parent = replaceWith.parent;
                    }
                }
            } else {
                // Use the in-order successor
                replaceWith = this.right.getMinKeyDescendant();

                this.key = replaceWith.key;
                this.data = replaceWith.data;

                if (this === replaceWith.parent) { // Special case
                    this.right = replaceWith.right;
                    if (replaceWith.right) {
                        replaceWith.right.parent = replaceWith.parent;
                    }
                } else {
                    replaceWith.parent.left = replaceWith.right;
                    if (replaceWith.right) {
                        replaceWith.right.parent = replaceWith.parent;
                    }
                }
            }
        };
        local.nedb.AvlTree.prototype.executeOnEveryNode = function (fn) {
        /**
         * Execute a function on every node of the tree, in key order
         * @param {Function} fn Signature: node. Most useful will probably be node.key and node.data
         */
            if (this.left) {
                this.left.executeOnEveryNode(fn);
            }
            fn(this);
            if (this.right) {
                this.right.executeOnEveryNode(fn);
            }
        };
        local.nedb.AvlTree.prototype.balanceFactor = function () {
        /**
         * Return the balance factor
         */
            var leftH = this.left ? this.left.height : 0,
                rightH = this.right ? this.right.height : 0;
            return leftH - rightH;
        };

        local.nedb.AvlTree.prototype.rightRotation = function () {
        /**
         * Perform a right rotation of the tree if possible
         * and return the root of the resulting tree
         * The resulting tree's nodes' heights are also updated
         */
            var q = this, p = this.left, b, ah, bh, ch;

            if (!p) {
                return this;
            } // No change

            b = p.right;

            // Alter tree structure
            if (q.parent) {
                p.parent = q.parent;
                if (q.parent.left === q) {
                    q.parent.left = p;
                } else {
                    q.parent.right = p;
                }
            } else {
                p.parent = null;
            }
            p.right = q;
            q.parent = p;
            q.left = b;
            if (b) {
                b.parent = q;
            }

            // Update heights
            ah = p.left ? p.left.height : 0;
            bh = b ? b.height : 0;
            ch = q.right ? q.right.height : 0;
            q.height = Math.max(bh, ch) + 1;
            p.height = Math.max(ah, q.height) + 1;

            return p;
        };
        local.nedb.AvlTree.prototype.leftRotation = function () {
        /**
         * Perform a left rotation of the tree if possible
         * and return the root of the resulting tree
         * The resulting tree's nodes' heights are also updated
         */
            var p = this, q = this.right, b, ah, bh, ch;

            if (!q) {
                return this;
            } // No change

            b = q.left;

            // Alter tree structure
            if (p.parent) {
                q.parent = p.parent;
                if (p.parent.left === p) {
                    p.parent.left = q;
                } else {
                    p.parent.right = q;
                }
            } else {
                q.parent = null;
            }
            q.left = p;
            p.parent = q;
            p.right = b;
            if (b) {
                b.parent = p;
            }

            // Update heights
            ah = p.left ? p.left.height : 0;
            bh = b ? b.height : 0;
            ch = q.right ? q.right.height : 0;
            p.height = Math.max(ah, bh) + 1;
            q.height = Math.max(ch, p.height) + 1;

            return q;
        };
        local.nedb.AvlTree.prototype.rightTooSmall = function () {
        /**
         * Modify the tree if its right subtree is too small compared to the left
         * Return the new root if any
         */
            if (this.balanceFactor() <= 1) {
                return this;
            } // Right is not too small, don't change

            if (this.left.balanceFactor() < 0) {
                this.left.leftRotation();
            }

            return this.rightRotation();
        };
        local.nedb.AvlTree.prototype.leftTooSmall = function () {
        /**
         * Modify the tree if its left subtree is too small compared to the right
         * Return the new root if any
         */
            if (this.balanceFactor() >= -1) {
                return this;
            } // Left is not too small, don't change

            if (this.right.balanceFactor() > 0) {
                this.right.rightRotation();
            }

            return this.leftRotation();
        };
        local.nedb.AvlTree.prototype.rebalanceAlongPath = function (path) {
        /**
         * Rebalance the tree along the given path. The path is given reversed (as he was calculated
         * in the insert and delete functions).
         * Returns the new root of the tree
         * Of course, the first element of the path must be the root of the tree
         */
            var newRoot = this, rotated, ii;

            if (!this.hasOwnProperty('key')) {
                delete this.height;
                return this;
            } // Empty tree

            // Rebalance the tree and update all heights
            for (ii = path.length - 1; ii >= 0; ii -= 1) {
                path[ii].height = 1 + Math.max(path[ii].left ? path[ii].left.height : 0, path[ii].right ? path[ii].right.height : 0);

                if (path[ii].balanceFactor() > 1) {
                    rotated = path[ii].rightTooSmall();
                    if (ii === 0) {
                        newRoot = rotated;
                    }
                }

                if (path[ii].balanceFactor() < -1) {
                    rotated = path[ii].leftTooSmall();
                    if (ii === 0) {
                        newRoot = rotated;
                    }
                }
            }

            return newRoot;
        };
        local.nedb.AvlTree.prototype.insert = function (key, value) {
        /**
         * Insert a key, value pair in the tree while maintaining the AvlTree height constraint
         * Return a pointer to the root node, which may have changed
         */
            var error,
                insertPath = [],
                currentNode = this;

            // Empty tree, insert as root
            if (!this.hasOwnProperty('key')) {
                this.key = key;
                this.data.push(value);
                this.height = 1;
                return this;
            }

            // Insert new leaf at the right place
            while (true) {
                // Same key: no change in the tree structure
                if (local.nedb.sortCompare(currentNode.key, key) === 0) {
                    if (currentNode.unique) {
                        error = new Error("Can't insert key " + key + ", it violates the unique constraint");
                        error.key = key;
                        error.errorType = 'uniqueViolated';
                        throw error;
                    }
                    currentNode.data.push(value);
                    return this;
                }

                insertPath.push(currentNode);

                if (local.nedb.sortCompare(key, currentNode.key) < 0) {
                    if (!currentNode.left) {
                        insertPath.push(currentNode.createLeftChild({
                            key: key,
                            value: value
                        }));
                        break;
                    }
                    currentNode = currentNode.left;
                } else {
                    if (!currentNode.right) {
                        insertPath.push(currentNode.createRightChild({
                            key: key,
                            value: value
                        }));
                        break;
                    }
                    currentNode = currentNode.right;
                }
            }

            return this.rebalanceAlongPath(insertPath);
        };

        local.nedb.AvlTree.prototype.delete = function (key, value) {
        /**
         * Delete a key or just a value and return the new root of the tree
         * @param {Key} key
         * @param {Value} value Optional. If not set, the whole key is deleted. If set, only this value is deleted
         */
            var newData = [], replaceWith, currentNode = this, deletePath = [];

            if (!this.hasOwnProperty('key')) {
                return this;
            } // Empty tree

            // Either no match is found and the function will return from within the loop
            // Or a match is found and deletePath will contain the path from the root to the node to delete after the loop
            while (true) {
                if (local.nedb.sortCompare(key, currentNode.key) === 0) {
                    break;
                }

                deletePath.push(currentNode);

                if (local.nedb.sortCompare(key, currentNode.key) < 0) {
                    if (currentNode.left) {
                        currentNode = currentNode.left;
                    } else {
                        return this; // Key not found, no modification
                    }
                } else {
                    // local.nedb.sortCompare(key, currentNode.key) is > 0
                    if (currentNode.right) {
                        currentNode = currentNode.right;
                    } else {
                        return this; // Key not found, no modification
                    }
                }
            }

            // Delete only a value (no tree modification)
            if (currentNode.data.length > 1 && value) {
                currentNode.data.forEach(function (d) {
                    if (d !== value) {
                        newData.push(d);
                    }
                });
                currentNode.data = newData;
                return this;
            }

            // Delete a whole node

            // Leaf
            if (!currentNode.left && !currentNode.right) {
                if (currentNode === this) { // This leaf is also the root
                    delete currentNode.key;
                    currentNode.data = [];
                    delete currentNode.height;
                    return this;
                }
                if (currentNode.parent.left === currentNode) {
                    currentNode.parent.left = null;
                } else {
                    currentNode.parent.right = null;
                }
                return this.rebalanceAlongPath(deletePath);
            }
            // Node with only one child
            if (!currentNode.left || !currentNode.right) {
                replaceWith = currentNode.left || currentNode.right;

                if (currentNode === this) { // This node is also the root
                    replaceWith.parent = null;
                    return replaceWith; // height of replaceWith is necessarily 1 because the tree was balanced before deletion
                }
                if (currentNode.parent.left === currentNode) {
                    currentNode.parent.left = replaceWith;
                    replaceWith.parent = currentNode.parent;
                } else {
                    currentNode.parent.right = replaceWith;
                    replaceWith.parent = currentNode.parent;
                }
                return this.rebalanceAlongPath(deletePath);
            }
            // Node with two children
            // Use the in-order predecessor (no need to randomize since we actively rebalance)
            deletePath.push(currentNode);
            replaceWith = currentNode.left;

            // Special case: the in-order predecessor is right below the node to delete
            if (!replaceWith.right) {
                currentNode.key = replaceWith.key;
                currentNode.data = replaceWith.data;
                currentNode.left = replaceWith.left;
                if (replaceWith.left) {
                    replaceWith.left.parent = currentNode;
                }
                return this.rebalanceAlongPath(deletePath);
            }

            // After this loop, replaceWith is the right-most leaf in the left subtree
            // and deletePath the path from the root (inclusive) to replaceWith (exclusive)
            while (true) {
                if (replaceWith.right) {
                    deletePath.push(replaceWith);
                    replaceWith = replaceWith.right;
                } else {
                    break;
                }
            }

            currentNode.key = replaceWith.key;
            currentNode.data = replaceWith.data;

            replaceWith.parent.right = replaceWith.left;
            if (replaceWith.left) {
                replaceWith.left.parent = replaceWith.parent;
            }

            return this.rebalanceAlongPath(deletePath);
        };

        function projectForUnique(elt) {
        /**
         * Type-aware projection
         */
            if (elt === null) {
                return '$null';
            }
            if (typeof elt === 'string') {
                return '$string' + elt;
            }
            if (typeof elt === 'boolean') {
                return '$boolean' + elt;
            }
            if (typeof elt === 'number') {
                return '$number' + elt;
            }
            if (Array.isArray(elt)) {
                return '$date' + elt.getTime();
            }

            return elt; // Arrays and objects, will check for pointer equality
        }
        local.nedb.Index = function (options) {
        /**
         * Create a new index
         * All methods on an index guarantee that either the whole operation was successful and the index changed
         * or the operation was unsuccessful and an error is thrown while the index is unchanged
         * @param {String} options.fieldName On which field should the index apply (can use dot notation to index on sub fields)
         * @param {Boolean} options.unique Optional, enforce a unique constraint (default: false)
         * @param {Boolean} options.sparse Optional, allow a sparse index (we can have dbRow's for which fieldName is undefined) (default: false)
         */
            this.fieldName = options.fieldName;
            this.isInteger = options.isInteger;

            this.unique = options.unique || false;
            this.sparse = options.sparse || false;

            this.reset(); // No data in the beginning
        };
        local.nedb.Index.prototype.reset = function (dbRowList) {
        /**
         * Reset an index
         * @param {dbRow or Array of dbRow's} dbRowList Optional, data to initialize the index with
         *                                                 If an error is thrown during insertion, the index is not modified
         */
            this.tree = new local.nedb.AvlTree({ unique: this.unique });
            if (dbRowList) {
                this.insert(dbRowList);
            }
        };
        local.nedb.Index.prototype.insert = function (dbRow) {
        /**
         * Insert a new dbRow in the index
         * If an array is passed, we insert all its elements (if one insertion fails the index is not modified)
         * O(log(n))
         */
            var key, keys, ii, failingI, error, self = this;

            if (Array.isArray(dbRow)) {
                self.insertMultipleDocs(dbRow);
                return;
            }

            key = local.nedb.queryGetDotValue(dbRow, self.fieldName);

            // We don't index dbRow's that don't contain the field if the index is sparse
            if (key === undefined && self.sparse) {
                return;
            }

            // auto-create keyUnique
            if (self.unique && !(key === 0 || key) && self.fieldName.indexOf('.') < 0) {
                while (true) {
                    key = self.isInteger
                        ? Math.floor(Math.random() * 0x20000000000000)
                        : ('a' +
                            Math.random().toString(36).slice(2) +
                            Math.random().toString(36).slice(2)).slice(0, 16);
                    if (!self.getMatching(key).length) {
                        break;
                    }
                }
                dbRow[self.fieldName] = key;
            }

            if (!Array.isArray(key)) {
                self.tree = self.tree.insert(key, dbRow);
            } else {
                // If an insert fails due to a unique constraint, roll back all inserts before it
                keys = local.nedb.listUnique(key).map(projectForUnique);

                for (ii = 0; ii < keys.length; ii += 1) {
                    try {
                        self.tree = self.tree.insert(keys[ii], dbRow);
                    } catch (errorCaught) {
                        error = errorCaught;
                        failingI = ii;
                        break;
                    }
                }

                if (error) {
                    for (ii = 0; ii < failingI; ii += 1) {
                        self.tree = self.tree.delete(keys[ii], dbRow);
                    }

                    throw error;
                }
            }
        };
        local.nedb.Index.prototype.insertMultipleDocs = function (dbRowList) {
        /**
         * Insert an array of dbRow's in the index
         * If a constraint is violated, the changes should be rolled back and an error thrown
         *
         * @API private
         */
            var ii, error, failingI;

            for (ii = 0; ii < dbRowList.length; ii += 1) {
                try {
                    this.insert(dbRowList[ii]);
                } catch (errorCaught) {
                    error = errorCaught;
                    failingI = ii;
                    break;
                }
            }

            if (error) {
                for (ii = 0; ii < failingI; ii += 1) {
                    this.remove(dbRowList[ii]);
                }

                throw error;
            }
        };
        local.nedb.Index.prototype.remove = function (dbRow) {
        /**
         * Remove a dbRow from the index
         * If an array is passed, we remove all its elements
         * The remove operation is safe with regards to the 'unique' constraint
         * O(log(n))
         */
            var key, self = this;

            if (Array.isArray(dbRow)) {
                dbRow.forEach(function (d) {
                    self.remove(d);
                });
                return;
            }

            key = local.nedb.queryGetDotValue(dbRow, self.fieldName);

            if (key === undefined && self.sparse) {
                return;
            }

            if (!Array.isArray(key)) {
                self.tree = self.tree.delete(key, dbRow);
            } else {
                local.nedb.listUnique(key).map(projectForUnique).forEach(function (_key) {
                    self.tree = self.tree.delete(_key, dbRow);
                });
            }
        };
        local.nedb.Index.prototype.update = function (oldDoc, newDoc) {
        /**
         * Update a dbRow in the index
         * If a constraint is violated, changes are rolled back and an error thrown
         * Naive implementation, still in O(log(n))
         */
            if (Array.isArray(oldDoc)) {
                this.updateMultipleDocs(oldDoc);
                return;
            }

            this.remove(oldDoc);

            try {
                this.insert(newDoc);
            } catch (errorCaught) {
                this.insert(oldDoc);
                throw errorCaught;
            }
        };
        local.nedb.Index.prototype.updateMultipleDocs = function (pairs) {
        /**
         * Update multiple dbRow's in the index
         * If a constraint is violated, the changes need to be rolled back
         * and an error thrown
         * @param {Array of oldDoc, newDoc pairs} pairs
         *
         * @API private
         */
            var ii, failingI, error;

            for (ii = 0; ii < pairs.length; ii += 1) {
                this.remove(pairs[ii].oldDoc);
            }

            for (ii = 0; ii < pairs.length; ii += 1) {
                try {
                    this.insert(pairs[ii].newDoc);
                } catch (errorCaught) {
                    error = errorCaught;
                    failingI = ii;
                    break;
                }
            }

            // If an error was raised, roll back changes in the inverse order
            if (error) {
                for (ii = 0; ii < failingI; ii += 1) {
                    this.remove(pairs[ii].newDoc);
                }

                for (ii = 0; ii < pairs.length; ii += 1) {
                    this.insert(pairs[ii].oldDoc);
                }

                throw error;
            }
        };
        local.nedb.Index.prototype.getMatching = function (value) {
        /**
         * Get all dbRow's in index whose key match value (if it is a Thing) or one of the elements of value (if it is an array of Things)
         * @param {Thing} value Value to match the key against
         * @return {Array of dbRow's}
         */
            var self = this, _res = {}, res = [];
            if (!Array.isArray(value)) {
                return self.tree.search(value);
            }
            value.forEach(function (v) {
                self.getMatching(v).forEach(function (dbRow) {
                    _res[dbRow._id] = dbRow;
                });
            });

            Object.keys(_res).forEach(function (_id) {
                res.push(_res[_id]);
            });

            return res;
        };
        local.nedb.Index.prototype.getBetweenBounds = function (query) {
        /**
         * Get all dbRow's in index whose key is between bounds are they are defined by query
         * dbRow's are sorted by key
         * @param {Query} query
         * @return {Array of dbRow's}
         */
            return this.tree.betweenBounds(query);
        };
        local.nedb.Persistence = function (options) {
        /**
         * Handle every persistence-related task
         * The interface Datastore expects to be implemented is
         * * Persistence.persistNewState(newDocs, callback) where newDocs is an array of dbRow's and callback has signature error
         *
         * Create a new Persistence object for database options.db
         * @param {Datastore} options.db
         */
            this.db = options.db;
        };
        local.nedb.Persistence.prototype.persistCachedDatabase = function (onError) {
        /**
         * Persist cached database
         * This serves as a compaction function since the cache always contains only the number of dbRow's in the dbTable
         * while the data file is append-only so it may grow larger
         * @param {Function} onError - callback, signature: error
         */
            var toPersist = '',
                self = this;

            local.nedb.dbTableFindAll(self.db).forEach(function (dbRow) {
                toPersist += JSON.stringify(dbRow) + '\n';
            });
            Object.keys(self.db.indexes).forEach(function (fieldName) {
                if (fieldName !== '_id') { // The special _id index is managed by datastore.js, the others need to be persisted
                    toPersist += JSON.stringify({
                        $$indexCreated: {
                            fieldName: fieldName,
                            unique: self.db.indexes[fieldName].unique,
                            sparse: self.db.indexes[fieldName].sparse
                        }
                    }) + '\n';
                }
            });

            local.nedb.dbStorageSetItem(self.db.name, toPersist, onError);
        };
        local.nedb.Persistence.prototype.persistNewState = function (newDocs, onError) {
        /**
         * Persist new state for the given newDocs (can be insertion, update or removal)
         * Use an append-only format
         * @param {Array} newDocs Can be empty if no dbRow was updated/removed
         * @param {Function} onError Optional, signature: error
         */
            var self = this,
                toPersist = '';

            newDocs.forEach(function (dbRow) {
                toPersist += JSON.stringify(dbRow) + '\n';
            });

            if (toPersist.length === 0) {
                return onError();
            }

            local.nedb.dbStorageGetItem(self.db.name, function (error, data) {
                // validate no error occurred
                local.nedb.assert(!error, error);
                local.nedb.dbStorageSetItem(self.db.name, (data || '') + toPersist, onError);
            });
        };
        local.nedb.Persistence.prototype.treatRawData = function (rawData) {
        /**
         * From a database's raw data, return the corresponding
         * machine understandable dbTable
         */
            var data = rawData.split('\n'),
                dataById = {},
                dbRow,
                tdata = [],
                ii,
                indexes = {},
                corruptItems = -1; // Last line of every data file is usually blank so not really corrupt

            for (ii = 0; ii < data.length; ii += 1) {
                try {
                    dbRow = JSON.parse(data[ii]);
                    if (dbRow._id) {
                        if (dbRow.$$deleted === true) {
                            delete dataById[dbRow._id];
                        } else {
                            dataById[dbRow._id] = dbRow;
                        }
                    } else if (dbRow.$$indexCreated && dbRow.$$indexCreated.fieldName !== undefined) {
                        indexes[dbRow.$$indexCreated.fieldName] = dbRow.$$indexCreated;
                    } else if (typeof dbRow.$$indexRemoved === 'string') {
                        delete indexes[dbRow.$$indexRemoved];
                    }
                } catch (errorCaught) {
                    corruptItems += 1;
                    // validate no error occurred
                    local.nedb.assert(!corruptItems, errorCaught);
                }
            }

            Object.keys(dataById).forEach(function (k) {
                tdata.push(dataById[k]);
            });

            return {
                data: tdata,
                indexes: indexes
            };
        };
        local.nedb.Cursor = function (db, query, onError) {
        /**
         * Create a new cursor for this dbTable
         * @param {Datastore} db - The datastore this cursor is bound to
         * @param {Query} query - The query this cursor will operate on
         * @param {Function} onError - Handler to be executed after cursor has found the results and before the callback passed to find/findOne/update/remove
         */
            this.db = db;
            this.query = query || {};
            if (onError) {
                this.onError = onError;
            }
        };
        local.nedb.Cursor.prototype.limit = function (limit) {
        /**
         * Set a limit to the number of results
         */
            this._limit = limit;
            return this;
        };
        local.nedb.Cursor.prototype.project = function (candidates) {
        /**
         * Apply the projection
         */
            var res = [], self = this, keepId, action, keys;

            if (self._projection === undefined || Object.keys(self._projection).length === 0) {
                return candidates;
            }

            keepId = self._projection._id === 0 ? false : true;

            // Check for consistency
            keys = Object.keys(self._projection).filter(function (key) {
                return key !== '_id';
            });
            keys.forEach(function (k) {
                if (action !== undefined && self._projection[k] !== action) {
                    throw new Error("Can't both keep and omit fields except for _id");
                }
                action = self._projection[k];
            });

            // Do the actual projection
            candidates.forEach(function (candidate) {
                var toPush;
                if (action === 1) { // pick-type projection
                    toPush = {
                        $set: {}
                    };
                    keys.forEach(function (k) {
                        toPush.$set[k] = local.nedb.queryGetDotValue(candidate, k);
                        if (toPush.$set[k] === undefined) {
                            delete toPush.$set[k];
                        }
                    });
                    toPush = local.nedb.dbRowModify({}, toPush);
                } else { // omit-type projection
                    toPush = {
                        $unset: {}
                    };
                    keys.forEach(function (k) {
                        toPush.$unset[k] = true;
                    });
                    toPush = local.nedb.dbRowModify(candidate, toPush);
                }
                if (keepId) {
                    toPush._id = candidate._id;
                } else {
                    delete toPush._id;
                }
                res.push(toPush);
            });

            return res;
        };
        local.nedb.Cursor.prototype._exec = function (_onError) {
        /**
         * Get all matching elements
         * Will return pointers to matched elements (shallow copies), returning full copies is the role of find or findOne
         * This is an internal function, use exec which uses the executor
         *
         * @param {Function} onError - Signature: error, results
         */
            var res = [], added = 0, skipped = 0, self = this;

            function onError(error) {
                if (self.onError) {
                    return self.onError(error, res, _onError);
                }
                return _onError(error, res);
            }

            self.db.getCandidates(self.query, function (error, candidates) {
                var criteria, limit, skip;
                if (error) {
                    return onError(error);
                }

                try {
                    candidates.some(function (element) {
                        if (local.nedb.queryMatch(element, self.query)) {
                            // If a sort is defined, wait for the results to be sorted before applying limit and skip
                            if (!self._sort) {
                                if (self._skip && self._skip > skipped) {
                                    skipped += 1;
                                } else {
                                    res.push(element);
                                    added += 1;
                                    if (self._limit && self._limit <= added) {
                                        return true;
                                    }
                                }
                            } else {
                                res.push(element);
                            }
                        }
                    });
                } catch (errorCaught) {
                    return onError(errorCaught);
                }

                // Apply all sorts
                if (self._sort) {

                    // Sorting
                    criteria = [];
                    Object.keys(self._sort).forEach(function (key) {
                        criteria.push({
                            key: key,
                            direction: self._sort[key]
                        });
                    });
                    res.sort(function (aa, bb) {
                        var criterion, compare, ii;
                        for (ii = 0; ii < criteria.length; ii += 1) {
                            criterion = criteria[ii];
                            compare = criterion.direction * local.nedb.sortCompare(
                                local.nedb.queryGetDotValue(aa, criterion.key),
                                local.nedb.queryGetDotValue(bb, criterion.key)
                            );
                            if (compare !== 0) {
                                return compare;
                            }
                        }
                        return 0;
                    });

                    // Applying limit and skip
                    limit = self._limit || res.length;
                    skip = self._skip || 0;

                    res = res.slice(skip, skip + limit);
                }

                // Apply projection
                try {
                    res = self.project(res);
                } catch (errorCaught) {
                    error = errorCaught;
                }

                return onError(error);
            });
        };

        local.nedb._Table = function () {
        /**
         * Create a new dbTable
         * @param {String} options.name
         * with the error object as parameter. If you don't pass it the error will be thrown
         */
            return;
        };

        local.nedb._Table.prototype.addToIndexes = function (dbRow) {
        /**
         * Add one or several dbRow(s) to all indexes
         */
            var ii, failingIndex, error, keys = Object.keys(this.indexes);

            for (ii = 0; ii < keys.length; ii += 1) {
                try {
                    this.indexes[keys[ii]].insert(dbRow);
                } catch (errorCaught) {
                    failingIndex = ii;
                    error = errorCaught;
                    break;
                }
            }
            // If an error happened, we need to rollback the insert on all other indexes
            if (error) {
                for (ii = 0; ii < failingIndex; ii += 1) {
                    this.indexes[keys[ii]].remove(dbRow);
                }

                throw error;
            }
        };

        local.nedb._Table.prototype.removeFromIndexes = function (dbRow) {
        /**
         * Remove one or several dbRow(s) from all indexes
         */
            var self = this;

            Object.keys(this.indexes).forEach(function (ii) {
                self.indexes[ii].remove(dbRow);
            });
        };

        local.nedb._Table.prototype.updateIndexes = function (oldDoc, newDoc) {
        /**
         * Update one or several dbRow's in all indexes
         * To update multiple dbRow's, oldDoc must be an array of { oldDoc, newDoc } pairs
         * If one update violates a constraint, all changes are rolled back
         */
            var ii, keys = Object.keys(this.indexes);

            for (ii = 0; ii < keys.length; ii += 1) {
                this.indexes[keys[ii]].update(oldDoc, newDoc);
            }
        };

        local.nedb._Table.prototype.getCandidates = function (query, onError) {
        /**
         * Return the list of candidates for a given query
         * Crude implementation for now, we return the candidates given by the first usable index if any
         * We try the following query types, in this order: basic match, $in match, comparison match
         * One way to make it better would be to enable the use of multiple indexes if the first usable index
         * returns too much data. I may do it in the future.
         *
         * Returned candidates will be scanned to find and remove all expired dbRow's
         *
         * @param {Query} query
         * @param {Function} onError Signature error, candidates
         */
            var self = this,
                onParallel,
                options,
                usableQueryKeys;
            options = {};
            local.nedb.onNext(options, function (error, data) {
                // jslint-hack
                local.nedb.nop(error);
                switch (options.modeNext) {
                // STEP 1: get candidates list by checking indexes from most to least frequent usecase
                case 1:
                    // For a basic match
                    usableQueryKeys = [];
                    Object.keys(query).forEach(function (k) {
                        if (typeof query[k] === 'string' || typeof query[k] === 'number' || typeof query[k] === 'boolean' || query[k] === null) {
                            usableQueryKeys.push(k);
                        }
                    });
                    usableQueryKeys = usableQueryKeys.filter(function (element) {
                        return self.indexes.hasOwnProperty(element);
                    });
                    if (usableQueryKeys.length > 0) {
                        return options.onNext(null, self.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]]));
                    }

                    // For a $in match
                    usableQueryKeys = [];
                    Object.keys(query).forEach(function (k) {
                        if (query[k] && query[k].hasOwnProperty('$in')) {
                            usableQueryKeys.push(k);
                        }
                    });
                    usableQueryKeys = usableQueryKeys.filter(function (element) {
                        return self.indexes.hasOwnProperty(element);
                    });
                    if (usableQueryKeys.length > 0) {
                        return options.onNext(null, self.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]].$in));
                    }

                    // For a comparison match
                    usableQueryKeys = [];
                    Object.keys(query).forEach(function (k) {
                        if (query[k] && (query[k].hasOwnProperty('$lt') || query[k].hasOwnProperty('$lte') || query[k].hasOwnProperty('$gt') || query[k].hasOwnProperty('$gte'))) {
                            usableQueryKeys.push(k);
                        }
                    });
                    usableQueryKeys = usableQueryKeys.filter(function (element) {
                        return self.indexes.hasOwnProperty(element);
                    });
                    if (usableQueryKeys.length > 0) {
                        return options.onNext(null, self.indexes[usableQueryKeys[0]].getBetweenBounds(query[usableQueryKeys[0]]));
                    }

                    // By default, return all the DB data
                    return options.onNext(null, local.nedb.dbTableFindAll(self));
                // STEP 2: remove all expired dbRow's
                default:
                    var validDocs = [],
                        ttlIndexesFieldNames = Object.keys(self.ttlIndexes);
                    onParallel = local.nedb.onParallel(function (error) {
                        onError(error, validDocs);
                    });
                    onParallel.counter += 1;
                    data.forEach(function (dbRow) {
                        var valid = true;
                        ttlIndexesFieldNames.forEach(function (ii) {
                            if (dbRow[ii] !== undefined && Date.now() > new Date(dbRow[ii]).getTime() + self.ttlIndexes[ii] * 1000) {
                                valid = false;
                            }
                        });
                        if (valid) {
                            validDocs.push(dbRow);
                        } else {
                            onParallel.counter += 1;
                            self.remove({ _id: dbRow._id }, {}, onParallel);
                        }
                    });
                    onParallel();
                }
            });
            options.modeNext = 0;
            options.onNext();
        };

        local.nedb._Table.prototype.insert = function (newDoc, onError) {
        /**
         * Insert a new dbRow
         * @param {Function} onError - callback, signature: error, insertedDoc
         *
         * @api private Use Datastore.insert which has the same signature
         */
            var self, preparedDoc;
            self = this;
            preparedDoc = self.prepareDocumentForInsertion(newDoc);
            self._insertInCache(preparedDoc);
            self.persistence.persistNewState(Array.isArray(preparedDoc) ? preparedDoc : [preparedDoc], function (error) {
                if (error) {
                    return onError(error);
                }
                return onError(null, local.nedb.jsonCopy(preparedDoc));
            });
        };

        local.nedb._Table.prototype.prepareDocumentForInsertion = function (newDoc) {
        /**
         * Prepare a dbRow (or array of dbRow's) to be inserted in a database
         * Meaning adds _id and timestamps if necessary on a copy of newDoc to avoid any side effect on user input
         * @api private
         */
            var preparedDoc, now, self = this;

            if (Array.isArray(newDoc)) {
                preparedDoc = [];
                newDoc.forEach(function (dbRow) {
                    preparedDoc.push(self.prepareDocumentForInsertion(dbRow));
                });
            } else {
                preparedDoc = local.nedb.jsonCopy(newDoc);
                now = new Date().toISOString();
                if (preparedDoc.createdAt === undefined) {
                    preparedDoc.createdAt = now;
                }
                if (preparedDoc.updatedAt === undefined) {
                    preparedDoc.updatedAt = now;
                }
                local.nedb.dbRowCheckObject(preparedDoc);
            }

            return preparedDoc;
        };

        local.nedb._Table.prototype._insertInCache = function (preparedDoc) {
        /**
         * If newDoc is an array of dbRow's, this will insert all dbRow's in the cache
         * @api private
         */
            if (Array.isArray(preparedDoc)) {
                this._insertMultipleDocsInCache(preparedDoc);
            } else {
                this.addToIndexes(preparedDoc);
            }
        };

        local.nedb._Table.prototype._insertMultipleDocsInCache = function (preparedDocs) {
        /**
         * If one insertion fails (e.g. because of a unique constraint), roll back all previous
         * inserts and throws the error
         * @api private
         */
            var ii, failingI, error;

            for (ii = 0; ii < preparedDocs.length; ii += 1) {
                try {
                    this.addToIndexes(preparedDocs[ii]);
                } catch (errorCaught) {
                    error = errorCaught;
                    failingI = ii;
                    break;
                }
            }

            if (error) {
                for (ii = 0; ii < failingI; ii += 1) {
                    this.removeFromIndexes(preparedDocs[ii]);
                }

                throw error;
            }
        };

        local.nedb._Table.prototype.update = function (query, updateQuery, options, onError) {
        /**
         * Update all docs matching query
         * @param {Object} query
         * @param {Object} updateQuery
         * @param {Object} options Optional options
         *                 options.multi If true, can update multiple dbRow's (defaults to false)
         *                 options.upsert If true, dbRow is inserted if the query doesn't match anything
         * @param {Function} onError - callback, signature: (error, numAffected, affectedDocuments, upsert)
         *                      If update was an upsert, upsert flag is set to true
         *                      affectedDocuments can be one of the following:
         *                        * For an upsert, the upserted dbRow
         *                        * For an update, the array of updated dbRow's
         *
         * WARNING: The API was changed between v1.7.4 and v1.8, for consistency and readability reasons. Prior and including to v1.7.4,
         *          the onError signature was (error, numAffected, updated) where updated was the updated dbRow in case of an upsert
         *          or the array of updated dbRow's for an update. That meant that the type of
         *          affectedDocuments in a non multi update depended on whether there was an upsert or not, leaving only two ways for the
         *          user to check whether an upsert had occured: checking the type of affectedDocuments or running another find query on
         *          the whole dataset to check its size. Both options being ugly, the breaking change was necessary.
         *
         * @api private Use Datastore.update which has the same signature
         */
            var self = this, numReplaced = 0, multi, upsert, ii;

            multi = options.multi !== undefined ? options.multi : false;
            upsert = options.upsert !== undefined ? options.upsert : false;

            options = {};
            local.nedb.onNext(options, function () {
                var cursor, modifiedDoc, modifications, createdAt;
                switch (options.modeNext) {
                case 1:
                    // If upsert option is set, check whether we need to insert the dbRow
                    if (!upsert) {
                        return options.onNext();
                    }

                    // Need to use an internal function not tied to the executor to avoid deadlock
                    cursor = new local.nedb.Cursor(self, query);
                    cursor.limit(1)._exec(function (error, docs) {
                        if (error) {
                            return onError(error);
                        }
                        if (docs.length === 1) {
                            return options.onNext();
                        }
                        var toBeInserted;

                        try {
                            local.nedb.dbRowCheckObject(updateQuery);
                            // updateQuery is a simple object with no modifier, use it as the dbRow to insert
                            toBeInserted = updateQuery;
                        } catch (errorCaught) {
                            // updateQuery contains modifiers, use the find query as the base,
                            // strip it from all operators and update it according to updateQuery
                            try {
                                toBeInserted = local.nedb.dbRowModify(local.nedb.dbRowDeepCopy(query, true), updateQuery);
                            } catch (errorCaught2) {
                                return onError(errorCaught2);
                            }
                        }

                        return self.insert(toBeInserted, function (error, newDoc) {
                            if (error) {
                                return onError(error);
                            }
                            return onError(null, 1, newDoc, true);
                        });
                    });
                    break;
                default:
                    // Perform the update
                    modifications = [];

                    self.getCandidates(query, function (error, candidates) {
                        if (error) {
                            return onError(error);
                        }

                        // Preparing update (if an error is thrown here neither the datafile nor
                        // the in-memory indexes are affected)
                        try {
                            for (ii = 0; ii < candidates.length; ii += 1) {
                                if (local.nedb.queryMatch(candidates[ii], query) && (multi || numReplaced === 0)) {
                                    numReplaced += 1;
                                    createdAt = candidates[ii].createdAt;
                                    modifiedDoc = local.nedb.dbRowModify(candidates[ii], updateQuery);
                                    modifiedDoc.createdAt = createdAt;
                                    modifiedDoc.updatedAt = new Date().toISOString();
                                    modifications.push({
                                        oldDoc: candidates[ii],
                                        newDoc: modifiedDoc
                                    });
                                }
                            }
                        } catch (errorCaught) {
                            return onError(errorCaught);
                        }

                        // Change the docs in memory
                        try {
                            self.updateIndexes(modifications);
                        } catch (errorCaught) {
                            return onError(errorCaught);
                        }

                        // Update the datafile
                        var updatedDocs = modifications.map(function (element) {
                            return element.newDoc;
                        });
                        self.persistence.persistNewState(updatedDocs, function (error) {
                            if (error) {
                                return onError(error);
                            }
                            var updatedDocsDC = [];
                            updatedDocs.forEach(function (dbRow) {
                                updatedDocsDC.push(local.nedb.jsonCopy(dbRow));
                            });
                            return onError(null, numReplaced, updatedDocsDC);
                        });
                    });
                }
            });
            options.modeNext = 0;
            options.onNext();
        };
    }());
    switch (local.modeJs) {



    // run browser js-env code - post-init
    case 'browser':
        // init exports
        local.global.nedb_lite = local.global.utility2_nedb = local.nedb;
        local.nedb.NODE_ENV = 'undefined';
        break;



    // run node js-env code - post-init
    case 'node':
        // require modules
        local.child_process = require('child_process');
        local.fs = require('fs');
        local.os = require('os');
        // init exports
        module.exports = module['./lib.nedb.js'] = local.nedb;
        local.nedb.__dirname = __dirname;
        local.nedb.NODE_ENV = process.env.NODE_ENV;
        break;
    }



    // run shared js-env code - post-init
    (function () {
        // init dbStorage
        local.nedb.dbStorageInit();
    }());
}());
