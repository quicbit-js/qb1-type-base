// Software License Agreement (ISC License)
//
// Copyright (c) 2017-2018, Matthew Voss
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
var qbobj = require('qb-obj')
var tbase = require('.')

function err (msg) { throw Error(msg) }

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
        [ 'name',            'opt',                       'exp' ],
        [ 's',               null,                       { same_inst: true, name: 'str', tinyname: 's', fullname: 'string', base: 'str', immutable: true } ],
        [ 'str',             null,                       { same_inst: true, name: 'str', tinyname: 's', fullname: 'string', base: 'str', immutable: true } ],
        [ 'string',          null,                       { same_inst: true, name: 'str', tinyname: 's', fullname: 'string', base: 'str', immutable: true } ],
        [ 'object',          null,                       { same_inst: true, name: 'obj', tinyname: 'o', fullname: 'object', base: 'obj', immutable: true }],
        [ 'arr',             null,                       { same_inst: true, name: 'arr', tinyname: 'a', fullname: 'array', base: 'arr', immutable: true } ],
        [ 'typ',             null,                       { same_inst: true, name: 'typ', tinyname: 't', fullname: 'type', base: 'typ', immutable: true } ],
        [ 'any',             null,                       { same_inst: true, name: '*', tinyname: '*', fullname: 'any', base: '*', immutable: true } ],
        [ 's',               {create_opt:{}},            { same_inst: false, name: 'str', tinyname: 's', fullname: 'string', base: 'str', immutable: false } ],
        [ 'str',             {create_opt:{}},            { same_inst: false, name: 'str', tinyname: 's', fullname: 'string', base: 'str', immutable: false } ],
        [ 'string',          {create_opt:{}},            { same_inst: false, name: 'str', tinyname: 's', fullname: 'string', base: 'str', immutable: false } ],
        [ 'object',          {create_opt:{}},            { same_inst: false, name: 'obj', tinyname: 'o', fullname: 'object', base: 'obj', immutable: false }],
        [ 'arr',             {create_opt:{}},            { same_inst: false, name: 'arr', tinyname: 'a', fullname: 'array', base: 'arr', immutable: false } ],
        [ 'typ',             {create_opt:{}},            { same_inst: false, name: 'typ', tinyname: 't', fullname: 'type', base: 'typ', immutable: false } ],
        [ 'any',             {create_opt:{}},            { same_inst: false, name: '*', tinyname: '*', fullname: 'any', base: '*', immutable: false } ],
        [ 'foo',             null,                       null ],
        [ 'foo',             {create_opt:{}},            null ],
    ], function (name, opt) {
        var t = tbase.lookup(name, opt)
        if (t === null) { return null }
        var ret = { same_inst: tbase.lookup(name) === t }
        return qbobj.select(t, ['name', 'tinyname', 'fullname', 'base', 'immutable'], {init: ret})
    })
})

// test('toString', function (t) {
//     t.table_assert([
//         []
//     ])
// })

test('collections', function (t) {
    var t_by_all_names = tbase.types_by_all_names()
    var c_by_all_names = tbase.codes_by_all_names()
    var t_bycode = tbase.types_by_code()

    var all_names = Object.keys(t_by_all_names)
    t.same(Object.keys(c_by_all_names), all_names)

    var codes = Object.keys(t_bycode)
    t.same(codes.length, (all_names.length + 1)/3, '3 names per type')

    var t_by_name = all_names.reduce(function (m, n) {
        var t = t_by_all_names[n]
        m[t.name] = t
        return m
    }, {})
    var names = Object.keys(t_by_name)
    t.same(names.length, 14)
    t.same(codes.length, 14)

    t.end()
})

test('byname', function (t) {
    var mtype = tbase.create({mul:[tbase.create({base:'i'}),tbase.create({base:'b'})]})
    var names = Object.keys(mtype.byname)
    t.same(names, [ 'int', 'boo' ])
    t.equal(mtype.byname, mtype.byname)         // cached
    t.end()
})

test('create errors', function (t) {
    t.table_assert([
        [ 'create',                          'opt',   'exp'  ],
        [ {base: 'obj', name: 'foo' },       { custom_props: {tinyname: 'f'}},   /custom properties should have \$ prefix/ ],
        [ {base: 'obj', name: 'foo' },       { custom_props: {$tinyname: 'f'}},  /custom property cannot shadow/ ],
        [ {name: 'foo' },                    null,                               /no base specified/ ],
        [ {base: 'foo' },                    null,                               /unknown base/ ],
        [ {base: 'nul'},                     null,                               /cannot be created using properties/ ],
        [ {base: '*'},                       null,                               /cannot be created using properties/ ],
        [ {base: 'typ'},                     null,                               /cannot be created using properties/ ],
        [ {base: 'int', tinyname: 'foo' },   null,                               /tinyname without name/ ],
        [ {base: 'int', fullname: 'foo' },   null,                               /fullname without name/ ],
        [ {base: 'mul', name: 'mul' },       null,                               /cannot redefine a base type/ ],
        [ {base: 'mul', obj: {} },           null,                               /base mismatch/ ],
    ], tbase.create, { assert: 'throws' })
})

test('lookup errors', function (t) {
    t.table_assert([
        [ 'name',   'opt',    'exp' ],
        [ 'mul',    null,     /there is no general multi-type/],
    ], tbase.lookup, {assert: 'throws'})
})

test('obj field_type', function (t) {
    t.table_assert([
        [ 'obj',                                                 'field', 'exp' ],
        [ { obj: {a: 'i'} },                                     'a',     [ 'int', 'int' ] ],
        [ { obj: {a: 'i'} },                                     'ab',    [ 'null', 'null' ] ],
        [ { obj: {a: 'i', 'a*': 'n'} },                          'ab',    [ 'num', 'num' ] ],
        [ { obj: {a: 'i', 'a*': 'n'} },                          'a',     [ 'int', 'int' ] ],
        [ { obj: {a: 'i', 'a*': 'n'} },                          'ba',    [ 'null', 'null' ] ],
        [ { obj: {a: 'i', '*a': 'n', 'a*': 'o'} },               'ab',    [ 'obj', 'obj' ] ],
        [ { obj: {a: 'i', '*': 's', 'a*': 'n'} },                'ba',    [ 'str', 'str' ] ],
        [ { obj: {a: 'i', '^*': 's', 'a*': 'n'} },               'ba',    [ 'null', 'null' ] ],
        [ { obj: {a: 'i', '^*': 's', 'a*': 'n'} },               '^',     [ 'null', 'null' ] ],
        [ { obj: {a: 'i', '^*': 's', 'a*': 'n'} },               '*',     [ 'str', 'str' ] ],
        [ { obj: {a: 'i', '^^': 's', 'a*': 'n'} },               '^',     [ 'str', 'str' ] ],
        [ { base: 'obj', obj: {a: 'i', '^^*': 's', 'a*': 'n'} }, '^',     [ 'str', 'str' ] ],
    ], function (obj, field) {
        var typ = tbase.create(obj)

        var t1 = typ.field_type(field)
        typ.add_field('foo', 'i')
        var t2 = typ.field_type(field)
        return [String(t1), String(t2)]
    })
})

test('obj field_name', function (t) {
    t.table_assert([
        [ 'obj',                                                 'field', 'exp' ],
        [ { obj: {a: 'i'} },                                     'a',     'a' ],
        [ { obj: {a: 'i'} },                                     'b',     null ],
        [ { obj: {a: 'i'} },                                     '*',     null ],
        [ { obj: {a: 'i', 'a*': 'n'} },                          'ab',    'a*' ],
        [ { obj: {a: 'i', 'a*': 'n'} },                          'a',     'a' ],
        [ { obj: {a: 'i', 'a*': 'n'} },                          'ba',    null ],
        [ { obj: {a: 'i', '*a': 'n', 'a*': 'o'} },               'ab',    'a*' ],
        [ { obj: {a: 'i', '*a': 'n', 'a*': 'o'} },               'ba',    '*a' ],
        [ { obj: {a: 'i', '*': 's', 'a*': 'n'} },                'ba',    '*' ],
        [ { obj: {a: 'i', '^*': 's', 'a*': 'n'} },               'ba',    null ],
        [ { obj: {a: 'i', '^*': 's', 'a*': 'n'} },               '^',     null ],
        [ { obj: {a: 'i', '^*': 's', 'a*': 'n'} },               '*',     '*' ],
        [ { obj: {a: 'i', '^^': 's', 'a*': 'n'} },               '^',     '^' ],
        [ { base: 'obj', obj: {a: 'i', '^^*': 's', 'a*': 'n'} }, '^',     '^^*' ],
    ], function (obj, field) {
        var typ = tbase.create(obj)
        return typ.field_name(field)
    })
})

test('arr vtype', function (t) {
    t.table_assert([
        [ 'props',                     'i', 'exp' ],
        [ { arr: ['i'] },              0,   'int' ],
        [ { arr: ['i'] },              1,   'int' ],
        [ { base: 'arr', arr: ['*'] }, 1,   '*' ],
    ], function (props, i) {
        var typ = tbase.create(props)
        return typ.vtype(i).toString()
    })
})

test('generic object', function (t) {
    var int = tbase.lookup('int')
    var any = tbase.lookup('any')
    t.table_assert([
        [ 'str_or_props',                        'exp' ],
        [ 'obj',                                 [ true, true ] ],
        [ { obj: { '*': any } },                 [ true, true ] ],
        [ { obj: { '*': int } },                 [ true, false ] ],
        [ { obj: { 'a*': int } },                [ false, false ] ],
        [ { obj: { a: int } },                   [ false, false ] ],
        [ { obj: { a: int, 'a*': int } },        [ false, false ] ],
    ], function (str_or_props) {
        var t = typeof str_or_props === 'string' ? tbase.lookup(str_or_props) : tbase.create(str_or_props)
        return [t.is_generic, t.is_generic_any]
    })
})

test('generic array', function (t) {
    var any = tbase.lookup('*')
    var int = tbase.lookup('i')
    t.table_assert([
        [ 'str_or_props',                             'exp' ],
        [ 'obj',                                      true ],
        [ { arr: [any] },                             true ],
        [ { arr: [int] },                             false ],
    ], function (str_or_props) {
        var t = typeof str_or_props === 'string' ? tbase.lookup(str_or_props) : tbase.create(str_or_props)
        return t.is_generic
    })
})

test('toString', function (t) {
    var int = tbase.lookup('int')
    var myint = tbase.create({base:'int', name:'myint'})
    var anyint = tbase.create({mul: [int, myint]})
    var arr_int = tbase.create({arr: [int]})
    var arr_myint = tbase.create({arr: [myint]})
    var arr_anyint = tbase.create({arr: [anyint]})
    t.table_assert([
        [ 'args',                                           'exp'  ],
        [ 'str',                                            'str' ],
        [ 'int',                                            'int' ],
        [ arr_int,                                          '["int"]' ],
        [ arr_myint,                                        '["myint"]'],
        [ arr_anyint,                                       '[{"$mul":["int","myint"]}]'],
        [ {base:'obj', obj: {'s*':arr_anyint}},             '{"s*":[{"$mul":["int","myint"]}]}' ],
        [ {base:'str'},                                     '{"$base":"str"}' ],
        [ {base:'str', name: 'i'},                          'i' ],

    ], function (args) {
        var t = typeof args === 'string' ? tbase.lookup(args) : tbase.create(args)
        return t.toString()
    })
})

test('create() and to_obj()', function (t) {
    var any = tbase.lookup('any')
    var all_types = tbase.types().slice(1)      // leave out the '*' any type
    var int = tbase.lookup('int')
    var arr = tbase.lookup('arr')
    var my_int = tbase.create({base: 'int', name: 'my_int'})
    var int_arr = tbase.create({base: 'arr', arr: [ int ]})
    var my_int_arr = tbase.create({base: 'arr', name: 'my_int_arr', arr: [ my_int ]})
    t.table_assert([
        [ 'str_or_props',                              'opt',              'exp'  ],
        [ 's',                                         {name_depth:0},     'str' ],
        [ 'i',                                         null,               'int' ],
        [ 'b',                                         {name_depth:0},     'boo' ],
        [ 'a',                                         {name_depth:0},     [] ],
        [ 'o',                                         {name_depth:0},     {} ],
        [ 'str',                                       {name_depth:1},     { $base: 'str', $name: 'str', $desc: 'A string of unicode characters (code points in range 0..1114111)', $tinyname: 's', $fullname: 'string' } ],
        [ 'int',                                       {name_depth:1},     { $base: 'int', $name: 'int', $desc: 'An unbounded integer (range ..)', $tinyname: 'i', $fullname: 'integer' }   ],
        [ 'arr',                                       {name_depth:1},     { $name: 'arr', $desc: 'Array of values matching types in a *cycle* (also see multi type).  [str] is an array of strings while [str, int] is an alternating array of [str, int, str, int, ...]', $tinyname: 'a', $fullname: 'array', $arr: [ '*' ] } ],
        [ 'obj',                                       {name_depth:1},     { $name: 'obj', $desc: 'A record-like object with fixed field names, or flexible fields (using *-expressions)', $tinyname: 'o', $fullname: 'object', '*': '*' } ],
        [ {base: 'obj', obj: { a: arr } },             null,               { a: [] } ],
        [ {base: 'obj', obj: { '*':any } },            null,               {'*':'*'} ],        // custom object has this different look from base type '{}' - though functionally the same.
        [ {base: 'arr', arr: ['*']},                   null,               ['*'] ],            // custom array has this different look from base type '[]' - though functionally the same.
        [ {base: 'int'},                               null,               { $base: 'int' }],
        [ {base: 'int', name: 'foo'},                  null,               'foo' ],
        [ int_arr,                                     null,               [ 'int' ] ],
        [ {arr: [int_arr]},                            null,               [ ['int'] ] ],
        [ {arr: [my_int_arr]},                         null,               [ 'my_int_arr' ] ],
        [ {arr: all_types},                            null,               [ [], 'blb', 'boo', 'byt', 'dec', 'flt', 'int', 'mul', 'nul', 'num', {}, 'str', 'typ' ] ],
        [ {obj: {a:int}},                              null,               { a: 'int' } ],
        [ {obj: {'a*':int}},                           null,               { 'a*': 'int' } ],
        [ {obj: { a: int_arr } },                      null,               { a: [ 'int' ] } ],
        [ {obj: { a: int_arr } },                      {name_depth:0},     { a: [ 'int' ] } ],
        [ {obj: { a: int_arr } },                      {name_depth:0},     { a: [ 'int' ] } ],
        [ {obj: { a: int_arr } },                      {name_depth:1},     { a: [ 'int' ] } ],
        [ {obj: { a: int_arr } },                      {name_depth:2},     { a: [ 'int' ] } ],
        [ {obj: { a: int_arr } },                      {name_depth:2},     { a: [ 'int' ] } ],
        [ {name: 'foo', obj: { a: my_int_arr } },      {name_depth:0},     'foo' ],
        [ {name: 'foo', obj: { a: my_int_arr } },      {name_depth:1},     { $name: 'foo', a: 'my_int_arr' } ],
        [ {name: 'foo', obj: { a: my_int_arr } },      {name_depth:2},     { $name: 'foo', a: { $name: 'my_int_arr', $arr: [ 'my_int' ] } } ],
        [ {name: 'foo', obj: { a: int_arr } },         {name_depth:1},     { $name: 'foo', a: [ 'int' ] } ],
    ], function (str_or_props, opt) {
        var t = typeof str_or_props === 'string' ? tbase.lookup(str_or_props) : tbase.create(str_or_props)
        return t.to_obj(opt)
    })
})

test('checkv()', function (t) {
    var int = tbase.lookup('int')
    t.table_assert([
        [ 'props',                 'v',            'quiet', 'exp' ],
        '# any',
        [ '*',                     'x',            1,       [ true, null ] ],
        [ '*',                     'x',            0,       [ true, null ] ],
        [ '*',                     'func',         1,       [ false, null ] ],
        [ '*',                     'func',         0,       [ null, 'not a value: function () {}' ] ],
        '# string',
        [ 'str',                   'x',            1,       [ true, null ] ],
        [ 'str',                   'x',            0,       [ true, null ] ],
        [ 'str',                   null,           1,       [ false, null ] ],
        [ 'str',                   7,              0,       [ null, 'not a string: 7' ] ],
        '# byte',
        [ 'byt',                   0,              1,       [ true, null ] ],
        [ 'byt',                   255,            0,       [ true, null ] ],
        [ 'byt',                   null,           1,       [ false, null ] ],
        [ 'byt',                   -256,           1,       [ false, null ] ],
        [ 'byt',                   -1,             0,       [ null, 'not a byte: -1' ] ],
        '# integer',
        [ 'int',                   0,              1,       [ true, null ] ],
        [ 'int',                   -1,             0,       [ true, null ] ],
        [ 'int',                   null,           1,       [ false, null ] ],
        [ 'int',                   'x',            0,       [ null, 'not an integer: x' ] ],
        '# float',
        [ 'flt',                   1.1,            1,       [ true, null ] ],
        [ 'flt',                   0,              0,       [ true, null ] ],
        [ 'flt',                   null,           1,       [ false, null ] ],
        [ 'flt',                   'x',            0,       [ null, 'not a float: x' ] ],
        '# decimal',
        [ 'dec',                   0,              1,       [ true, null ] ],
        [ 'dec',                   9,              0,       [ true, null ] ],
        [ 'dec',                   null,           1,       [ false, null ] ],
        [ 'dec',                   'x',            0,       [ null, 'not a decimal: x' ] ],
        '# number',
        [ 'num',                   0,              1,       [ true, null ] ],
        [ 'num',                   7.1,            0,       [ true, null ] ],
        [ 'num',                   null,           1,       [ false, null ] ],
        [ 'num',                   'x',            0,       [ null, 'not a number: x' ] ],
        '# boolean',
        [ 'boo',                   false,          1,       [ true, null ] ],
        [ 'boo',                   7,              0,       [ true, null ] ],
        [ 'boo',                   'x',            1,       [ false, null ] ],
        [ 'boo',                   null,           0,       [ null, 'not a boolean: null' ] ],
        '# blob',
        [ 'blb',                   [],             1,       [ true, null ] ],
        [ 'blb',                   '0x3',          0,       [ true, null ] ],
        [ 'blb',                   { $t: 'X' },    0,       [ true, null ] ],
        [ 'blb',                   { $type: 'q' }, 1,       [ false, null ] ],
        [ 'blb',                   { $type: 'q' }, 0,       [ null, 'not a blob: [object Object]' ] ],
        [ 'blb',                   {},             1,       [ false, null ] ],
        [ 'blb',                   {},             0,       [ null, 'not a blob: [object Object]' ] ],
        [ 'blb',                   null,           1,       [ false, null ] ],
        [ 'blb',                   7,              1,       [ false, null ] ],
        [ 'blb',                   '03',           1,       [ false, null ] ],
        [ 'blb',                   null,           0,       [ null, 'not a blob: null' ] ],
        [ 'blb',                   7,              0,       [ null, 'not a blob: 7' ] ],
        [ 'blb',                   '03',           0,       [ null, 'not a blob: 03' ] ],
        '# array',
        [ 'arr',                   [],             1,       [ true, null ] ],
        [ 'arr',                   [],             0,       [ true, null ] ],
        [ 'arr',                   null,           1,       [ false, null ] ],
        [ 'arr',                   0,              0,       [ null, 'not an array: 0' ] ],
        '# object',
        [ 'obj',                   {},             1,       [ true, null ] ],
        [ 'obj',                   {},             0,       [ true, null ] ],
        [ 'obj',                   null,           1,       [ false, null ] ],
        [ 'obj',                   0,              0,       [ null, 'not an object: 0' ] ],
        '# multi-type',
        [ { mul: ['int'] },        0,              1,       [ true, null ] ],
        [ { mul: ['str'] },        'x',            0,       [ true, null ] ],
        [ { mul: ['int', 'str'] }, [],             1,       [ false, null ] ],
        [ { mul: ['int', 'str'] }, null,           0,       [ null, 'does not match multi-type: null: {"$mul":["int","str"]}' ] ],
    ], function (props, v, quiet) {
        if (v === 'func') { v = function () {} }
        var t = typeof props === 'string' ? tbase.lookup(props) : tbase.create(props)
        if (tbase)
        var res = null
        var estr = null
        try {
            res = t.checkv(v, quiet)
        } catch (e) {
            estr = e.message
        }
        return [res, estr]
    })
})

test('custom props', function (t) {
    t.table_assert([
        [ 'props',                  'opt',                                              'exp'  ],
        [ {base: 'int', hash: 3},   {custom_props: {$hash: 'hash'}},                    { $base: 'int', $hash: 3 } ],
        [ {base: 'arr', hash: 4},   {custom_props: {$hash: 'hash'}},                    { $hash: 4, $arr: [] } ],
        [ {base: 'obj', hash: 5},   {custom_props: {$hash: 'hash'}},                    { $hash: 5 } ],
        '# unset custom property',
        [ {base: 'obj', hash: 5},   {custom_props: {$hash: 'hash', $foo: 'foo'}},       { $hash: 5 } ],
    ], function (props, opt) {
        var t = tbase.create(props, opt)
        return t.to_obj(opt)
    })
})

test('create() and obj() with trivial multi-types', function (t) {
    var int = tbase.lookup('int')
    var arr = tbase.lookup('arr')
    var mul1 = tbase.create({base: 'mul', name: 'my_mul1', mul: [int] })
    var mul2 = tbase.create({base: 'mul', mul: [mul1]})
    var mul_arr = tbase.create({base: 'arr', arr: [ mul2, arr ]})
    t.table_assert([
        [ 'props',                                     'opt',              'exp'  ],
        [ {obj: {a: mul1}},                            null,               { a: 'int' } ],
        [ {obj: {a: mul2}},                            null,               { a: 'int' } ],
        [ {obj: {a: mul_arr}},                         null,               { a: ['int', []] } ],

    ], function (props, opt) {
        var t = tbase.create(props)
        return t.to_obj(opt)
    })
})


test('create() and obj() with unresolved types (string)', function (t) {
    var mul1 = tbase.create({base: 'mul', name: 'my_mul1', mul: ['foo'] })
    var mul_arr = tbase.create({base: 'arr', arr: [ mul1 ]})
    t.table_assert([
        [ 'props',                   'opt',              'exp'  ],
        [ {obj: {a: mul1}},          null,               { a: 'foo' } ],
        [ {obj: {a: mul_arr}},       null,               { a: ['foo'] } ],

    ], function (props, opt) {
        var t = tbase.create(props)
        return t.to_obj(opt)
    })
})

test('obj() with references', function (t) {
    var my_int = tbase.create({base: 'int', name: 'my_int'})
    var my_int_arr = tbase.create({base: 'arr', name: 'my_int_arr', arr: [ my_int ]})
    t.table_assert([
        [ 'str_or_props',                             'opt',              'exp'  ],
        [ {obj: {a: 'unresolved'}},                    null,               { a: 'unresolved' } ],
        [ {obj: {'b*': 'unresolved'}},                 null,               { 'b*': 'unresolved' } ],
        [ {arr: ['another_unknown']},                  null,               ['another_unknown'] ],
        [ {mul: ['foo_boo','str']},                    null,               { $mul: [ 'foo_boo', 'str' ] } ],
    ], function (str_or_props, opt) {
        var t = typeof str_or_props === 'string' ? tbase.lookup(str_or_props) : tbase.create(str_or_props)
        return t.to_obj(opt)
    })
})

test('linking and path', function (t) {
    // curry lookup and create to create instances with link_children
    var create = function (props) { return tbase.create(props, {link_children: true})}
    var lookup = function (name) { return tbase.lookup(name, {create_opt: {link_children: true}})}

    // define a type using different instances for each node.  equivalent of:
    //  > obj2typ({ a: { '$mul': [ 'str', 'my_int_arr' ] }, b: 'str', 'num*': 'int' })
    var str1 = lookup('str')
    var str2 = lookup('str')
    var num1 = lookup('num')
    var my_int = create({base: 'int', name: 'my_int'})
    var my_int_arr = create({name: 'my_int_arr', arr: [ my_int ]})
    var int = lookup('int')
    var mul = create({mul: [str1, my_int_arr]})
    var obj = create({obj: {a:mul, b:str2, '*':num1, 'num*':int}})

    t.equal(mul.parent, obj)
    t.equal(mul.parent_ctx, 'a')
    t.equal(mul.path(), 'a')

    t.equal(str2.parent, obj)
    t.equal(str2.parent_ctx, 'b')
    t.equal(str2.path(), 'b')

    t.equal(num1.parent, obj)
    t.equal(num1.parent_ctx, '*')
    t.equal(num1.path(), '*')

    t.equal(int.parent, obj)
    t.equal(int.parent_ctx, 'num*' )
    t.equal(int.path(), 'num*' )

    t.equal(str1.parent, mul)
    t.equal(str1.parent_ctx, 0)
    t.equal(str1.path(), 'a{str}')
    t.equal(my_int_arr.parent, mul)
    t.equal(my_int_arr.parent_ctx, 1)
    t.equal(my_int_arr.path(), 'a{arr}')

    t.equal(my_int.parent, my_int_arr)
    t.equal(my_int.parent_ctx, 0)
    t.equal(my_int.path(), 'a{arr}/0{int}')

    t.end()
})

test('path with dynamic multi-types', function (t) {
    // curry lookup and create to create instances with link_children
    var create = function (props) { return tbase.create(props, {link_children: true})}
    var lookup = function (name) { return tbase.lookup(name, {create_opt: {link_children: true}})}

    // define a type using different instances for each node.  equivalent of:
    //  > obj2typ({ a: { '$mul': [ 'str', 'my_int_arr' ] }, b: 'str', 'num*': 'int' })
    var str1 = lookup('str')
    var int1 = lookup('int')
    var mul1 = create({base: 'mul'})

    t.same(mul1.to_obj(), { $mul: [] })
    t.equal(mul1.path(), '')
    t.equal(str1.path(), '')

    mul1.add_type(str1)
    t.equal(str1.path(), '')            // special case - only multi-type as parent with single type - behave like single type

    mul1.add_type(int1)
    t.equal(str1.path(), '{str}')       // special case - only multi-type as parent path clarifies which type
    t.equal(int1.path(), '{int}')

    var obj1 = create({base: 'obj', obj: {a_multi: mul1}})
    t.equal(str1.path(), 'a_multi{str}')
    t.equal(int1.path(), 'a_multi{int}')

    var obj2 = create({base: 'obj'})
    obj2.add_field('nested', obj1)
    t.equal(str1.path(), 'nested/a_multi{str}')
    t.equal(int1.path(), 'nested/a_multi{int}')

    var arr1 = create({base: 'arr'})
    var num1 = lookup('num')
    arr1.add_type(num1)
    t.equal(num1.path(), '0{num}')

    mul1.add_type(arr1)
    t.equal(num1.path(), 'nested/a_multi{arr}/0{num}')
    t.same(mul1.to_obj(), { $mul: [ 'str', 'int', [ 'num' ] ] })

    t.end()
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
    ], tbase._has_char)
})

test('unesc_caret', function (t) {
    t.table_assert([
        [ 's',                  'exp' ],
        [ 'abc',                { s: 'abc', literal_asterix: [] } ],
        [ 'a^bc',               { s: 'abc', literal_asterix: [] } ],
        [ 'a^b^c',              { s: 'abc', literal_asterix: [] } ],
        [ 'a^b^^c',             { s: 'ab^c', literal_asterix: [] } ],
        [ '^^',                 { s: '^', literal_asterix: [] } ],
        [ '*',                  { s: '*', literal_asterix: [] } ],
        [ '^^x*',               { s: '^x*', literal_asterix: [] } ],
        [ '^*',                 { s: '*', literal_asterix: [0] } ],
        [ '^^^*',               { s: '^*', literal_asterix: [1] } ],
        [ '^^^*x^*',            { s: '^*x*', literal_asterix: [1,3] } ],
        [ '^^abc^*x^*',         { s: '^abc*x*', literal_asterix: [4,6] } ],
    ], function (s) {
        var info = tbase._unesc_caret(s)
        info.literal_asterix = Object.keys(info.literal_asterix).map(function (k) { return Number(k) })   // convert sparse array to just keys
        return info
    })
})

test('escape_wildcards', function (t) {
    t.table_assert([
        [ 's',                  'exp' ],
        [ 'abc',                'abc' ],
        [ 'a*b',                'a.*b' ],
        [ '*',                  '.*' ],
        [ '*.*',                '.*\\..*' ],
        [ '^^x*',               '\\^x.*' ],
        [ '^*',                 '\\*' ],
        [ '^**',                '\\*.*' ],
        [ '^^**',               '\\^.*.*' ],
        [ '^^^**',              '\\^\\*.*' ],
        [ '^^^^**',             '\\^\\^.*.*' ],
        [ '^^^^*.^*',           '\\^\\^.*\\.\\*' ],
        [ '^^^^*^.^*',          '\\^\\^.*\\.\\*' ],
        [ '^^^^*.^*',           '\\^\\^.*\\.\\*' ],
    ], tbase._escape_wildcards)
})

test('escape errors', function (t) {
    t.table_assert([
        [ 's',                      'exp' ],
        [ '^^hi^',                  /dangling escape/ ],
    ], tbase._escape_wildcards, {assert: 'throws'})
})

test('codes_by_name()', function (t) {
    // assert that codes are sequential and unique (0..last)
    var codes = qbobj.vals(tbase.codes_by_name()).sort(function (a, b) { return a - b })

    var num_types = tbase.types().length
    t.same(codes.length, num_types, t.desc('number of codes', [], num_types))

    for (var i=0; i<num_types; i++) {
        t.equal(codes[i], i, t.desc('code value', [], i))
    }
    t.end()
})

test('arr_type', function (t) {
    t.table_assert([
        [ 'a',                         'off', 'lim', 'exp' ],
        [ [],                          null,  null,   null ],
        [ [ null ],                    null,  null,  'nul' ],
        [ [ null, null ],              null,  null,  'nul' ],
        [ [ 1, 2, 3, null ],           0,     3,     'byt' ],
        [ [ 1, 2, 3, null ],           0,     4,     'byt' ],
        [ [ 1, 2, 3, -4 ],             2,     4,     'int' ],
        [ [ 'x', null ],               0,     2,     'str' ],
        [ [ null, 3.2 ],               0,     2,     'flt' ],
        [ [ 'x', true ],               0,     2,     'mul' ],
        [ [ 'x', true, null, 3.2, 3 ], 1,     4,     'mul' ],
    ], function (a, off, lim) {
        return tbase.arr_type(a, off, lim)
    })
})

test('is_type_of', function (t) {
    t.table_assert([
        [ 'sub', 't',   'exp' ],
        [ 'nul', 'nul', 1 ],
        [ 'dec', 'byt', 0 ],
        [ 'num', 'mul', 1 ],
        [ 'num', 'any', 1 ],
    ], function (sub, t) {
        return tbase.is_type_of(sub, t) ? 1 : 0
    })
})

//
// qb-type-flag tests
//
var qb_tflag = require('./qb-type-flags')

var FLAG_NAME = qb_tflag.FLAG_NAME

test('vtype', function (t) {
    t.table_assert([
        [ 'v',   'exp' ],
        [ null,  { nul: 1 } ],
        [ 'x',   { str: 2 } ],
        [ true,  { boo: 8 } ],
        [ [],    { arr: 16 } ],
        [ {},    { obj: 32 } ],
        [ 0,     { byt: 64 } ],
        [ 9,     { byt: 64 } ],
        [ 256,   { int: 128 } ],
        [ -1,    { int: 128 } ],
        [ 1.2,   { flt: 512 } ],
        [ 'UAR', { blb: 1024 } ],
        [ {$type:'*'}, { any: 2048 } ],
        [ {$type:'typ'}, { typ: 8192 } ],
    ], function (v) {
        if (v === 'UAR') {
            v = new Uint8Array(0)
        }
        var f = qb_tflag.vtype(v)
        var ret = {}
        ret[FLAG_NAME[f]] = f
        return ret
    })
})

test('single_type', function (t) {
    t.table_assert([
        [ 'tnames',      'exp' ],
        [ 'nul',         'nul' ],
        [ 'int',         'int' ],
        [ 'nul|int',     'int' ],
        [ 'nul|int|flt', 'flt' ],
        [ 'dec|int|flt', 'num' ],
        [ 'dec|flt',     'num' ],
        [ 'int|byt',     'int' ],
        [ 'dec|int',     'dec' ],
        [ 'int|flt',     'flt' ],
        [ 'int|flt|nul', 'flt' ],
        [ 'flt|nul',     'flt' ],
        [ 'str|nul',     'str' ],
        [ 'str',         'str' ],
        [ 'str|nul|obj', 'mul' ],
    ], function (tnames) {
        var f = qb_tflag.str2flag(tnames)
        var s = qb_tflag.to_single(f)
        return qb_tflag.flag2str(s)
    })
})

test('is_type_of', function (t) {
    t.table_assert([
        [ 'sub', 't',   'exp' ],
        [ 'nul', 'nul', 1 ],
        [ 'nul', 'int', 1 ],
        [ 'int', 'int', 1 ],
        [ 'int', 'num', 1 ],
        [ 'num', 'int', 0 ],
        [ 'byt', 'int', 1 ],
        [ 'int', 'byt', 0 ],
        [ 'dec', 'flt', 0 ],
        [ 'flt', 'dec', 0 ],
        [ 'byt', 'flt', 1 ],
        [ 'dec', 'byt', 0 ],
        [ 'num', 'flt', 0 ],
        [ 'flt', 'num', 1 ],
        [ 'num', 'mul', 1 ],
        [ 'num', 'any', 1 ],
    ], function (sub, t) {
        return qb_tflag.is_type_of(sub, t) ? 1 : 0
    })
})


test('arr_types', function (t) {
    t.table_assert([
        [ 'v',                         'off', 'lim', 'exp' ],
        [ [],                          null,  null,  '' ],
        [ [ null ],                    null,  null,  'nul' ],
        [ [ 1,2,3,null ],              0,     3,     'byt' ],
        [ [ 1,2,3,null ],              0,     4,     'nul|byt' ],
        [ [ 1,2,3,-4 ],                2,     4,     'byt|int' ],
        [ [ 'x', null ],               0,     2,     'nul|str' ],
        [ [ 'x', true ],               0,     2,     'str|boo' ],
        [ [ 'x', true, null, 3.2, 3 ], 1,     4,     'nul|boo|flt' ],
    ], function (v, off, lim) {
        var f = qb_tflag.arr_types(v, off, lim)
        return qb_tflag.flag2str(f)
    })
})

test('errors', function (t) {
    t.table_assert([
        [ 'fn',         'args',             'exp' ],
        [ 'str2flag',   ['xxx'],            /unknown type/ ],
        [ 'vtype',      [function () {}],   /unknown type/ ],
    ], function (fn, args) {
        qb_tflag[fn].apply(null, args)
    }, { assert: 'throws' })
})


var TYPES = tbase.types_by_all_names()
test('CODE2NAME', function (t) {
    qb_tflag.CODE2NAME.forEach(function (name, code) {
        var type = TYPES[name]
        t.same(code, type.code, t.desc('code2name', [type.name], type.code))
    })
    t.end()
})