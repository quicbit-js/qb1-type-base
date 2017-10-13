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

var TYPE_DATA = {
// name
    //   tinyname  fullname  descriptoin
    '*': [ '*',   'any',     'Represents any value or type.  For example, [*] is an array of anything' ],
    arr: [ 'a',   'array',   'Array of values matching types in a *cycle* (also see multi type).  [str] is an array of strings while [str, int] is an alternating array of [str, int, str, int, ...]' ],
    blb: [ 'X',   'blob',    'A sequence of bytes' ],
    boo: [ 'b',   'boolean', 'A true or false value.  Also can be a 0 or non-zero byte' ],
    byt: [ 'x',   'byte',    'An integer in range 0..255'   ],
    dec: [ 'd',   'decimal', 'An unbounded base-10 number (range ~~)' ],
    fal: [ 'F',   'false',   'False boolean value' ],
    flt: [ 'f',   'float',   'An unbounded base-2 number (range ~~)' ],
    int: [ 'i',   'integer', 'An unbounded integer (range ..)' ],
    mul: [ 'm',   'multi',   'A set of possible types in the form t1|t2|t3, (also see array cycling types)'   ],
    nul: [ 'N',   'null',    'A null value which represents "not-set" for most situations' ],
    num: [ 'n',   'number',  'Any rational number including decimals, floats, and integers' ],
    obj: [ 'o',   'object',  'A record-like object with fixed field names, or flexible fields (using *-expressions)'  ],
    str: [ 's',   'string',  'A string of unicode characters (code points in range 0..1114111)'  ],   // (1-3 chained bytes, 7-21 bits)
    tru: [ 'T',   'true',    'True boolean value' ],
    typ: [ 't',   'type',    'When type is used as a value, it represents one of the types in this list or any referenceable or registered type'  ],
}

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
    fal: FalType,
    tru: TruType,
    nul: NulType,
}

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
    this.type = props.type
    this.base = base
    this.code = BASE_CODES[props.base]
    this.name = props.name || null
    this.desc = props.desc || null
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
    constructor: Type,
    toString: function () {
        return this.name || 'unnamed'
    },
}

// Type (Type)
function TypType (props) {
    Type.call(this, 'typ', props)
    this.type = null           // use null to indicate this special type - instead of cyclical this.type = this (acyclic graphs are easier to work with)
}
TypType.prototype = extend(Type.prototype, {
    constructor: TypType,
})

var TYPTYPE
function create (props) {
    if (TYPTYPE == null) {
        var td = TYPE_DATA.typ
        TYPTYPE = new TypType({base: 'typ', name: 'typ', tinyname: td[0], fullname: td[1], desc: td[2] })
    }
    if (props.name === 'typ') {
        return TYPTYPE
    }
    var ctor = CTORS_BY_BASE[props.base] || err('unknown base type: ' + props.base)
    props.type == null || props.type === 'typ' || props.type.name === 'typ' || err('object is not a type: ' + props.type)
    props.type = TYPTYPE
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

// note - the calls to create() have to happen *after* the prototype setup above.
var BASE_CODES = qbobj.map(TYPE_DATA, null, function (k,v) { return v[0].charCodeAt(0) })
var TYPES_BY_NAME = qbobj.map(TYPE_DATA, null, function (k,v) {return create({base: k, name: k, tinyname: v[0], fullname: v[1], desc: v[2] })})
var TYPES = Object.keys(TYPES_BY_NAME).map(function (k) { return TYPES_BY_NAME[k] })
TYPES.sort(function (a,b) { return a.name > b.name ? 1 : -1 })       // names never equal


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

// return sorted list of names.  name_prop is 'name' (default) 'tinyname' or 'fullname'
function names (name_prop) {
    return TYPES.map(function (t) { return t[name_prop || 'name'] }).sort()
}

function err (msg) { throw Error(msg) }

module.exports = {
    names: names,
    create: create,
    lookup: lookup,
    TYPES_BY_NAME: TYPES_BY_NAME,   // by name, tinyname and fullname
    PROPS_BY_NAME: PROPS_BY_NAME,   // by name, tinyname and fullname
    CODES: BASE_CODES,
}
