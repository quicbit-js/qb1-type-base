// Software License Agreement (ISC License)
//
// Copyright (c) 2017, Matthew Voss
//
// Permission to use, copy, modify, and/or distribute this software for
// any purpose with or without fee is hereby granted, provided that the
// above copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

var test = require('test-kit').tape()
var typeset = require('.')

test('names', function (t) {
    var ts = typeset([])
    t.table_assert([
        [ 'tnf',            'exp' ],
        [ 'tinyname',       [ '*', 'F', 'N', 'T', 'X', 'a', 'b', 'd', 'f', 'i', 'm', 'n', 'o', 'r', 's', 't', 'x' ] ],
        [ 'tinyname',       [ '*', 'F', 'N', 'T', 'X', 'a', 'b', 'd', 'f', 'i', 'm', 'n', 'o', 'r', 's', 't', 'x' ] ],
        [ 'name',           [ '*', 'arr', 'blb', 'boo', 'byt', 'dec', 'fal', 'flt', 'int', 'mul', 'nul', 'num', 'obj', 'rec', 'str', 'tru', 'typ' ] ],
        [ 'fullname',       [ 'any', 'array', 'blob', 'boolean', 'byte', 'decimal', 'false', 'float', 'integer', 'multi', 'null', 'number', 'object', 'record', 'string', 'true', 'type' ] ],
    ], function(tnf) { return ts.names(tnf) })
})

test('has_char', function (t) {
    t.table_assert([
        [ 's',          'c',      'e',       'exp' ],
        [ 'abc',        'd',      '^',       false ],
        [ 'abc',        'a',      '^',       true ],
        [ 'abc',        'b',      '^',       true ],
        [ 'abc',        'c',      '^',       true ],
        [ 'ab^c',       'c',      '^',       false ],
        [ 'ab^^c',      'c',      '^',       true ],
        [ 'ab^^^c',     'c',      '^',       false ],
    ], typeset.has_char)
})

test('obj_by_name', function (t) {
    t.table_assert([
        [
            'obj',
            'tset',
            'names_map',
            'exp',
        ],
        [
            { $n: 'xt', $d: 'an example type', $base: 'i' },
            [],
            { xt: 'xtype' },
            { $root: 'xtype', xtype: { base: 'int', name: 'xtype', desc: 'an example type' } }
        ],
        [
            // unnamed object
            { a: 'int', b: {x: 'string', y: ['int'] } },
            [],
            {},
            { $root: { base: 'rec', fields: { a: 'int', b: { base: 'rec', fields: { x: 'str', y: { base: 'arr', items: ['int'] } } } } } }
        ],
        [
            {
                $name: 't1', $description: 'a test type',
                a: 'int',
                b: {
                    x: 'str',
                    y: ['int']
                },
                c: 'foo'
            },
            [],
            { t1: 't1', foo: 'fooby' },
            {
                $root: 't1',
                t1: {
                    base: 'rec',
                    name: 't1', desc: 'a test type',
                    fields: {
                        a: 'int',
                        b: {
                            base: 'rec',
                            fields: {
                                x:'str',
                                y: { base: 'arr', items: ['int'] } }
                        },
                        c: 'fooby'
                    }
                },
            }
        ],
        [
            // keep stipulations intact (non-type args)
            {
                $name: 't1',
                a: 'int',
                b: {
                    x: 'str',
                    y: ['int']
                },
                $stip: { $n: 'x', string: 'int' }
            },
            [],
            { t1: 't1', x: 'x' },
            {
                $root: 't1',
                t1:    {
                    name: 't1',
                    base: 'rec',
                    fields: {
                        a: 'int',
                        b: {
                            base: 'rec',
                            fields: {
                                x:'str',
                                y: {
                                    base: 'arr',
                                    items: ['int']
                                }
                            }
                        }
                    },
                    stip: { $n: 'x', string: 'int' } },
            }
        ],
        [
            {
                $name: 't1',
                a: 'int',
                b: {
                    $name: 't2',
                    x: 'str',
                    y: ['int'],
                    c: 'xt'
                }
            },
            // [ { $n: 'xt', $d: 'an example type', $t: 'i' } ],  - need tset.put() to fix this
            [],
            { xt: 'xtype', t1: 't1', t2: 't2' },
            {
                $root: 't1',
                t1: {
                    name: 't1',
                    base: 'rec',
                    fields: {
                        a: 'int',
                        b: 't2' }
                },
                t2: {
                    name: 't2',
                    base: 'rec',
                    fields: {
                        x: 'str',
                        y: {
                            base: 'arr',
                            items: [ 'int' ]
                        },
                        c: 'xtype'
                    }
                },
            }
        ]
    ], function (obj, tset, names_map) { return typeset.obj_by_name(obj, typeset(tset), names_map) } )
})


test('get', function (t) {
    var ts = typeset([])
    t.table_assert([
        [ 'n',              'exp'  ],
        [ undefined,        undefined ],
        [ 'my_a',           undefined ],
        [ 's',              { name: 'str', desc: 'A string of unicode characters (code points in range 0..1114111)', tinyname: 's', fullname: 'string', stip: null } ],
        [ 'str',            { name: 'str', desc: 'A string of unicode characters (code points in range 0..1114111)', tinyname: 's', fullname: 'string', stip: null } ],
        [ 'string',         { name: 'str', desc: 'A string of unicode characters (code points in range 0..1114111)', tinyname: 's', fullname: 'string', stip: null } ],
    ], function (n) {
        return ts.get(n) })
})

test('put', function (t) {
    t.table_assert([
        [ 'n',                                      'exp'  ],
        [ { $name: 'an_int', $base: 'int' },        [ 'an_int',  { $n: 'an_int', $b: 'i' } ] ],
        [ ['int'],                                  [ '$root',   [ 'i' ] ] ],
        [ ['type'],                                 [ '$root',   [ 't' ] ] ],
        [ { $n: 'myt', $t: 'type' },                [ 'myt',     { $n: 'myt' } ] ],
        [ { $n: 'my_arr', $items: [], $base:'a' },  [ 'my_arr',  { $b: 'a', $n: 'my_arr', $items: [] } ] ],
        [ { $name: 'my_a' },                        [ 'my_a',    { $n: 'my_a' } ] ],
        [ { $name: 'my_b', $desc: 'type b' },       [ 'my_b',    { $n: 'my_b', $d: 'type b' } ] ],
        [ { $name: 'strobj', '*_str': 'string' },   [ 'strobj',  { $n: 'strobj', '*_str': 'str' } ] ],
    ], function (obj) {
        var ts = typeset([])
        var root = ts.put(obj)
        return [ root, ts.get(root) && ts.get(root).toObj(ts, {tnf:'tinyname'}) ]
    })
})

test('put and get obj', function (t) {
    t.table_assert([
        [ 'obj',                                                'n',        'exp', ],
        [ { $n: 'an_int', $b: 'int', $tn: 'ai' },               'ai',       { $b: 'i', $tn: 'ai', $n: 'an_int' } ],
        [ ['type'],                                             '$root',    [ 't' ] ],
        [ { $n: 'myarr', $items: ['str'], $b:'a', $tn: 'ma' },  'ma',       { $b: 'a', $n: 'myarr', $tn: 'ma', $items: ['s'] } ],
    ], function (obj, n) {
        var ts = typeset([])
        ts.put(obj)
        return ts.get(n).toObj(ts, {tnf: 'tinyname'})
    })
})

//
// Data objects can be of the form:
//
// {
//     $type: type,
//     $name: string,
//     $description: string,
//     $stip: stip,
//     $value: *,                   // a value that is of the specified $type and matching $stipulations
//     plain-properties...          // object and record values can be specified as non-dollar values
// }
/*
 test('self-described types', function (t) {
 t.table_assert([
 [ 'obj',   'exp'  ],
 [
 {
 $type: { $type: 'type', a: 'i', b: 's' },    // the type-type '$t' is redundant - known by context.
 a: 17,
 b: 'hi'
 }
 ],
 [
 {
 $type: { a: 'i', b: 's' },                  // ... so we can just do this to describe a record
 a: 17,
 b: 'hi'
 }
 ],
 [
 {
 $type: { '*': 'i|s' },                      // ... or describe generally as an object that allows any integer or string
 a: 17,
 b: 'hi'
 }
 ],
 [
 {
 $type: { '*': '*' },                       // ... or describe generally as an object that allows any value
 a: 17,
 b: 'hi'
 }
 ],
 ])
 })
 */