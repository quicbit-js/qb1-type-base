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
var qbobj = require('qb1-obj')
var tbase = require('.')

test('props', function (t) {
    t.table_assert([
        [ 'name',           'exp' ],
        [ 'type',           { n: 'type', tn: 't', fn: 'type' } ],
        [ 'arr',            { n: 'arr', tn: 'a', fn: 'array' } ],
    ], function (name) {
        var p = tbase.PROPS_BY_NAME[name]
        return { n: p.name, tn: p.tinyname, fn: p.fullname }
    } )
})

test('names', function (t) {
    t.table_assert([
        [ 'name_prop',            'exp' ],
        [ 'tinyname',       [ '*', 'F', 'N', 'T', 'X', 'a', 'b', 'd', 'f', 'i', 'm', 'n', 'o', 's', 't', 'x' ] ],
        [ 'name',           [ '*', 'arr', 'blb', 'boo', 'byt', 'dec', 'fal', 'flt', 'int', 'mul', 'nul', 'num', 'obj', 'str', 'tru', 'typ' ] ],
        [ null  ,           [ '*', 'arr', 'blb', 'boo', 'byt', 'dec', 'fal', 'flt', 'int', 'mul', 'nul', 'num', 'obj', 'str', 'tru', 'typ' ] ],
        [ 'fullname',       [ 'any', 'array', 'blob', 'boolean', 'byte', 'decimal', 'false', 'float', 'integer', 'multi', 'null', 'number', 'object', 'string', 'true', 'type' ] ],
    ], function(name_prop) { return tbase.names(name_prop) })
})

test('lookup', function (t) {
    t.table_assert([
        [ 'name',                                   'exp' ],
        [ 's',                                      { name: 'str', tinyname: 's', fullname: 'string', base: 'str' } ],
        [ 'str',                                    { name: 'str', tinyname: 's', fullname: 'string', base: 'str' } ],
        [ 'string',                                 { name: 'str', tinyname: 's', fullname: 'string', base: 'str' } ],
        [ 'typ',                                    { name: 'typ', tinyname: 't', fullname: 'type', base: 'typ' } ],
    ], function (name) {
        var t = tbase.lookup(name)
        return qbobj.select(t, ['name', 'tinyname', 'fullname', 'base'])
    })
})

test('create', function (t) {
    t.table_assert([
        [ 'obj_or_str',                             'exp'  ],
        [ {base: 'obj', fields: {a:'i'}},           { base: 'obj', fields: { a: 'i' }, expr: {} } ],
        [ {base: 'obj', expr: {'a*':'i'}},          { base: 'obj', fields: {}, expr: { 'a*': 'i' } } ],
        [ {base:'int'},                             { base: 'int' }],
        [ {base:'int', name: 'foo'},                { base: 'int', name: 'foo' } ],
        [ {base:'obj', name: 'foo'},                { base: 'obj', name: 'foo', fields: {}, expr: { '*': '*' } }],
    ], function (obj_or_str) {
        var t = tbase.create(obj_or_str)
        var ret = qbobj.filter(t, function (k,v) {
            return v != null && ! {
                type: 1,
                desc: 1,
                fullname: 1,
                tinyname: 1,
                stip: 1,
                code: 1,
            }[k]
        })
        return ret
    })
})

test('create errors', function (t) {
    t.table_assert([
        [ 'create',                             'exp'  ],
        [ null,                                 /Cannot read property/ ],
        [ {base: 'foo' },                       /unknown base/ ],
        [ {base: 'obj', type: 'foo' },          /not a type/ ],
        [ {base: 'int', tinyname: 'foo' },      /tinyname without name/ ],
        [ {base: 'int', fullname: 'foo' },      /fullname without name/ ],
    ], tbase.create, { assert: 'throws' })
})

test('fieldtyp', function (t) {
    t.table_assert([
        [ 'obj',                                                            'field',            'exp' ],
        [ { base: 'obj', fields: {a:'i'} },                                 'a',                'i' ],
        [ { base: 'obj', fields: {a:'i'}, expr: {'a*':'n'} },               'a',                'i' ],
        [ { base: 'obj', fields: {a:'i'}, expr: {'a*':'n'} },               'ba',               null ],
        [ { base: 'obj', fields: {a:'i'}, expr: {'a*':'n'} },               'ab',               'n' ],
        [ { base: 'obj', fields: {a:'i'}, expr: {'*a':'n', 'a*': 'o'} },    'ab',     'o' ],
    ], function (obj, field) {
        return tbase.create(obj).fieldtyp(field)
    })
})

test('generic object', function (t) {
    t.table_assert([
        [ 'obj',                                                                'exp' ],
        [ { base: 'obj', fields: {a:'i'} },                                     [ false, false ] ],
        [ { base: 'obj', expr: {'*':'i'} },                                     [ true , false ] ],
        [ { base: 'obj' },                                                      [ true , true ] ],
    ], function (obj) {
        var t = tbase.create(obj)
        return [t.has_generic_key(), t.is_generic()]
    })
})

test('generic array', function (t) {
    t.table_assert([
        [ 'obj',                                                                'exp' ],
        [ { base: 'arr', array: ['*', 'i'] },                                   false ],
        [ { base: 'arr', array: ['*'] },                                        true ],
    ], function (obj) {
        var t = tbase.create(obj)
        return t.is_generic()
    })
})

test('toString', function (t) {
    t.table_assert([
        [ 'args',                               'exp'  ],
        [ 'str',                                'str' ],
        [ {base:'str'},                         'unnamed' ],
        [ {base:'str', name: 'i'},              'i' ],
    ], function (args) {
        var t = typeof args === 'string' ? tbase.lookup(args) : tbase.create(args)
        return t.toString()
    })
})