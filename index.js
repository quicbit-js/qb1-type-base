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
    this.cust = props.cust || null  // optional user custom objects can be added during construction for js efficiency
    this.parent = null              // set if link_children() is called
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

// Any
function AnyType (props) {
    Type.call(this, '*', props)
}
AnyType.prototype = extend(Type.prototype, {
    constructor: AnyType,
})

// Array
function ArrType (props) {
    props.arr && props.arr.length || err('cannot define an array type with zero items')

    Type.call(this, 'arr', props)
    this.arr = props.arr
    this.is_generic = this.arr[0].name === '*'   // callers should verify that 'any' combined with others becomes simply ['*']
}
ArrType.prototype = extend(Type.prototype, {
    constructor: ArrType,
    _obj: function (opt, depth) {
        if (this.name && depth >= opt.name_depth) {
            // the base array instance is given a familiar object look '[]' - which is fine because
            // empty array types are checked/blocked.  created arrays with same any-pattern are returned as ['*']
            return this.name === 'arr' ? [] : this.name     // 'arr' is the base-type
        } else {
            var ret = Type.prototype._basic_obj.call(this)
            delete ret.$base
            var arrtypes = this.arr.map(function (t) {
                return (typeof t === 'string') ? t : t._obj(opt, depth + 1)  // handle string references
            })
            if (Object.keys(ret).length === 0) {
                // a vanilla array with $base: 'arr', $array: [...]
                return arrtypes
            } else {
                ret.$arr = arrtypes
                return ret
            }
        }
    },
    link_children: function () {
        var self = this
        this.arr.forEach(function (c) { if (c.link_children) {c.link_children()} c.parent = self })
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
    this.mul = props.mul || this.name === this.base || err('cannot create multi-type without the "mul" property')
}
MulType.prototype = extend(Type.prototype, {
    constructor: MulType,
    _obj: function (opt, depth) {
        if (this.name && depth >= opt.name_depth) {
            return this.name
        }
        var ret = Type.prototype._basic_obj.call(this)
        delete ret.$base
        ret.$mul = this.mul.map(function (t) {
            return (typeof t === 'string') ? t : t._obj(opt, depth + 1)     // handle string references
        })
        return ret
    },
    link_children: function () {
        var self = this
        this.mul.forEach(function (c) { if (c.link_children) {c.link_children()} c.parent = self })
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
    this.pfields = props.pfields || {}
    ;(Object.keys(this.fields).length) || (Object.keys(this.pfields).length) || err('no fields given for object')

    // generic means has *no* key specifications { '*': 'some-type' }
    this.is_generic = this.pfields['*'] != null && Object.keys(this.fields).length === 0 && Object.keys(this.pfields).length === 1

    // generic_any means has no key or type restrictions { '*':'*' }
    this.is_generic_any = this.is_generic && this.pfields['*'].name === '*'
}
ObjType.prototype = extend(Type.prototype, {
    constructor: ObjType,
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
            // the base object instance is given a familiar object look '{}' - which is fine because
            // fieldless objects are checked/blocked.  created objects with same any-pattern are returned as {'*':'*'}
            return this.name === 'obj' ? {} : this.name
        }
        var ret = Type.prototype._basic_obj.call(this)
        delete ret.$base     // default is 'obj'
        if (Object.keys(this.fields).length) {
            qbobj.map(this.fields, null, function (k, t) {
                return (typeof t === 'string') ? t : t._obj(opt, depth + 1)  // handle string references
            }, { init: ret })
        }
        if (Object.keys(this.pfields).length) {
            qbobj.map(this.pfields, null, function (k, t) {
                return (typeof t === 'string') ? t : t._obj(opt, depth + 1)  // handle string references
            }, { init: ret })
        }
        return ret
    },
    link_children: function () {
        var self = this
        qbobj.for_val(this.fields, function (c) { if (c.link_children) {c.link_children()} c.parent = self })
        qbobj.for_val(this.pfields, function (c) { if (c.link_children) {c.link_children()} c.parent = self })
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

var CONSTRUCTORS = {
    '*': AnyType,
    arr: ArrType,
    boo: BooType,
    blb: BlbType,
    byt: BytType,
    dec: DecType,
    flt: FltType,
    mul: MulType,
    int: IntType,
    nul: NulType,
    num: NumType,
    obj: ObjType,
    str: StrType,
    typ: TypType,
}

// create a vanilla base type using the given 'any' instance for array/object - (if any is not given, a new 'any' instance will be created for array/object types)
function _create_base (name, any) {
    var ctor = CONSTRUCTORS[name]
    var props = type_props(name)
    switch (name) {
        case 'arr':
            props = assign(props, {arr: [any || new AnyType(type_props('*'))]})
            break
        case 'obj':
            props = assign(props, {pfields: {'*': any || new AnyType(type_props('*'))}})
            break
        // other type props are just vanilla name, description...
    }
    return new ctor(props)
}

// public version of create_base - works like lookup(), but creates a new vanilla base type instance.
function create_base (name) {
    var t = TYPES_BY_ALL_NAMES[name]
    if (t == null) {
        return null     // same behavior as lookup()
    }
    return _create_base(t.name)
}

// Return an instance of every base type (all have base === name, which is
// not possible for types created with the public create(props) function.
// object and array types share a the same 'any' instance that is
// in the set.
function create_types () {
    var any = _create_base('*')
    var ret = [any]
    var names = ['arr', 'blb', 'boo', 'byt', 'dec', 'flt', 'int', 'mul', 'nul', 'num', 'obj', 'str', 'typ']
    names.forEach(function (n) {
        ret.push(_create_base(n))
    })
    ret.sort(function (a,b) { return a.name > b.name ? 1 : -1 })       // names never equal
    return ret
}

var TYPES = create_types()

function Prop(tinyname, name, fullname, type, desc) {
    this.name = name
    this.tinyname = tinyname
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
        [ 'b',         'base',          null,           '*',            'Type that the type is based upon / derived from (integer, string, object, array...)'  ],
    ].map(function (r) { return new Prop(r[0], r[1], r[2], r[3], r[4]) } ).sort(function (a,b) { return a.name > b.name ? 1 : -1 })

function create (props) {
    var ctor = CONSTRUCTORS[props.base] || err('unknown base type: ' + props.base)
    ;({N:1,nul:1,null:1, '*':1, t:1,typ:1,type:1}[props.base]) == null || err('type ' + props.base + ' cannot be created using properties - try using lookup() or create_base() instead')
    props.name !== props.base || err('cannot redefine a base type: ' + props.name)

    return new (ctor)(props)
}

// A set of re-usable type instances for lookup().
var TYPES_BY_ALL_NAMES = create_types(new AnyType(type_props('*'))).reduce(function (m,t) { m[t.name] = m[t.tinyname] = m[t.fullname] = t; return m}, {})

// lookup a vanilla base instance - the same instance every time
function lookup (name) {
    return TYPES_BY_ALL_NAMES[name]
}

function err (msg) { throw Error(msg) }

module.exports = {
    create: create,
    create_base: create_base,
    lookup: lookup,
    props: function () { return PROPS },
    types: function (opt) { return opt && opt.copy ? create_types(null) : TYPES },
}
