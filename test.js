var test = require('test-kit').tape()

var type = require('.')

// vt's (value types) in qb1 are type objects supporting nesting and fast aggregation.  for
// this module, we only need to assert that types have _str and _jsn functions.
var mockvt = {
    _str: function (opt, method) { return method ? opt + '/' + method : opt },
}

test('str - name', function (t) {
    t.table_assert([
        [ 'name',  'opt',               'exp' ],
        [ 'boo',  {str_prop: 'name'},   'boo' ],
        [ 'blb',  {str_prop: 'name'},   'blb' ],
        [ 'byt',  {str_prop: 'name'},   'byt' ],
        [ 'dec',  {str_prop: 'name'},   'dec' ],
        [ 'fal',  {str_prop: 'name'},   'fal' ],
        [ 'flt',  {str_prop: 'name'},   'flt' ],
        [ 'int',  {str_prop: 'name'},   'int' ],
        [ 'nul',  {str_prop: 'name'},   'nul' ],
        [ 'num',  {str_prop: 'name'},   'num' ],
        [ 'rat',  {str_prop: 'name'},   'rat' ],
        [ 'tru',  {str_prop: 'name'},   'tru' ],
        [ 'typ',  {str_prop: 'name'},   'typ' ],
        [ 'unt',  {str_prop: 'name'},   'unt' ],
        [ 'str',  {str_prop: 'name'},   'str' ],
        [ '*',    {str_prop: 'name'},   '*' ],
    ], function (nam, opt) {
        return type(nam).str(opt)
    })
})

test.only('json - nam', function (t) {
    t.table_assert([
        [ 'name', 'stip',        'opt',               'exp' ],
        // [ 'boo',  null,          {str_prop: 'name'},   '"boo"' ],
        // [ 'blb',  null,          {str_prop: 'name'},   '"blb"' ],
        [ 'blb',  {size:128},    {str_prop: 'name'},   '"blb128"' ],
        [ 'byt',  null,          {str_prop: 'name'},   '"byt"' ],
        [ 'dec',  null,          {str_prop: 'name'},   '"dec"' ],
        [ 'fal',  null,          {str_prop: 'name'},   '"fal"' ],
        [ 'flt',  null,          {str_prop: 'name'},   '"flt"' ],
        [ 'int',  null,          {str_prop: 'name'},   '"int"' ],
        [ 'int',  {size:8},      {str_prop: 'name'},   '"int8"' ],
        [ 'nul',  null,          {str_prop: 'name'},   '"nul"' ],
        [ 'num',  null,          {str_prop: 'name'},   '"num"' ],
        [ 'rat',  null,          {str_prop: 'name'},   '"rat"' ],
        [ 'tru',  null,          {str_prop: 'name'},   '"tru"' ],
        [ 'unt',  null,          {str_prop: 'name'},   '"unt"' ],
        [ 'str',  null,          {str_prop: 'name'},   '"str"' ],
        [ 'str',  {size:255},    {str_prop: 'name'},   '"str255"' ],
        [ '*',    null,          {str_prop: 'name'},   '"*"' ],
    ], function (name, stip, opt) {
        return type(name, stip).jsn(opt)
    })
})

test('str - name', function (t) {
    t.table_assert([
        [ 'type', 'stips',        'opt',                'exp' ],
        [ '*',    null,          {str_prop: 'name'},   'any' ],
        [ 'arr',  null,          {str_prop: 'name'},   '[any]' ],
        [ 'boo',  null,          {str_prop: 'name'},   'boolean' ],
        [ 'blb',  null,          {str_prop: 'name'},   'blob' ],
        [ 'blb',  {size:128},    {str_prop: 'name'},   'blob128' ],
        [ 'byt',  null,          {str_prop: 'name'},   'byte' ],
        [ 'dec',  null,          {str_prop: 'name'},   'decimal' ],
        [ 'fal',  null,          {str_prop: 'name'},   'false' ],
        [ 'flt',  null,          {str_prop: 'name'},   'float' ],
        [ 'int',  null,          {str_prop: 'name'},   'integer' ],
        [ 'int',  {size:8},      {str_prop: 'name'},   'integer8' ],
        [ 'nul',  null,          {str_prop: 'name'},   'null' ],
        [ 'num',  null,          {str_prop: 'name'},   'number' ],
        [ 'obj',  null,          {str_prop: 'name'},   '{any}' ],
        [ 'rat',  null,          {str_prop: 'name'},   'rational' ],
        [ 'tru',  null,          {str_prop: 'name'},   'true' ],
        [ 'unt',  null,          {str_prop: 'name'},   'unteger' ],
        [ 'str',  null,          {str_prop: 'name'},   'string' ],
        [ 'str',  {size:255},    {str_prop: 'name'},   'string255' ],
    ], function (type, stips, opt) {
        return type(type).str(stips, opt)
    })
})

test('str - char', function (t) {
    t.table_assert([
        [ 'type', 'stips',        'opt',                'exp' ],
        [ '*',    null,          {str_prop: 'char'},   '*' ],
        [ 'arr',  null,          {str_prop: 'char'},   '[*]' ],
        [ 'boo',  null,          {str_prop: 'char'},   'b' ],
        [ 'blb',  null,          {str_prop: 'char'},   'X' ],
        [ 'blb',  {size:128},    {str_prop: 'char'},   'X128' ],
        [ 'byt',  null,          {str_prop: 'char'},   'x' ],
        [ 'dec',  null,          {str_prop: 'char'},   'd' ],
        [ 'fal',  null,          {str_prop: 'char'},   'F' ],
        [ 'flt',  null,          {str_prop: 'char'},   'f' ],
        [ 'int',  null,          {str_prop: 'char'},   'i' ],
        [ 'int',  {size:8},      {str_prop: 'char'},   'i8' ],
        [ 'nul',  null,          {str_prop: 'char'},   'N' ],
        [ 'num',  null,          {str_prop: 'char'},   'n' ],
        [ 'obj',  null,          {str_prop: 'char'},   '{*}' ],
        [ 'rat',  null,          {str_prop: 'char'},   'r' ],
        [ 'tru',  null,          {str_prop: 'char'},   'T' ],
        [ 'unt',  null,          {str_prop: 'char'},   'u' ],
        [ 'unt',  {size:8},      {str_prop: 'char'},   'u8' ],      // equivalent to byte 'x'
        [ 'str',  null,          {str_prop: 'char'},   's' ],
        [ 'str',  {size:255},    {str_prop: 'char'},   's255' ],
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
