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
var BASE_CODES = TYPE_DATA.reduce(function (m, r) { m[r[1]] = (r[0] || r[1]).charCodeAt(0); return m }, {})

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
function Type (base, props) {
    this.type = 'typ'
    this.base = base
    this.code = BASE_CODES[props.base]
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
    constructor: Type,
    toString: function () { return this.name || 'unnamed' },
}

function create (props) {
    var ctor = CTORS_BY_BASE[props.base] || err('unknown base type: ' + props.base)
    props.type == null || props.type === 'typ' || (props.type && props.type.name === 'typ') || err('object is not a type object: ' + props.type)
    return new (ctor)(props)
}

function lookup (name) {
    return TYPES_BY_NAME[name]
}

// Any
function AnyType (props) {
    Type.call(this, '*', props)
}
AnyType.prototype = extend(Type.prototype, {
    constructor: AnyType,
})

// Array
function ArrType (props) {
    Type.call(this, 'arr', props)
    this.items = props.items || ['*']
}
ArrType.prototype = extend(Type.prototype, {
    constructor: ArrType,
    is_generic: function () { return this.items.length == 1 && this.items[0] === '*' }
})

// Blob
function BlbType (props) {
    Type.call(this, 'blb', props)
}
BlbType.prototype = extend(Type.prototype, {
    constructor: BlbType,
})

// Boolean
function BooType (props) {
    Type.call(this, 'boo', props)
}
BooType.prototype = extend(Type.prototype, {
    constructor: BooType,
})

// Byte
function BytType (props) {
    Type.call(this, 'byt', props)
}
BytType.prototype = extend(Type.prototype, {
    constructor: BytType,
})

// Decimal
function DecType (props) {
    Type.call(this, 'dec', props)
}
DecType.prototype = extend(Type.prototype, {
    constructor: DecType,
})

// Float
function FltType (props) {
    Type.call(this, 'flt', props)
}
FltType.prototype = extend(Type.prototype, {
    constructor: FltType,
})

// Multiple
function MulType (props) {
    Type.call(this, 'mul', props)
}
MulType.prototype = extend(Type.prototype, {
    constructor: MulType,
})


// Integer
function IntType (props) {
    Type.call(this, 'int', props)
}
IntType.prototype = extend(Type.prototype, {
    constructor: IntType,
})

// Number
function NumType (props) {
    Type.call(this, 'num', props)
}
NumType.prototype = extend(Type.prototype, {
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
    Type.call(this, 'obj', props)
    this.fields = props.fields || {}
    this.expr = props.expr || {}
    // default to any-content object when no fields are given
    if (Object.keys(this.expr).length === 0 && Object.keys(this.fields).length === 0) {
        this.expr = {'*':'*'}
    }
}
ObjType.prototype = extend(Type.prototype, {
    constructor: ObjType,
    // return true if fields are simply {'*':'*'}
    is_generic: function () {
        if (Object.keys(this.fields).length === 0) {
            return this.expr['*'] === '*' && Object.keys(this.expr).length === 1
        } else {
            return false
        }
    },
    // return true if this is object has only the wild-card key {'*': some-type}
    has_generic_key: function () {
        if (Object.keys(this.fields).length === 0) {
            var ekeys = Object.keys(this.expr)
            return ekeys.length === 1 && ekeys[0] === '*'
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
    Type.call(this, 'str', props)
}
StrType.prototype = extend(Type.prototype, {
    constructor: StrType,
})

// Type (Type)
function TypType (props) {
    Type.call(this, 'typ', props)
}
TypType.prototype = extend(Type.prototype, {
    constructor: TypType,
})

// False
function FalType (props) {
    Type.call(this, 'fal', props)
}
FalType.prototype = extend(Type.prototype, {
    constructor: FalType,
})

// True
function TruType (props) {
    Type.call(this, 'tru', props)
}
TruType.prototype = extend(Type.prototype, {
    constructor: TruType,
})

// Null
function NulType (props) {
    Type.call(this, 'nul', props)
}
NulType.prototype = extend(Type.prototype, {
    constructor: NulType,
})

var CTORS_BY_BASE = {
    '*': AnyType,
    arr: ArrType,
    boo: BooType,
    blb: BlbType,
    byt: BytType,
    dec: DecType,
    flt: FltType,
    mul: MulType,
    int: IntType,
    num: NumType,
    obj: ObjType,
    str: StrType,
    typ: TypType,
    fal: FalType,
    tru: TruType,
    nul: NulType,
}

function Prop(tinyname, name, fullname, inherit, type, desc) {
    this.name = name
    this.tinyname = tinyname || name
    this.fullname = fullname || name
    this.desc = desc
    this.inherit = inherit
    this.type = type
}
Prop.prototype = {
    constructor: Prop,
}

// These are the user-facing property names and descriptoins for types.  The internal Type object, above,
// keeps a normalized version of the user-facing form for reference and adds other derived
// properties, but keep in mind that these object properties fully describe a given object and
// the internal properties are derived for convenience or performance.

// type inherit flags (child-to-container inheritance):
//
//      YES_EQL   - inherited. if both are set they must be equal
//      NO_NEQ    - not inherited.  if both are set they must not be equal
//      NO        - not inherited.  value is ignored.
//      YES_VAL   - inherited according to the value rules specified by the inherit property (these rules)
//      YES_MRG   - inherit/merge.  result will be a subset of the container and child value (intersection of constraints)
var PROPS =
    [
        // tinyname     name            fullname        inherit,    type            description
        [ 't',         'type',          null,           'YES_EQL',  's|o',          'Describes the type / structure / form of the value'  ],
        [ 'n',         'name',          null,           'NO_NEQ',   's',            'A concise name of a type name or property such as "int" or "arr" or "typ"' ],
        [ 'd',         'desc',          'description',  'NO',       's|N',          'A description of a type or property' ],
        [ 's',         'stip',          'stipulations', 'YES_MRG',  '{s:s|r}|N',    'Stipulations for write validation'  ],
        [ 'b',         'base',          null,           'YES_EQL',  '*',            'Basic type that this type is based upon (integer, string, object, record...)'  ],
        [ null,        'code',          null,           'NO',       'n',            'Basic type that this type is based upon (integer, string, object, record...)'  ],
        [ 'v',         'value',         null,           'YES_VAL',  '*',            'Value matching the type'  ],
        [ null,        'items',         null,           'YES_MRG',  '[t]',          'Array types'  ],
        [ null,        'fields',        null,           'YES_MRG',  '{*:t}',        'Object field types'  ],
        [ null,        'expr',         'expressions',   'MRG',      '{*:t}',        'Object field types covering a range of fields via expressions'  ],
        [ 'tn',        'tinyname',      null,           'NO_NEQ',   's|N',          'The tiny name of a name or property such as "i" or "a" which are defined only for the most common properties and types'  ],
        [ 'fn',        'fullname',      null,           'NO_NEQ',   's|N',          'The full name of a type or property such as "description", "integer" or "array"'  ],
    ].map(function (r) { return new Prop(r[0], r[1], r[2], r[3], r[4], r[5]) } )

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
var TYPES_BY_NAME = TYPES.reduce(function (m, t) { m[t.name] = m[t.fullname] = m[t.tinyname] = t; return m }, {})

module.exports = {
    names: names,
    types: base_types,
    create: create,
    lookup: lookup,
    PROPS_BY_NAME: PROPS_BY_NAME,
    CODES: BASE_CODES
}
