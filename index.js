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

var assign = require('qb-assign')
var extend = require('qb-extend-flat')

var TYPE_DATA = [
    // tiny,  curt,     full,       description
    [ null,  '*',       'any',     'Represents any value or type.  For example, [*] is an array of anything' ],
    [ 'a',   'arr',     'array',   'Array of values matching types in a *cycle* (also see multi type).  [str] is an array of strings while [str, int] is an alternating array of [str, int, str, int, ...]' ],
    [ 'X',   'blb',     'blob',    'A sequence of bytes' ],
    [ 'b',   'boo',     'boolean', 'A true or false value.  Also can be a 0 or non-zero byte' ],
    [ 'x',   'byt',     'byte',    'An integer in range 0..255'   ],
    [ 'd',   'dec',     'decimal', 'An unbounded base-10 number (range ~~)' ],
    [ 'f',   'flt',     'float',   'An unbounded base-2 number (range ~~)' ],
    [ 'i',   'int',     'integer', 'An unbounded integer (range ..)' ],
    [ 'm',   'mul',     'multi',   'A set of possible types in the form t1|t2|t3, (also see array cycling types)'   ],
    [ 'n',   'num',     'number',  'Any rational number including decimals, floats, and integers' ],
    [ 'o',   'obj',     'object',  'An object with flexible keys and flexible or fixed types which may be constrained using *-expressions'  ],   //  values must be as key/value pairs and the order in the value is the only order known.
    [ 'r',   'rec',     'record',  'An object with fixed keys and types such as { field1: str, field2: [int] }' ],   //  order is known so values can be without keys (in order) or with keys (in any order)
    [ 's',   'str',     'string',  'A string of unicode characters (code points in range 0..1114111)'  ],   // (1-3 chained bytes, 7-21 bits)
    [ 't',   'typ',     'type',    'When type is used as a value, it represents of of the types in this list or any referenceable or registered type'  ],
    [ 'F',   'fal',     'false',   'False boolean value' ],
    [ 'N',   'nul',     'null',    'A null value which represents "not-set" for most situations' ],
    [ 'T',   'tru',     'true',    'True boolean value' ],
]
var CODES = TYPE_DATA.reduce(function (m, r) { m[r[1]] = (r[0] || r[1]).charCodeAt(0); return m }, {})

// qb1 core/bootstrap types.  all types are extensions or assemblies of these core types.
// Each built-in type has the form:
//
//      { $type: type, $nam: str }
//
// ... where the 'type' value is any registered type (recursive).  Since 'type' is the default for every
// type object, we can express the built-in types more succinctly as:
//
//      { $name: str }
//
// Custom record types are defined:
//
//      { $name: str, key1: type, key2: type, ... }
//
// ... again where keys are strings and 'type' values are any registered type (recursive)
//
// Objects have the same form -
//
//      { $name: str, key1: type, key2: type, ... }
//
// ... however, at least one of the keys must have a wild card '*' to be considered an object (and not a record).
// Unlike records that have fixed structure, an object allows unlimited key possibilties.  Definitions of records themselves are
// actually 'object' types with the stipulation that keys start with a letter and may not contain '*'.
//
function Type (props) {
    this.name = props.name
    this.desc = props.desc
    if (props.name) {
        this.tinyname = props.tinyname || props.name
        this.fullname = props.fullname || props.name
    } else {
        !props.tinyname || err('tinyname without name')
        !props.fullname || err('fullname without name')
        this.tinyname = this.fullname = null
    }

    this.stip = props.stip || null
}
Type.prototype = {
    code: -1,
    base: null,
    type: 'typ',
    constructor: Type,
    toString: function () { return this.name || 'unnamed' },
    isBase: function () { return this.name === this.base }
}

function create (obj) {
    if (typeof obj === 'string') {
        obj = TYPES_BY_NAME[obj] || err('unknown type: ' + obj)
    }
    var base = obj.base || obj.name
    var ctor = CTORS_BY_BASE[base] || err('unknown base type: ' + base)
    obj.type == null || obj.type === 'typ' || err('object is not a type object: ' + obj.type)
    // use flyweight objects here?
    return new (ctor)(obj)
}

// Any
function AnyType (props) {
    Type.call(this, props)
}
AnyType.prototype = extend(Type.prototype, {
    base: '*',
    constructor: AnyType,
})

// Array
function ArrType (props) {
    Type.call(this, props)
    this.items = props.items || ['*']
}
ArrType.prototype = extend(Type.prototype, {
    base: 'arr',
    constructor: ArrType,
})

// Blob
function BlbType (props) {
    Type.call(this, props)
}
BlbType.prototype = extend(Type.prototype, {
    base: 'blb',
    constructor: BlbType,
})

// Boolean
function BooType (props) {
    Type.call(this, props)
}
BooType.prototype = extend(Type.prototype, {
    base: 'boo',
    constructor: BooType,
})

// Byte
function BytType (props) {
    Type.call(this, props)
}
BytType.prototype = extend(Type.prototype, {
    base: 'byt',
    constructor: BytType,
})

// Decimal
function DecType (props) {
    Type.call(this, props)
}
DecType.prototype = extend(Type.prototype, {
    base: 'dec',
    constructor: DecType,
})

// Float
function FltType (props) {
    Type.call(this, props)
}
FltType.prototype = extend(Type.prototype, {
    base: 'flt',
    constructor: FltType,
})

// Multiple
function MulType (props) {
    Type.call(this, props)
}
MulType.prototype = extend(Type.prototype, {
    base: 'mul',
    constructor: MulType,
})


// Integer
function IntType (props) {
    Type.call(this, props)
}
IntType.prototype = extend(Type.prototype, {
    base: 'int',
    constructor: IntType,
})

// Number
function NumType (props) {
    Type.call(this, props)
}
NumType.prototype = extend(Type.prototype, {
    base: 'num',
    constructor: NumType,
})

// Object - like record, but has one or more expressions
function ObjType (props) {
    Type.call(this, props)
    this.expr = props.expr || {'*':'*'}
    this.fields = props.fields || {}
}
ObjType.prototype = extend(Type.prototype, {
    base: 'obj',
    constructor: ObjType,
})

// Record
function RecType (props) {
    Type.call(this, props)
    this.fields = props.fields || {}
}
RecType.prototype = extend(Type.prototype, {
    base: 'rec',
    constructor: RecType,
})

// String
function StrType (props) {
    Type.call(this, props)
}
StrType.prototype = extend(Type.prototype, {
    base: 'str',
    constructor: StrType,
})

// Type (Type)
function TypType (props) {
    Type.call(this, props)
}
TypType.prototype = extend(Type.prototype, {
    base: 'typ',
    constructor: TypType,
})

// False
function FalType (props) {
    Type.call(this, props)
}
FalType.prototype = extend(Type.prototype, {
    base: 'fal',
    constructor: FalType,
})

// True
function TruType (props) {
    Type.call(this, props)
}
TruType.prototype = extend(Type.prototype, {
    base: 'tru',
    constructor: TruType,
})

// Null
function NulType (props) {
    Type.call(this, props)
}
NulType.prototype = extend(Type.prototype, {
    base: 'nul',
    constructor: NulType,
})

var CTORS = [ AnyType, ArrType, BooType, BlbType, BytType, DecType, FltType, MulType, IntType, NumType, ObjType, RecType, StrType, TypType, FalType, TruType, NulType ]
CTORS.forEach(function (ctor) { ctor.prototype.code = CODES[ctor.prototype.base] })     // assign integer codes

var CTORS_BY_BASE = CTORS.reduce(function (m, ctor) { m[ctor.prototype.base] = ctor; return m }, {})

function Prop(tinyname, name, fullname, type, desc) {
    this.name = name
    this.tinyname = tinyname || name
    this.fullname = fullname || name
    this.desc = desc
    this.type = type
}
Prop.prototype = {
    constructor: Prop,
}

// These are the user-facing property names and descriptoins for types.  The internal Type object, above,
// keeps a normalized version of the user-facing form for reference and adds other derived
// properties, but keep in mind that these object properties fully describe a given object and
// the internal properties are derived for convenience or performance.
var PROPS =
    [
        // tinyname     name            fullname        type            description
        [ 't',         'type',          null,           's|o',          'Describes the type / structure / form of the value'  ],
        [ 'n',         'name',          null,           's',            'A concise name of a type name or property such as "int" or "arr" or "typ"' ],
        [ 'd',         'desc',          'description',  's|N',          'A description of a type or property' ],
        [ 'tn',        'tinyname',      null,           's|N',          'The tiny name of a name or property such as "i" or "a" which are defined only for the most common properties and types'  ],
        [ 'fn',        'fullname',      null,           's|N',          'The full name of a type or property such as "description", "integer" or "array"'  ],
        [ 'b',         'base',          null,           '*',            'Basic type that this type is based upon (integer, string, object, record...)'  ],
        [ 'v',         'val',           'value',        '*',            'Value matching the type'  ],
        [ 's',         'stip',          'stipulations', '{s:s|r}|N',    'Stipulations for write validation'  ],
        [ null,        'items',         null,           '[t]',          'Array types'  ],
        [ null,        'fields',        null,           '{*:t}',        'Record types'  ],
        [ null,        'expr',         'expressions',   '{*:t}',        'Object expression types'  ],
    ].map(function (r) { return new Prop(r[0], r[1], r[2], r[3], r[4]) } )

var PROPS_BY_NAME = PROPS.reduce(function (m, p) {
    m[p.name] = p
    m[p.tinyname] = p
    m[p.fullname] = p
    return m
}, {})

function err (msg) { throw Error(msg) }

var TYPES = TYPE_DATA.map(function (r) { return create({tinyname: r[0], name: r[1], fullname: r[2], desc: r[3] }) })
var TYPES_BY_NAME = TYPES.reduce(function (m, t) { m[t.name] = t; return m }, {})

module.exports = {
    names: function (tnf) { return TYPES.map(function (t) { return t[tnf || 'name'] }).sort() },
    create: create,
    PROPS_BY_NAME: PROPS_BY_NAME,
    CODES: CODES
}
