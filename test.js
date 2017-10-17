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
        [ 'tinyname',       [ '*', 'N', 'X', 'a', 'b', 'd', 'f', 'i', 'm', 'n', 'o', 's', 't', 'x' ] ],
        [ 'name',           [ '*', 'arr', 'blb', 'boo', 'byt', 'dec', 'flt', 'int', 'mul', 'nul', 'num', 'obj', 'str', 'typ' ] ],
        [ null  ,           [ '*', 'arr', 'blb', 'boo', 'byt', 'dec', 'flt', 'int', 'mul', 'nul', 'num', 'obj', 'str', 'typ' ] ],
        [ 'fullname',       [ 'any', 'array', 'blob', 'boolean', 'byte', 'decimal', 'float', 'integer', 'multi', 'null', 'number', 'object', 'string', 'type' ] ],
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

test('create errors', function (t) {
    t.table_assert([
        [ 'create',                             'exp'  ],
        [ {base: 'foo' },                       /unknown base/ ],
        [ {base: 'nul'},                        /not a creatable type/ ],
        [ {base: 'int', tinyname: 'foo' },      /tinyname without name/ ],
        [ {base: 'int', fullname: 'foo' },      /fullname without name/ ],
    ], tbase.create, { assert: 'throws' })
})

test('fieldtyp', function (t) {
    t.table_assert([
        [ 'obj',                                                               'field',            'exp' ],
        [ { base: 'obj', fields: {a:'i'} },                                    'a',                'i' ],
        [ { base: 'obj', fields: {a:'i'}, pfields: {'a*':'n'} },               'a',                'i' ],
        [ { base: 'obj', fields: {a:'i'}, pfields: {'a*':'n'} },               'ba',               null ],
        [ { base: 'obj', fields: {a:'i'}, pfields: {'a*':'n'} },               'ab',               'n' ],
        [ { base: 'obj', fields: {a:'i'}, pfields: {'*a':'n', 'a*': 'o'} },    'ab',     'o' ],
    ], function (obj, field) {
        return tbase.create(obj).fieldtyp(field)
    })
})

test('generic object', function (t) {
    var int = tbase.lookup('int')
    t.table_assert([
        [ 'obj',                                                                'exp' ],
        [ { base: 'obj', fields: {a:int} },                                     [ false, false ] ],
        [ { base: 'obj', fields: {a:int}, pfields: {'a*': int} },               [ false, false ] ],
        [ { base: 'obj', pfields: {'*':int} },                                  [ true , false ] ],
        [ { base: 'obj' },                                                      [ true , true ] ],
    ], function (obj) {
        var t = tbase.create(obj)
        return [t.has_generic_key(), t.is_generic()]
    })
})

test('generic array', function (t) {
    var any = tbase.lookup('*')
    var int = tbase.lookup('i')
    t.table_assert([
        [ 'obj',                                                                'exp' ],
        [ { base: 'arr', array: [any, int] },                                   false ],
        [ { base: 'arr', array: [any] },                                        true ],
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

test('create and obj', function (t) {
    var str = tbase.lookup('str')
    var int = tbase.lookup('int')
    var str_arr = tbase.create({base: 'arr', array: [ str ]})
    var int_arr = tbase.create({base: 'arr', array: [ int ]})
    var my_str_arr = tbase.create({base: 'arr', name: 'my_str_arr', array: [ str ]})
    t.table_assert([
        [ 'props',                                                  'opt',              'exp'  ],
        [ 'str',                                                    null,               { $base: 'str', $name: 'str', $desc: 'A string of unicode characters (code points in range 0..1114111)', $tinyname: 's', $fullname: 'string' } ],
        [ 'int',                                                    null,               { $base: 'int', $name: 'int', $desc: 'An unbounded integer (range ..)', $tinyname: 'i', $fullname: 'integer' }   ],
        [ {base: 'int'},                                            null,               { $base: 'int' }],
        [ {base: 'int', name: 'foo'},                               null,               { $base: 'int', $name: 'foo' } ],
        [ {base: 'obj', fields: {a:int}},                           null,               { a: 'int' } ],
        [ {base: 'obj', pfields: {'a*':int}},                       null,               { 'a*': 'int' } ],
        [ {base: 'arr', array: [ str ]},                            null,               [ 'str' ] ],
        [ {base: 'obj', fields: { a: str_arr } },                   null,               { a: [ 'str' ] } ],
        [ {base: 'obj', fields: { a: str_arr } },                   {name_depth:0},     { a: [ 'str' ] } ],
        [ {base: 'obj', fields: { a: str_arr } },                   {name_depth:0},     { a: [ 'str' ] } ],
        [ {base: 'obj', fields: { a: str_arr } },                   {name_depth:1},     { a: [ 'str' ] } ],
        [ {base: 'obj', fields: { a: str_arr } },                   {name_depth:2},     { a: [ 'str' ] } ],
        [ {name: 'foo', base: 'obj', fields: { a: my_str_arr } },   {name_depth:0},     'foo' ],
        [ {name: 'foo', base: 'obj', fields: { a: my_str_arr } },   {name_depth:1},     { $name: 'foo', a: 'my_str_arr' } ],
        [ {name: 'foo', base: 'obj', fields: { a: my_str_arr } },   {name_depth:2},     { $name: 'foo', a: { $name: 'my_str_arr', $array: [ 'str' ] } } ],
        [ {name: 'foo', base: 'obj', fields: { a: str_arr } },      {name_depth:1},     { $name: 'foo', a: [ 'str' ] } ],
    ], function (props, opt) {
        var t = typeof props === 'string' ? tbase.lookup(props) : tbase.create(props)
        return t.obj(opt)
    })
})