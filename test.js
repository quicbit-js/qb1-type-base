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
    ], tbase.create, { assert: 'throws' })
})

test('lookup errors', function (t) {
    t.table_assert([
        [ 'name',   'opt',    'exp' ],
        [ 'mul',    null,     /there is no general multi-type/],
    ], tbase.lookup, {assert: 'throws'})
})

test('obj fieldtyp', function (t) {
    t.table_assert([
        [ 'obj',                                                 'field', 'exp' ],
        [ { to_obj: {a: 'i'} },                                     'a',     'i' ],
        [ { to_obj: {a: 'i'} },                                     'ab',    null ],
        [ { to_obj: {a: 'i', 'a*': 'n'} },                          'ab',    'n' ],
        [ { to_obj: {a: 'i', 'a*': 'n'} },                          'a',     'i' ],
        [ { to_obj: {a: 'i', 'a*': 'n'} },                          'ba',    null ],
        [ { to_obj: {a: 'i', '*a': 'n', 'a*': 'o'} },               'ab',    'o' ],
        [ { to_obj: {a: 'i', '*': 's', 'a*': 'n'} },                'ba',    's' ],
        [ { to_obj: {a: 'i', '^*': 's', 'a*': 'n'} },               'ba',    null ],
        [ { to_obj: {a: 'i', '^*': 's', 'a*': 'n'} },               '^',     null ],
        [ { to_obj: {a: 'i', '^*': 's', 'a*': 'n'} },               '*',     's' ],
        [ { to_obj: {a: 'i', '^^': 's', 'a*': 'n'} },               '^',     's' ],
        [ { base: 'obj', to_obj: {a: 'i', '^^*': 's', 'a*': 'n'} }, '^',     's' ],
    ], function (obj, field) {
        var typ = tbase.create(obj)

        var ret = typ.fieldtyp(field)
        ret === typ.fieldtyp(field) || err('inconsistent fieldtyp')
        typ.add_field('foo', 'i')
        ret === typ.fieldtyp(field) || err('inconsistent fieldtyp - after add')
        return ret
    })
})

test('arr vtype', function (t) {
    t.table_assert([
        [ 'props',                     'i', 'exp' ],
        [ { arr: ['i'] },              0,   'i' ],
        [ { arr: ['i'] },              1,   'i' ],
        [ { base: 'arr', arr: ['*'] }, 1,   '*' ],
    ], function (props, i) {
        var typ = tbase.create(props)
        return typ.vtype(i)
    })
})

test('generic object', function (t) {
    var int = tbase.lookup('int')
    var any = tbase.lookup('any')
    t.table_assert([
        [ 'str_or_props',                        'exp' ],
        [ 'obj',                                 [ true, true ] ],
        [ { to_obj: { '*': any } },                 [ true, true ] ],
        [ { to_obj: { '*': int } },                 [ true, false ] ],
        [ { to_obj: { 'a*': int } },                [ false, false ] ],
        [ { to_obj: { a: int } },                   [ false, false ] ],
        [ { to_obj: { a: int, 'a*': int } },        [ false, false ] ],
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
        [ {base:'obj', to_obj: {'s*':arr_anyint}},             '{"s*":[{"$mul":["int","myint"]}]}' ],
        [ {base:'str'},                                     '{"$base":"str"}' ],
        [ {base:'str', name: 'i'},                          'i' ],

    ], function (args) {
        var t = typeof args === 'string' ? tbase.lookup(args) : tbase.create(args)
        return t.toString()
    })
})

test('create() and obj()', function (t) {
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
        [ 'i',                                         {name_depth:0},     'int' ],
        [ 'b',                                         {name_depth:0},     'boo' ],
        [ 'a',                                         {name_depth:0},     [] ],
        [ 'o',                                         {name_depth:0},     {} ],
        [ 'str',                                       null,               { $base: 'str', $name: 'str', $desc: 'A string of unicode characters (code points in range 0..1114111)', $tinyname: 's', $fullname: 'string' } ],
        [ 'int',                                       null,               { $base: 'int', $name: 'int', $desc: 'An unbounded integer (range ..)', $tinyname: 'i', $fullname: 'integer' }   ],
        [ 'arr',                                       null,               { $name: 'arr', $desc: 'Array of values matching types in a *cycle* (also see multi type).  [str] is an array of strings while [str, int] is an alternating array of [str, int, str, int, ...]', $tinyname: 'a', $fullname: 'array', $arr: [ '*' ] } ],
        [ 'obj',                                       null,               { $name: 'obj', $desc: 'A record-like object with fixed field names, or flexible fields (using *-expressions)', $tinyname: 'o', $fullname: 'object', '*': '*' } ],
        [ {base: 'obj', to_obj: { a: arr } },             null,               { a: [] } ],
        [ {base: 'obj', to_obj: { '*':any } },            null,               {'*':'*'} ],        // custom object has this different look from base type '{}' - though functionally the same.
        [ {base: 'arr', arr: ['*']},                   null,               ['*'] ],            // custom array has this different look from base type '[]' - though functionally the same.
        [ {base: 'int'},                               null,               { $base: 'int' }],
        [ {base: 'int', name: 'foo'},                  null,               { $base: 'int', $name: 'foo' } ],
        [ int_arr,                                     null,               [ 'int' ] ],
        [ {arr: [int_arr]},                            null,               [ ['int'] ] ],
        [ {arr: [my_int_arr]},                         null,               [ 'my_int_arr' ] ],
        [ {arr: all_types},                            null,               [ [], 'blb', 'boo', 'byt', 'dec', 'flt', 'int', 'mul', 'nul', 'num', {}, 'str', 'typ' ] ],
        [ {to_obj: {a:int}},                              null,               { a: 'int' } ],
        [ {to_obj: {'a*':int}},                           null,               { 'a*': 'int' } ],
        [ {to_obj: { a: int_arr } },                      null,               { a: [ 'int' ] } ],
        [ {to_obj: { a: int_arr } },                      {name_depth:0},     { a: [ 'int' ] } ],
        [ {to_obj: { a: int_arr } },                      {name_depth:0},     { a: [ 'int' ] } ],
        [ {to_obj: { a: int_arr } },                      {name_depth:1},     { a: [ 'int' ] } ],
        [ {to_obj: { a: int_arr } },                      {name_depth:2},     { a: [ 'int' ] } ],
        [ {to_obj: { a: int_arr } },                      {name_depth:2},     { a: [ 'int' ] } ],
        [ {name: 'foo', to_obj: { a: my_int_arr } },      {name_depth:0},     'foo' ],
        [ {name: 'foo', to_obj: { a: my_int_arr } },      {name_depth:1},     { $name: 'foo', a: 'my_int_arr' } ],
        [ {name: 'foo', to_obj: { a: my_int_arr } },      {name_depth:2},     { $name: 'foo', a: { $name: 'my_int_arr', $arr: [ 'my_int' ] } } ],
        [ {name: 'foo', to_obj: { a: int_arr } },         {name_depth:1},     { $name: 'foo', a: [ 'int' ] } ],
    ], function (str_or_props, opt) {
        var t = typeof str_or_props === 'string' ? tbase.lookup(str_or_props) : tbase.create(str_or_props)
        return t.to_obj(opt)
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
        [ {to_obj: {a: mul1}},                            null,               { a: 'int' } ],
        [ {to_obj: {a: mul2}},                            null,               { a: 'int' } ],
        [ {to_obj: {a: mul_arr}},                         null,               { a: ['int', []] } ],

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
        [ {to_obj: {a: mul1}},          null,               { a: 'foo' } ],
        [ {to_obj: {a: mul_arr}},       null,               { a: ['foo'] } ],

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
        [ {to_obj: {a: 'unresolved'}},                    null,               { a: 'unresolved' } ],
        [ {to_obj: {'b*': 'unresolved'}},                 null,               { 'b*': 'unresolved' } ],
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
    var obj = create({to_obj: {a:mul, b:str2, '*':num1, 'num*':int}})

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

    var obj1 = create({base: 'obj', to_obj: {a_multi: mul1}})
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
        [ 'abc',                { s: 'abc', wild_lit: [] } ],
        [ 'a^bc',               { s: 'abc', wild_lit: [] } ],
        [ 'a^b^c',              { s: 'abc', wild_lit: [] } ],
        [ 'a^b^^c',             { s: 'ab^c', wild_lit: [] } ],
        [ '^^',                 { s: '^', wild_lit: [] } ],
        [ '*',                  { s: '*', wild_lit: [] } ],
        [ '^^x*',               { s: '^x*', wild_lit: [] } ],
        [ '^*',                 { s: '*', wild_lit: [0] } ],
        [ '^^^*',               { s: '^*', wild_lit: [1] } ],
        [ '^^^*x^*',            { s: '^*x*', wild_lit: [1,3] } ],
        [ '^^abc^*x^*',         { s: '^abc*x*', wild_lit: [4,6] } ],
    ], function (s) {
        var info = tbase._unesc_caret(s)
        info.wild_lit = Object.keys(info.wild_lit).map(function (k) { return Number(k) })   // convert sparse array to just keys
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