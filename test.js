var test = require('test-kit').tape()
var base = require('.')

var int = base.int()
console.log(int.info())

// var unt = int.subtype({name: 'unt', emb:{range: '0..'}})
// console.log(unt.toString(), unt.emb.toString())

/*
// vt's (value types) in qb1 are type objects supporting nesting and fast aggregation.  for
// this module, we only need to assert that types have _str and _jsn functions.
var mockvt = {
    _str: function (opt, method) { return method ? opt + '/' + method : opt },
}

test('str - name', function (t) {
    t.table_assert([
        [ 'name',  'opt',               'exp' ],
        [ 'boo',  {name: 'name'},   'boo' ],
        [ 'blb',  {name: 'name'},   'blb' ],
        [ 'byt',  {name: 'name'},   'byt' ],
        [ 'dec',  {name: 'name'},   'dec' ],
        [ 'fal',  {name: 'name'},   'fal' ],
        [ 'flt',  {name: 'name'},   'flt' ],
        [ 'int',  {name: 'name'},   'int' ],
        [ 'nul',  {name: 'name'},   'nul' ],
        [ 'num',  {name: 'name'},   'num' ],
        [ 'rat',  {name: 'name'},   'rat' ],
        [ 'tru',  {name: 'name'},   'tru' ],
        [ 'typ',  {name: 'name'},   'typ' ],
        [ 'unt',  {name: 'name'},   'unt' ],
        [ 'str',  {name: 'name'},   'str' ],
        [ '*',    {name: 'name'},   '*' ],
    ], function (nam, opt) {
        return type(nam).str(opt)
    })
})

test.only('json - nam', function (t) {
    t.table_assert([
        [ 'name', 'stip',        'opt',               'exp' ],
        // [ 'boo',  null,          {name: 'name'},   '"boo"' ],
        // [ 'blb',  null,          {name: 'name'},   '"blb"' ],
        [ 'blb',  {size:128},    {name: 'name'},   '"blb128"' ],
        [ 'byt',  null,          {name: 'name'},   '"byt"' ],
        [ 'dec',  null,          {name: 'name'},   '"dec"' ],
        [ 'fal',  null,          {name: 'name'},   '"fal"' ],
        [ 'flt',  null,          {name: 'name'},   '"flt"' ],
        [ 'int',  null,          {name: 'name'},   '"int"' ],
        [ 'int',  {size:8},      {name: 'name'},   '"int8"' ],
        [ 'nul',  null,          {name: 'name'},   '"nul"' ],
        [ 'num',  null,          {name: 'name'},   '"num"' ],
        [ 'rat',  null,          {name: 'name'},   '"rat"' ],
        [ 'tru',  null,          {name: 'name'},   '"tru"' ],
        [ 'unt',  null,          {name: 'name'},   '"unt"' ],
        [ 'str',  null,          {name: 'name'},   '"str"' ],
        [ 'str',  {size:255},    {name: 'name'},   '"str255"' ],
        [ '*',    null,          {name: 'name'},   '"*"' ],
    ], function (name, stip, opt) {
        return type(name, stip).jsn(opt)
    })
})

test('str - name', function (t) {
    t.table_assert([
        [ 'type', 'stips',        'opt',                'exp' ],
        [ '*',    null,          {name: 'name'},   'any' ],
        [ 'arr',  null,          {name: 'name'},   '[any]' ],
        [ 'boo',  null,          {name: 'name'},   'boolean' ],
        [ 'blb',  null,          {name: 'name'},   'blob' ],
        [ 'blb',  {size:128},    {name: 'name'},   'blob128' ],
        [ 'byt',  null,          {name: 'name'},   'byte' ],
        [ 'dec',  null,          {name: 'name'},   'decimal' ],
        [ 'fal',  null,          {name: 'name'},   'false' ],
        [ 'flt',  null,          {name: 'name'},   'float' ],
        [ 'int',  null,          {name: 'name'},   'integer' ],
        [ 'int',  {size:8},      {name: 'name'},   'integer8' ],
        [ 'nul',  null,          {name: 'name'},   'null' ],
        [ 'num',  null,          {name: 'name'},   'number' ],
        [ 'obj',  null,          {name: 'name'},   '{any}' ],
        [ 'rat',  null,          {name: 'name'},   'rational' ],
        [ 'tru',  null,          {name: 'name'},   'true' ],
        [ 'unt',  null,          {name: 'name'},   'unteger' ],
        [ 'str',  null,          {name: 'name'},   'string' ],
        [ 'str',  {size:255},    {name: 'name'},   'string255' ],
    ], function (type, stips, opt) {
        return type(type).str(stips, opt)
    })
})

test('str - char', function (t) {
    t.table_assert([
        [ 'type', 'stips',        'opt',                'exp' ],
        [ '*',    null,          {name: 'char'},   '*' ],
        [ 'arr',  null,          {name: 'char'},   '[*]' ],
        [ 'boo',  null,          {name: 'char'},   'b' ],
        [ 'blb',  null,          {name: 'char'},   'X' ],
        [ 'blb',  {size:128},    {name: 'char'},   'X128' ],
        [ 'byt',  null,          {name: 'char'},   'x' ],
        [ 'dec',  null,          {name: 'char'},   'd' ],
        [ 'fal',  null,          {name: 'char'},   'F' ],
        [ 'flt',  null,          {name: 'char'},   'f' ],
        [ 'int',  null,          {name: 'char'},   'i' ],
        [ 'int',  {size:8},      {name: 'char'},   'i8' ],
        [ 'nul',  null,          {name: 'char'},   'N' ],
        [ 'num',  null,          {name: 'char'},   'n' ],
        [ 'obj',  null,          {name: 'char'},   '{*}' ],
        [ 'rat',  null,          {name: 'char'},   'r' ],
        [ 'tru',  null,          {name: 'char'},   'T' ],
        [ 'unt',  null,          {name: 'char'},   'u' ],
        [ 'unt',  {size:8},      {name: 'char'},   'u8' ],      // equivalent to byte 'x'
        [ 'str',  null,          {name: 'char'},   's' ],
        [ 'str',  {size:255},    {name: 'char'},   's255' ],
    ], function (type, stips, opt) {
        return type(type).str(stips, opt)
    })
})

test('name lists', function (t) {
    // NOTE: 'any' and 'mul' are always returned in the first two positions.
    t.table_assert([
        [ 'fn',     'exp ' ],
        [ 'names', ['any','array','blob','boolean','byte','decimal','false','float','integer','null','number','object','rational','string','true','type','unteger','multiple'] ],
        [ 'nams',  ['*','arr','blb','boo','byt','dec','fal','flt','int','nul','num','obj','rat','str','tru','typ','unt','mul'] ],
        [ 'chars', ['*','a','X','b','x','d','F','f','i','N','n','o','r','s','T','t','u','m'] ],
        [ 'sized', ['blb','dec','flt','int','rat','str','unt'] ],
    ], function (fn) {
        return type[fn]()
    })
})

test('toString', function (t) {
    t.table_assert([
        [ 'nam',      'exp' ],
        [ 'int',      'int_def'],
        [ 'obj',      'obj_def'],
    ], function (nam) {
        return type(nam).toString()
    })
})

test('create errors', function (t) {

    t.table_assert([
        [ 'nam',        'exp' ],
        [ 'foo',        /type not defined/ ],
    ], function (nam) {
        type(nam)
    }, {assert: 'throws'})
})

test('validate stips - OK', function (t) {
    t.table_assert([
        [ 'nam',        'stips',             'exp' ],
        [ 'int',        {size:8},           true ],
        [ 'obj',        {vt:{type:'type'}}, true ],
    ], function (nam, stips) {
        type(nam).validate_stips(stips)
        return true
    })
})

test('validate stips - error', function (t) {
    t.table_assert([
        [ 'nam',        'stips',         'exp' ],
        [ 'arr',        {vt:''},        /invalid value-type/ ],
        [ 'int',        {size:2},       /invalid size/ ],
        [ 'unt',        {size:129},     /invalid size/ ],
        [ 'rat',        {size:'x'},     /invalid size/ ],
        [ 'rat',        {size:32},      /invalid size/ ],
        [ 'flt',        {size:27},      /invalid size/ ],
        [ 'dec',        {size:8},       /invalid size/ ],
        [ 'str',        {size:0},       /invalid size/ ],
        [ 'blb',        {size:''},      /invalid size/ ],
    ], function (nam, stips) {
        type(nam).validate_stips(stips)
    }, {assert: 'throws'})
})

test('is_def', function (t) {
    t.table_assert([
        [ 'nam',            'exp' ],
        [ 'int',            true  ],
        [ 'str',            true  ],
        [ 'foo',            false ],
    ], type.is_def)
})

*/