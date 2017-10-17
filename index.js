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
    //   tinyname  fullname  description
    '*': [ '*',   'any',     'Represents any value or type.  For example, [*] is an array of anything' ],
    arr: [ 'a',   'array',   'Array of values matching types in a *cycle* (also see multi type).  [str] is an array of strings while [str, int] is an alternating array of [str, int, str, int, ...]' ],
    blb: [ 'X',   'blob',    'A sequence of bytes' ],
    boo: [ 'b',   'boolean', 'A true or false value.  Also can be a 0 or non-zero byte' ],
    byt: [ 'x',   'byte',    'An integer in range 0..255'   ],
    dec: [ 'd',   'decimal', 'An unbounded base-10 number (range ~~)' ],
    flt: [ 'f',   'float',   'An unbounded base-2 number (range ~~)' ],
    int: [ 'i',   'integer', 'An unbounded integer (range ..)' ],
    mul: [ 'm',   'multi',   'A set of possible types in the form t1|t2|t3, (also see array cycling types)'   ],
    nul: [ 'N',   'null',    'A null value which represents "not-set" for most situations' ],
    num: [ 'n',   'number',  'Any rational number including decimals, floats, and integers' ],
    obj: [ 'o',   'object',  'A record-like object with fixed field names, or flexible fields (using *-expressions)'  ],
    str: [ 's',   'string',  'A string of unicode characters (code points in range 0..1114111)'  ],   // (1-3 chained bytes, 7-21 bits)
    typ: [ 't',   'type',    'The type-type. integer, array, object, boolean, etc, all have this as their type.'  ],
}

function type_props (name) {
    var r = TYPE_DATA[name]
    return { name: name, tinyname: r[0], fullname: r[1], desc: r[2] }
}

// the types 'any', 'typ' and 'nul' are not in this list because they are only constructed once (derivative types don't exist for them)
var CTORS_BY_BASE = {
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
        if (this.name) { return this.name }
        return JSON.stringify(this.obj())
    },
    _basic_obj: function () {
        var ret = qbobj.map(this,
            // select and map keys
            function (k) {
                return {base: '$base', name: '$name', desc: '$desc', stip: '$stip'}[k]
            }
        )
        if (this.tinyname !== this.name) {
            ret.$tinyname = this.tinyname
        }
        if (this.fullname !== this.name) {
            ret.$fullname = this.fullname
        }
        return ret
    },
    _obj: function (opt, depth) {
        return (this.name && depth >= opt.name_depth ? this.name : this._basic_obj())
    },
    // return the cananoical form of object up to a given opt.name_depth
    obj: function (opt) {
        opt = assign({name_depth: 1}, opt)
        return this._obj(opt, 0)
    }
}

function create (props) {
    var ctor = CTORS_BY_BASE[props.base]
    if (ctor == null) {
        if (lookup(props.base)) {
            err('type ' + props.base + ' is not a creatable type - try using lookup instead')
        } else {
            err('unknown base type: ' + props.base)
        }
    }
    return new (ctor)(props)
}

function lookup (name) {
    return TYPES_BY_ALL_NAMES[name]
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
    this.array = props.array || [ANY]
}
ArrType.prototype = extend(Type.prototype, {
    constructor: ArrType,
    is_generic: function () { return this.array.length == 1 && this.array[0] === ANY },
    _obj: function (opt, depth) {
        if (this.name && depth >= opt.name_depth) {
            return this.name
        } else {
            var ret = Type.prototype._basic_obj.call(this)
            delete ret.$base
            var arrtypes = this.array.map(function (t) { return t._obj(opt, depth + 1) })
            if (Object.keys(ret).length === 0) {
                // a vanilla array with $base: 'arr', $array: [...]
                return arrtypes
            } else {
                ret.$array = arrtypes
                return ret
            }
        }
    }
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
    this.multi = props.multi || this.name === this.base || err('cannot create multi-type without the "multi" property')
}
MulType.prototype = extend(Type.prototype, {
    constructor: MulType,
    _obj: function (opt, depth) {
        if (this.name && depth >= opt.name_depth) {
            return this.name
        }
        var ret = Type.prototype._basic_obj.call(this)
        delete ret.$base
        ret.$multi = this.multi.map(function (t) { return t._obj(opt, depth + 1) })
        return ret
    }
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

// Object - like record, but has one or more pattern-fields (pfields)
function ObjType (props) {
    Type.call(this, 'obj', props)
    this.fields = props.fields || {}
    this.pfields = props.pfields || {}      // pattern-fields (with wild-cards)
    // default to any-content object when no fields are given
    if (Object.keys(this.pfields).length === 0 && Object.keys(this.fields).length === 0) {
        this.pfields = {'*': ANY}
    }
}
ObjType.prototype = extend(Type.prototype, {
    constructor: ObjType,
    // return true if fields are simply {'*':'*'}
    is_generic: function () {
        return Object.keys(this.fields).length === 0 && this.pfields['*'] === ANY && Object.keys(this.pfields).length === 1
    },
    // return true if this is object has only the wild-card key {'*': some-type}
    has_generic_key: function () {
        return this.pfields['*'] != null && Object.keys(this.fields).length === 0 && Object.keys(this.pfields).length === 1
    },
    fieldtyp: function (n) {
        var t = this.fields[n]
        if (t) {
            return t
        }

        var ekeys = Object.keys(this.pfields)
        for (var i=0; i<ekeys.length; i++) {
            var k = ekeys[i]
            var re =  wildcard_regex(k)
            if (re.test(n)) {
                return this.pfields[k]
            }
        }
        return null     // no matching field
    },
    _obj: function (opt, depth) {
        if (this.name && depth >= opt.name_depth) {
            return this.name
        }
        var ret = Type.prototype._basic_obj.call(this)
        delete ret.$base     // default is 'obj'
        if (Object.keys(this.fields).length) {
            qbobj.map(this.fields, null, function (k, t) {
                return t._obj(opt, depth + 1)
            }, { init: ret })
        }
        if (Object.keys(this.pfields).length) {
            qbobj.map(this.pfields, null, function (k, t) {
                return t._obj(opt, depth + 1)
            }, { init: ret })
        }
        return ret
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

// Null
function NulType (props) {
    Type.call(this, 'nul', props)
}
NulType.prototype = extend(Type.prototype, {
    constructor: NulType,
})

// note that calls to create() have to happen *after* the prototype setup above.

// create codes (used in constructors)
var BASE_CODES = qbobj.map(TYPE_DATA,  null, function (k, v) { return v[0].charCodeAt(0) })

// create single instances

var NUL = new NulType(type_props('nul'))
var TYP = new TypType(type_props('typ'))
var ANY = new AnyType(type_props('*'))

var TYPES_BY_NAME = {
    '*': ANY,
    arr: new ArrType(type_props('arr')),
    boo: new BooType(type_props('boo')),
    blb: new BlbType(type_props('blb')),
    byt: new BytType(type_props('byt')),
    dec: new DecType(type_props('dec')),
    flt: new FltType(type_props('flt')),
    mul: new MulType(type_props('mul')),
    int: new IntType(type_props('int')),
    nul: NUL,
    num: new NumType(type_props('num')),
    obj: new ObjType(type_props('obj')),
    str: new StrType(type_props('str')),
    typ: TYP,
}
var TYPES = Object.keys(TYPES_BY_NAME).map(function (k) { return TYPES_BY_NAME[k] })
var TYPES_BY_ALL_NAMES = TYPES.reduce(function (m,t) { m[t.name] = m[t.tinyname] = m[t.fullname] = t; return m}, {})
TYPES.sort(function (a,b) { return a.name > b.name ? 1 : -1 })       // names never equal

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

// Type property information including whether they are user-facing and how they are merged.

// type inherit flags (inheriting properties from a base type):
//
//      YES_EQL   - inherited. if both are set they must be equal
//      NO_NEQ    - not inherited.  if both are set they must not be equal
//      NO        - not inherited.  value is ignored.
//      YES_MRG   - inherit/merge.  result will be a subset of the container and child value (intersection of constraints)
var PROPS =
    [
        // tinyname     name            fullname        type            description
        [ 't',         'type',          null,           's|o',          'Describes the type / structure / form of the value'  ],
        [ 'v',         'value',         null,           '*',            'Value adhering to the type definition'  ],
        [ 'n',         'name',          null,           's',            'A concise name of the type such as "int" or "arr" or "typ"' ],
        [ 'd',         'desc',          'description',  's|N',          'A description of the type' ],
        [ 's',         'stip',          'stipulations', '{s:s|r}|N',    'Stipulations for write validation'  ],
        [ 'tn',        'tinyname',      null,           's|N',          'The tiny name of a type or property such as "i" or "a" which are defined only for the most common types'  ],
        [ 'fn',        'fullname',      null,           's|N',          'The full name of a type or property such as "description", "integer" or "array"'  ],
        [ 'm',         'mul',           'multi',        '[t]',          'Array of possible types for a multi-type'  ],
        [ 'a',         'arr',           'array',        '[t]',          'Cycle of array types allowed in an array'  ],
        [ null,        'base',          null,           '*',            'Type that the type is based upon / derived from (integer, string, object, array...)'  ],
    ].map(function (r) { return new Prop(r[0], r[1], r[2], r[3], r[4]) } )

var PROPS_BY_ALL_NAMES = PROPS.reduce(function (m, p) {
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
    TYPES_BY_NAME: TYPES_BY_ALL_NAMES,   // by name, tinyname and fullname
    PROPS_BY_NAME: PROPS_BY_ALL_NAMES,   // by name, tinyname and fullname
    CODES: BASE_CODES,
}
