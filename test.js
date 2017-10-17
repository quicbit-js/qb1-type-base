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
        [ 'name_prop',       'exp' ],
        [ 'tinyname',       [ 'a', 'b', 'd', 'fn', 'm', 'n', 's', 'tn', 't', 'v' ] ],
        [ 'name',           [ 'arr', 'base', 'desc', 'fullname', 'mul', 'name', 'stip', 'tinyname', 'type', 'value' ] ],
        [ 'fullname',       [ 'array', 'base', 'description', 'fullname', 'multi', 'name', 'stipulations', 'tinyname', 'type', 'value' ] ],
    ], function(name_prop) { return tbase.props().map(function (t) { return t[name_prop]}) })
})


test('types', function (t) {
    t.table_assert([
        [ 'name_prop',       'exp' ],
        [ 'tinyname',       [ '*', 'a', 'X', 'b', 'x', 'd', 'f', 'i', 'm', 'N', 'n', 'o', 's', 't' ] ],
        [ 'name',           [ '*', 'arr', 'blb', 'boo', 'byt', 'dec', 'flt', 'int', 'mul', 'nul', 'num', 'obj', 'str', 'typ' ] ],
        [ 'fullname',       [ 'any', 'array', 'blob', 'boolean', 'byte', 'decimal', 'float', 'integer', 'multi', 'null', 'number', 'object', 'string', 'type' ] ],
    ], function(name_prop) { return tbase.types().map(function (t) { return t[name_prop]}) })
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
        [ {base: 'mul', name: 'foo' },          /cannot create multi-type without the "multi" property/ ],
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
    var any = tbase.lookup('any')
    t.table_assert([
        [ 'str_or_props',                                                        'exp' ],
        [ 'obj',                                                                [ true, true ] ],
        [ { base: 'obj', pfields: {'*':any} },                                  [ true , true ] ],
        [ { base: 'obj', pfields: {'*':int} },                                  [ true , false ] ],
        [ { base: 'obj', fields: {a:int}, pfields: {'a*': int} },               [ false, false ] ],
    ], function (str_or_props) {
        var t = typeof str_or_props === 'string' ? tbase.lookup(str_or_props) : tbase.create(str_or_props)
        return [t.has_generic_key(), t.is_generic()]
    })
})

test('generic array', function (t) {
    var any = tbase.lookup('*')
    var int = tbase.lookup('i')
    t.table_assert([
        [ 'str_or_props',                                                       'exp' ],
        [ 'obj',                                                                true ],
        [ { base: 'arr', array: [any] },                                        true ],
        [ { base: 'arr', array: [any, int] },                                   false ],
    ], function (str_or_props) {
        var t = typeof str_or_props === 'string' ? tbase.lookup(str_or_props) : tbase.create(str_or_props)
        return t.is_generic()
    })
})

test('toString', function (t) {
    var int = tbase.lookup('int')
    var myint = tbase.create({base:'int', name:'myint'})
    var anyint = tbase.create({base: 'mul', multi: [int, myint]})
    var arr_int = tbase.create({base: 'arr', array:[int]})
    var arr_myint = tbase.create({base: 'arr', array:[myint]})
    var arr_anyint = tbase.create({base: 'arr', array:[anyint]})
    t.table_assert([
        [ 'args',                                           'exp'  ],
        [ 'str',                                            'str' ],
        [ 'int',                                            'int' ],
        [ arr_int,                                          '["int"]' ],
        [ arr_myint,                                        '["myint"]'],
        [ arr_anyint,                                       '[{"$multi":["int","myint"]}]'],
        [ {base:'obj', pfields:{'s*':arr_anyint}},          '{"s*":[{"$multi":["int","myint"]}]}' ],
        [ {base:'str'},                                     '{"$base":"str"}' ],
        [ {base:'str', name: 'i'},                          'i' ],

    ], function (args) {
        var t = typeof args === 'string' ? tbase.lookup(args) : tbase.create(args)
        return t.toString()
    })
})

test('create() and obj()', function (t) {
    var any = tbase.lookup('any')
    var all_types = tbase.types()
    var int = tbase.lookup('int')
    var arr = tbase.lookup('arr')
    var my_int = tbase.create({base: 'int', name: 'my_int'})
    var int_arr = tbase.create({base: 'arr', array: [ int ]})
    var my_int_arr = tbase.create({base: 'arr', name: 'my_int_arr', array: [ my_int ]})
    t.table_assert([
        [ 'str_or_props',                                           'opt',              'exp'  ],
        [ 's',                                                      {name_depth:0},     'str' ],
        [ 'i',                                                      {name_depth:0},     'int' ],
        [ 'b',                                                      {name_depth:0},     'boo' ],
        [ 'a',                                                      {name_depth:0},     [] ],
        [ 'o',                                                      {name_depth:0},     {} ],
        [ 'str',                                                    null,               { $base: 'str', $name: 'str', $desc: 'A string of unicode characters (code points in range 0..1114111)', $tinyname: 's', $fullname: 'string' } ],
        [ 'int',                                                    null,               { $base: 'int', $name: 'int', $desc: 'An unbounded integer (range ..)', $tinyname: 'i', $fullname: 'integer' }   ],
        [ 'arr',                                                    null,               { $name: 'arr', $desc: 'Array of values matching types in a *cycle* (also see multi type).  [str] is an array of strings while [str, int] is an alternating array of [str, int, str, int, ...]', $tinyname: 'a', $fullname: 'array', $array: [ '*' ] } ],
        [ 'obj',                                                    null,               { $name: 'obj', $desc: 'A record-like object with fixed field names, or flexible fields (using *-expressions)', $tinyname: 'o', $fullname: 'object', '*': '*' } ],
        [ {base: 'obj', fields: {a: arr}},                          null,               { a: [] } ],
        [ {base: 'obj', pfields: {'*':any}},                        null,               {'*':'*'} ],        // custom object has this different look from base type '{}' - though functionally the same.
        [ {base: 'arr', array: ['*']},                              null,               ['*'] ],            // custom array has this different look from base type '[]' - though functionally the same.
        [ {base: 'int'},                                            null,               { $base: 'int' }],
        [ int_arr,                                                  null,               [ 'int' ] ],
        [ {base: 'arr', array: [int_arr]},                          null,               [ ['int'] ] ],
        [ {base: 'arr', array: [my_int_arr]},                       null,               [ 'my_int_arr' ] ],
        [ {base: 'arr', array: all_types},                          null,               [ '*', [], 'blb', 'boo', 'byt', 'dec', 'flt', 'int', 'mul', 'nul', 'num', {}, 'str', 'typ' ] ],
        [ {base: 'int', name: 'foo'},                               null,               { $base: 'int', $name: 'foo' } ],
        [ {base: 'obj', fields: {a:int}},                           null,               { a: 'int' } ],
        [ {base: 'obj', pfields: {'a*':int}},                       null,               { 'a*': 'int' } ],
        [ {base: 'obj', fields: { a: int_arr } },                   null,               { a: [ 'int' ] } ],
        [ {base: 'obj', fields: { a: int_arr } },                   {name_depth:0},     { a: [ 'int' ] } ],
        [ {base: 'obj', fields: { a: int_arr } },                   {name_depth:0},     { a: [ 'int' ] } ],
        [ {base: 'obj', fields: { a: int_arr } },                   {name_depth:1},     { a: [ 'int' ] } ],
        [ {base: 'obj', fields: { a: int_arr } },                   {name_depth:2},     { a: [ 'int' ] } ],
        [ {base: 'obj', fields: { a: int_arr } },                   {name_depth:2},     { a: [ 'int' ] } ],
        [ {name: 'foo', base: 'obj', fields: { a: my_int_arr } },   {name_depth:0},     'foo' ],
        [ {name: 'foo', base: 'obj', fields: { a: my_int_arr } },   {name_depth:1},     { $name: 'foo', a: 'my_int_arr' } ],
        [ {name: 'foo', base: 'obj', fields: { a: my_int_arr } },   {name_depth:2},     { $name: 'foo', a: { $name: 'my_int_arr', $array: [ 'my_int' ] } } ],
        [ {name: 'foo', base: 'obj', fields: { a: int_arr } },      {name_depth:1},     { $name: 'foo', a: [ 'int' ] } ],
    ], function (str_or_props, opt) {
        var t = typeof str_or_props === 'string' ? tbase.lookup(str_or_props) : tbase.create(str_or_props)
        return t.obj(opt)
    })
})

test('obj() with references', function (t) {
    var my_int = tbase.create({base: 'int', name: 'my_int'})
    var my_int_arr = tbase.create({base: 'arr', name: 'my_int_arr', array: [ my_int ]})
    t.table_assert([
        [ 'str_or_props',                                           'opt',              'exp'  ],
        [ {base: 'obj', fields: {a: 'unresolved'}},                 null,               { a: 'unresolved' } ],
        [ {base: 'obj', pfields: {'b*': 'unresolved'}},                 null,           { 'b*': 'unresolved' } ],
        [ {base: 'arr', array: ['another_unknown']},                 null,              ['another_unknown'] ],
        [ {base: 'mul', multi: ['foo_boo','str']},                 null,                { $multi: [ 'foo_boo', 'str' ] } ],
    ], function (str_or_props, opt) {
        var t = typeof str_or_props === 'string' ? tbase.lookup(str_or_props) : tbase.create(str_or_props)
        return t.obj(opt)
    })
})