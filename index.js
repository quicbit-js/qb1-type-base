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
var qbobj = require('qb1-obj')

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
    [ 'o',   'obj',     'object',  'A record-like object with fixed field names, or flexible fields (using *-expressions)'  ],
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
    this.name = props.name || null
    this.desc = props.desc || null
    if (props.name) {
        this.tinyname = props.tinyname || props.name || null
        this.fullname = props.fullname || props.name || null
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
}

function create (props) {
    if (typeof props === 'string') {
        props = TYPES_BY_NAME[props] || err('unknown type: ' + props)
    }
    var ctor = CTORS_BY_BASE[props.base] || err('unknown base type: ' + props.base)
    props.type == null || props.type === 'typ' || err('object is not a type object: ' + props.type)
    return new (ctor)(props)
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
    is_generic: function () { return this.items.length == 1 && this.items[0] === '*' }
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

// return a wild-card regular expression. cache for fast lookup.
var WILD_EXPR = {}
function wildcard_regex(s) {
    var ret = WILD_EXPR[s]
    if (!ret) {
        var ns = s.replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&');  // escape everything except '*'
        ns = '^' + ns.replace(/[*]/g, '.*')  + '$'        // xyz*123 -> ^xyz.*123$
        ret = new RegExp(ns)
        WILD_EXPR[s] = ret
    }
    return ret
}

// Object - like record, but has one or more expressions
function ObjType (props) {
    Type.call(this, props)
    this.fields = props.fields || {}
    this.expr = props.expr || {}
    // default to any-content object when no fields are given
    if (Object.keys(this.expr).length === 0 && Object.keys(this.fields).length === 0) {
        this.expr = {'*':'*'}
    }
}
ObjType.prototype = extend(Type.prototype, {
    base: 'obj',
    constructor: ObjType,
    // return true if fields are simply {'*':'*'}
    is_generic: function () {
        if (Object.keys(this.fields).length === 0) {
            return this.expr['*'] === '*' && Object.keys(this.expr).length === 1
        } else {
            return false
        }
    },
    fieldtyp: function (n) {
        var t = this.fields[n]
        if (t) {
            return t
        }

        var ekeys = Object.keys(this.expr)
        for (var i=0; i<ekeys.length; i++) {
            var k = ekeys[i]
            var re =  wildcard_regex(k)
            if (re.test(n)) {
                return this.expr[k]
            }
        }
        return null     // no matching field
    }
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

var CTORS = [ AnyType, ArrType, BooType, BlbType, BytType, DecType, FltType, MulType, IntType, NumType, ObjType, StrType, TypType, FalType, TruType, NulType ]
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
        [ 't',         'typ',           'type',         's|o',          'Describes the type / structure / form of the value'  ],
        [ 'n',         'name',          null,           's',            'A concise name of a type name or property such as "int" or "arr" or "typ"' ],
        [ 'd',         'desc',          'description',  's|N',          'A description of a type or property' ],
        [ 'tn',        'tinyname',      null,           's|N',          'The tiny name of a name or property such as "i" or "a" which are defined only for the most common properties and types'  ],
        [ 'fn',        'fullname',      null,           's|N',          'The full name of a type or property such as "description", "integer" or "array"'  ],
        [ 'b',         'base',          null,           '*',            'Basic type that this type is based upon (integer, string, object, record...)'  ],
        [ 'v',         'val',           'value',        '*',            'Value matching the type'  ],
        [ 's',         'stip',          'stipulations', '{s:s|r}|N',    'Stipulations for write validation'  ],
        [ null,        'items',         null,           '[t]',          'Array types'  ],
        [ null,        'fields',        null,           '{*:t}',        'Object field types'  ],
        [ null,        'expr',         'expressions',   '{*:t}',        'Object field types covering a range of fields via expressions'  ],
    ].map(function (r) { return new Prop(r[0], r[1], r[2], r[3], r[4]) } )

var PROPS_BY_NAME = PROPS.reduce(function (m, p) {
    m[p.name] = p
    m[p.tinyname] = p
    m[p.fullname] = p
    return m
}, {})

//  return array of all the base types (new copies) - in name order
function base_types () {
    return names().map(function (n) { return create(n) })
}

// return sorted list of names.  name_prop is 'name' (default) 'tinyname' or 'fullname'
function names (name_prop) {
    return TYPES.map(function (t) { return t[name_prop || 'name'] }).sort()
}

function err (msg) { throw Error(msg) }

var TYPES = TYPE_DATA.map(function (r) { return create({base: r[1], tinyname: r[0], name: r[1], fullname: r[2], desc: r[3] }) })
var TYPES_BY_NAME = TYPES.reduce(function (m, t) { m[t.name] = t; return m }, {})

module.exports = {
    names: names,
    types: base_types,
    create: create,
    PROPS_BY_NAME: PROPS_BY_NAME,
    CODES: CODES
}
