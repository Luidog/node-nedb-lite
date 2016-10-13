








































































/*
example.js

this script will will run a browser version of nedb

instruction
    1. save this script as example.js
    2. run the shell command:
        $ npm install nedb-lite && export PORT=8081 && node example.js
    3. open a browser to http://localhost:8081
    4. edit or paste script in browser to eval
*/

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
        /* istanbul ignore next */
        // re-init local
        local = local.modeJs === 'browser'
            ? window.Nedb.local
            : module.isRollup
            ? module
            : require('nedb-lite').local;
        // init global
        local.global = local.modeJs === 'browser'
            ? window
            : global;
        // export local
        local.global.local = local;
    }());
    switch (local.modeJs) {



    // run browser js-env code - post-init
    case 'browser':
        ['error', 'log'].forEach(function (key) {
            console['_' + key] = console[key];
            console[key] = function () {
                console['_' + key].apply(console, arguments);
                document.querySelector('#outputTextarea1').value +=
                    Array.prototype.slice.call(arguments).map(function (arg) {
                        return typeof arg === 'string'
                            ? arg
                            : local.Nedb.jsonStringifyOrdered(arg, null, 4);
                    }).join(' ') + '\n';
            };
        });
        /* istanbul ignore next */
        local.testRun = function (event) {
            var reader, tmp;
            switch (event && event.currentTarget.id) {
            case 'nedbExportButton1':
                tmp = window.URL.createObjectURL(new window.Blob([local.Nedb.dbExport()]));
                document.querySelector('#nedbExportA1').href = tmp;
                document.querySelector('#nedbExportA1').click();
                setTimeout(function () {
                    window.URL.revokeObjectURL(tmp);
                }, 30000);
                break;
            case 'nedbImportButton1':
                document.querySelector('#nedbImportInput1').click();
                break;
            case 'nedbImportInput1':
                document.querySelector('#outputTextarea1').value = '';
                console.log('importing nedb-database ...');
                reader = new window.FileReader();
                tmp = document.querySelector('#nedbImportInput1').files[0];
                if (!tmp) {
                    return;
                }
                reader.addEventListener('load', function () {
                    local.Nedb.dbImport(reader.result, function () {
                        console.log('... imported nedb-database');
                    });
                });
                reader.readAsText(tmp);
                break;
            case 'nedbResetButton1':
                document.querySelector('#outputTextarea1').value = '';
                console.log('resetting nedb-database ...');
                local.Nedb.dbReset(function () {
                    console.log('... resetted nedb-database');
                });
                break;
            case 'testRunButton1':
                local.modeTest = true;
                local.utility2.testRun(local);
                break;
            default:
                document.querySelector('#outputTextarea1').value = '';
                try {
                    /*jslint evil: true*/
                    eval(document.querySelector('#inputTextarea1').value);
                } catch (errorCaught) {
                    document.querySelector('#outputTextarea1').value = errorCaught.stack;
                }
            }
        };
        // init event-handling
        ['change', 'click', 'keyup'].forEach(function (event) {
            Array.prototype.slice.call(
                document.querySelectorAll('.on' + event)
            ).forEach(function (element) {
                element.addEventListener(event, local.testRun);
            });
        });
        // run tests
        local.testRun();
        break;



    /* istanbul ignore next */
    // run node js-env code - post-init
    case 'node':
        // export local
        module.exports = local;
        // require modules
        local.fs = require('fs');
        local.http = require('http');
        local.path = require('path');
        local.url = require('url');
        // init assets
        /* jslint-ignore-begin */
        local.templateIndexHtml = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>\n{{envDict.npm_package_name}} v{{envDict.npm_package_version}}\n</title>\n<style>\n/*csslint\n    box-sizing: false,\n    ids: false,\n    universal-selector: false\n*/\n* {\n    box-sizing: border-box;\n}\nbody {\n    background-color: #fff;\n    font-family: Helvetica Neue,Helvetica,Arial,sans-serif;\n}\nbody > * {\n    margin-bottom: 1rem;\n}\nbody > button {\n    width: 15rem;\n}\ntextarea {\n    font-family: monospace;\n    height: 16rem;\n    width: 100%;\n}\ntextarea[readonly] {\n    background-color: #ddd;\n}\n.zeroPixel {\n    border: 0;\n    height: 0;\n    margin: 0;\n    padding: 0;\n    width: 0;\n}\n</style>\n</head>\n<body>\n    <h1>\n<!-- utility2-comment\n        <a\n            {{#if envDict.npm_package_homepage}}\n            href="{{envDict.npm_package_homepage}}"\n            {{/if envDict.npm_package_homepage}}\n            target="_blank"\n        >\nutility2-comment -->\n            {{envDict.npm_package_name}} v{{envDict.npm_package_version}}\n<!-- utility2-comment\n        </a>\nutility2-comment -->\n<!-- utility2-comment\n        {{#if envDict.NODE_ENV}}\n        (NODE_ENV={{envDict.NODE_ENV}})\n        {{/if envDict.NODE_ENV}}\nutility2-comment -->\n    </h1>\n    <h3>{{envDict.npm_package_description}}</h3>\n<!-- utility2-comment\n    <h4><a download href="assets.app.js">download standalone app</a></h4>\n    <button class="onclick" id="testRunButton1">run internal test</button><br>\n    <div class="testReportDiv" style="display: none;"></div>\nutility2-comment -->\n\n    <button class="onclick" id="nedbResetButton1">reset nedb-database</button><br>\n    <button class="onclick" id="nedbExportButton1">save nedb-database to file</button><br>\n    <a download="nedb.persistence.json" href="" id="nedbExportA1"></a>\n    <button class="onclick" id="nedbImportButton1">load nedb-database from file</button><br>\n    <input class="onchange zeroPixel" type="file" id="nedbImportInput1">\n    <label>edit or paste script below to\n        <a\n            href="https://kaizhu256.github.io/node-nedb-lite/build/doc.api.html"\n            target="_blank"\n        >eval</a>\n    </label>\n<textarea class="onkeyup" id="inputTextarea1">\nwindow.table = new window.Nedb();\ntable.insert({ field1: "hello", field2: "world"}, console.log.bind(console));\n\nwindow.persistentTable1 = window.Nedb.dbTableCreate({ name: "persistentTable1" });\npersistentTable1.insert({ field1: "hello", field2: "world"}, function () {\n    console.log();\n    console.log(persistentTable1.export());\n});\n\nwindow.persistentTable2 = window.Nedb.dbTableCreate({ name: "persistentTable2" });\npersistentTable2.insert({ field1: "hello", field2: "world"}, function () {\n    console.log();\n    console.log(persistentTable2.export());\n});\n</textarea>\n    <label>stderr and stdout</label>\n    <textarea id="outputTextarea1" readonly></textarea>\n<!-- utility2-comment\n    {{#if isRollup}}\n    <script src="assets.app.min.js"></script>\n    {{#unless isRollup}}\nutility2-comment -->\n    <script src="assets.utility2.rollup.js"></script>\n    <script src="jsonp.utility2.stateInit?callback=window.utility2.stateInit"></script>\n    <script src="assets.nedb-lite.js"></script>\n    <script src="assets.example.js"></script>\n    <script src="assets.test.js"></script>\n<!-- utility2-comment\n    {{/if isRollup}}\nutility2-comment -->\n</body>\n</html>\n';



















































































































        /* jslint-ignore-end */
        local['/'] = local.templateIndexHtml
            .replace((/\{\{envDict\.(\w+?)\}\}/g), function (match0, match1) {
                // jslint-hack
                String(match0);
                switch (match1) {
                case 'npm_package_description':
                    return 'example module';
                case 'npm_package_name':
                    return 'example';
                case 'npm_package_version':
                    return '0.0.1';
                }
            });
        if (module.isRollup) {
            break;
        }
        try {
            local['/assets.example.js'] = local.fs.readFileSync(__filename, 'utf8');
        } catch (ignore) {
        }
        local['/assets.nedb-lite.js'] = local.fs.readFileSync(
            local.Nedb.__dirname + '/index.js',
            'utf8'
        );
        // run the cli
        if (module !== require.main) {
            break;
        }
        // start server
        console.log('server starting on port ' + process.env.PORT);
        local.http.createServer(function (request, response) {
            switch (local.url.parse(request.url).pathname) {
            case '/':
            case '/assets.example.js':
            case '/assets.nedb-lite.js':
            case '/assets.test.js':
                response.end(local[local.url.parse(request.url).pathname]);
                break;
            default:
                response.end();
            }
        }).listen(process.env.PORT);
        // if $npm_config_timeout_exit is defined,
        // then exit this process after $npm_config_timeout_exit ms
        if (Number(process.env.npm_config_timeout_exit)) {
            setTimeout(process.exit, Number(process.env.npm_config_timeout_exit));
        }
        break;
    }
}());