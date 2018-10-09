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

var assign = require('qb-assign')
var extend = require('qb-extend-flat')
var qbobj = require('qb-obj')

var TYPE_DATA_BY_NAME = {
// name
    //   tinyname  fullname  code   description
    '*': [ '*',   'any',     11,     'Represents any value or type.  For example, [*] is an array of anything' ],
    arr: [ 'a',   'array',   4,     'Array of values matching types in a *cycle* (also see multi type).  [str] is an array of strings while [str, int] is an alternating array of [str, int, str, int, ...]' ],
    blb: [ 'X',   'blob',    10,     'A sequence of bytes' ],
    boo: [ 'b',   'boolean', 3,     'A true or false value.  Also can be a 0 or non-zero byte' ],
    byt: [ 'x',   'byte',    6,     'An integer in range 0..255'   ],
    dec: [ 'd',   'decimal', 8,     'An unbounded base-10 number (range ~~)' ],
    flt: [ 'f',   'float',   9,     'An unbounded base-2 number (range ~~)' ],
    int: [ 'i',   'integer', 7,     'An unbounded integer (range ..)' ],
    mul: [ 'm',   'multi',   12,     'A set of possible types in the form t1|t2|t3, (also see array cycling types)'   ],
    nul: [ 'N',   'null',    0,     'A null value which represents "not-set" for most situations' ],
    num: [ 'n',   'number',  2,     'Any rational number including decimals, floats, and integers' ],
    obj: [ 'o',   'object',  5,     'A record-like object with fixed field names, or flexible fields (using *-expressions)'  ],
    str: [ 's',   'string',  1,     'A string of unicode characters (code points in range 0..1114111)'  ],   // (1-3 chained bytes, 7-21 bits)
    typ: [ 't',   'type',    13,    'The type-type. integer, array, object, boolean, etc, all have this as their type.'  ],
}

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

var CODES_BY_NAME = qbobj.map(TYPE_DATA_BY_NAME,  null, function (k, v) { return v[2] })

function type_props (name, any) {
    var r = TYPE_DATA_BY_NAME[name]
    var ret = { name: name, tinyname: r[0], fullname: r[1], desc: r[3] } // r[2] code is included in they object
    switch (name) {
        case 'obj':
            ret = assign(ret, {to_obj: {'*': any}})
            break
        case 'arr':
            ret = assign(ret, {arr: [any]})
    }
    return ret
}

function Type (base, props, opt) {
    this.immutable = !!(opt && opt.immutable)
    this.base = base
    this.code = CODES_BY_NAME[base]
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

    // these may be set by parent
    this.parent = null
    this.parent_ctx = null      // context within parent - index for arrays and multi-type, field (key) for objects

    if (opt.custom_props) {
        var cust = this.cust = {}
        // transfer prop values to custom settings
        Object.keys(opt.custom_props).forEach(function (k) {
            k[0] === '$' || err('custom properties should have $ prefix')
            var kplain = k.substring(1) // remove '$'
            !PROPS_BY_ALL_NAMES[kplain] || err('custom property cannot shadow reserved property: ' + k)
            if (props[kplain] != null) {
                cust[kplain] = props[kplain]
            }
        })
    }
}
Type.prototype = {
    constructor: Type,
    toString: function () {
        if (this.name) { return this.name }
        return this.json()
    },
    json: function (opt) {
        opt = opt || {}
        return JSON.stringify(this.to_obj(opt.name_depth), null, opt.indent)
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
        if (this.cust) {
            var cust = this.cust
            Object.keys(cust).forEach(function (k) {
                ret['$' + k] = cust[k]
            })
        }
        return ret
    },
    _to_obj: function (opt, depth) {
        return (this.name && depth >= opt.name_depth ? this.name : this._basic_obj())
    },
    // return the cananoical form of object up to a given opt.name_depth
    to_obj: function (opt) {
        opt = assign({name_depth: 1}, opt)
        return this._to_obj(opt, 0)
    },
    // return a path for humans - a path which:
    //    1. has the same structure as as the data it represents (by flattening multi types into their parent context)
    //    2. includes type information with array type indexes so they are more quickly understood
    path: function () {
        var path = []
        var c = this
        while (c && c.parent) {
            var pstr
            if (c.parent.base === 'mul') {
                if (c.parent.mul.length === 1) {
                    // multi type of one - skip completely
                    c = c.parent
                    continue
                }
                // put type with parent_ctx
                pstr = (c.parent.parent ? c.parent.parent_ctx : '') + '{' + c.base + '}'
                c = c.parent.parent
            } else if (c.parent.base === 'arr') {
                pstr = c.parent_ctx + '{' + c.base + '}'
                c = c.parent
            } else {
                pstr = c.parent_ctx
                c = c.parent
            }
            path.push(pstr)
        }
        return path.reverse().join('/')
    }
}

// Any
function AnyType (props, opt) {
    Type.call(this, '*', props, opt)
}
AnyType.prototype = extend(Type.prototype, {
    constructor: AnyType,
})

// Array
function ArrType (props, opt) {
    Type.call(this, 'arr', props, opt)

    this.arr = []
    this.link_children = !!(opt && opt.link_children)

    if (props.arr) {
        var self = this
        props.arr.forEach(function (t) { self.add_type(t) })
    }
}

ArrType.prototype = extend(Type.prototype, {
    constructor: ArrType,
    add_type: function (t) {
        var i = this.arr.length
        this.arr[i] = t
        if (this.link_children) {
            t.parent = this
            t.parent_ctx = i
        }
        this.is_generic = (i === 0 && this.arr[0].name === '*')
    },

    vtype: function (i) {
        return this.arr[i % this.arr.length]
    },

    _to_obj: function (opt, depth) {
        if (this.name && depth >= opt.name_depth) {
            // the base array instance is given a familiar object look '[]' - which is fine because
            // empty array types are checked/blocked.  created arrays with same any-pattern are returned as ['*']
            return this.name === 'arr' ? [] : this.name     // 'arr' is the base-type
        } else {
            var ret = Type.prototype._basic_obj.call(this)
            delete ret.$base
            var arrtypes = this.arr.map(function (t) {
                return (typeof t === 'string') ? t : t._to_obj(opt, depth + 1)  // allow string references
            })
            if (Object.keys(ret).length === 0) {
                // a vanilla array with $base: 'arr', $arr: [...]
                return arrtypes
            } else {
                ret.$arr = arrtypes
                return ret
            }
        }
    },
})

// Blob
function BlbType (props, opt) {
    Type.call(this, 'blb', props, opt)
}
BlbType.prototype = extend(Type.prototype, {
    constructor: BlbType,
})

// Boolean
function BooType (props, opt) {
    Type.call(this, 'boo', props, opt)
}
BooType.prototype = extend(Type.prototype, {
    constructor: BooType,
})

// Byte
function BytType (props, opt) {
    Type.call(this, 'byt', props, opt)
}
BytType.prototype = extend(Type.prototype, {
    constructor: BytType,
})

// Decimal
function DecType (props, opt) {
    Type.call(this, 'dec', props, opt)
}
DecType.prototype = extend(Type.prototype, {
    constructor: DecType,
})

// Float
function FltType (props, opt) {
    Type.call(this, 'flt', props, opt)
}
FltType.prototype = extend(Type.prototype, {
    constructor: FltType,
})

// Multi Type
//
// Represents any of the types in the multi-type's 'mul' property.
//
function MulType (props, opt) {
    Type.call(this, 'mul', props, opt)
    this.link_children = !!(opt && opt.link_children)

    this.mul = []
    if (props.mul) {
        var self = this
        props.mul.forEach(function (t) { self.add_type(t) })
    }
    this._byname = null
}
MulType.prototype = extend(Type.prototype, {
    constructor: MulType,
    _to_obj: function (opt, depth) {
        if (this.mul.length === 1) {
            var t = this.mul[0]
            // skip this trivial multi-type without increasing depth
            return typeof t === 'string' ? t : t._to_obj(opt, depth)       // allow string references
        }
        if (this.name && depth >= opt.name_depth) {
            return this.name
        }
        var ret = Type.prototype._basic_obj.call(this)
        delete ret.$base
        ret.$mul = this.mul.map(function (t) {
            return (typeof t === 'string') ? t : t._to_obj(opt, depth + 1)     // allow string references
        })
        return ret
    },
    get byname() {
        if (!this._byname) {
            this._byname = this.mul.reduce(function (m,t) {
                m[t.name || t.base] = t; return m },
                {}
            )
        }
        return this._byname
    },
    add_type: function (t) {
        if (this.link_children) {
            t.parent = this
            t.parent_ctx = this.mul.length
        }
        this.mul.push(t)
        this._byname = null
    }
})

// Integer
function IntType (props, opt) {
    Type.call(this, 'int', props, opt)
}
IntType.prototype = extend(Type.prototype, {
    constructor: IntType,
})

// Number
function NumType (props, opt) {
    Type.call(this, 'num', props, opt)
}
NumType.prototype = extend(Type.prototype, {
    constructor: NumType,
})

// handling two-levels of escaping is tricky with regex.  this unescape of caret sequences is simpler than
// my attempts at pure/simple regex.  it tracks
// wild-card escapes in a separate wild_lit array for later processing (to interpret as literal '*' instead of match-all).
function unesc_caret(s) {
    var wild_lit = []
    var ns = ''
    var i = 0
    var last = 0
    while (i < s.length) {
        if (s[i] === '^') {
            i+1 < s.length || err('dangling escape ^')
            ns += s.substring(last, i)
            last = i+1                                      // includes escaped character ^^ -> ^, ^* -> *, ^x -> x...
            if (s[i+1] === '*') {
                wild_lit[ns.length] = 1
            }
            i += 2
        } else {
            i ++
        }
    }
    ns += s.substring(last)
    return { s: ns, wild_lit: wild_lit }
}

function escape_wildcards(s) {
    var info = unesc_caret(s)

    var bslash_escape = function (c, off) {
        if (c === '*' && !info.wild_lit[off]) {
            return '.*'
        } else {
            return '\\' + c     // just escape it
        }
    }
    var ns = info.s.replace(/[-[\]{}()+?.,\\$|*^#\s]/g, bslash_escape)

    return ns
}

// return true if string s has character c and is not preceded by an odd number of consecutive escapes e)
function has_char (s, c, e) {
    var i = 0
    while ((i = s.indexOf(c, i)) !== -1) {
        for (var n = 1; s[i-n] === e; n++) {}  // n = preceeding escape count (+1)
        if (n % 2) {
            return true
        }
        i++
    }
    return false
}

// Object - like record, but has one or more pattern-fields (pfields)
// opt
//      immutable: create lazy fields up front to prepare for Object.freeze()
//      ignore_expr: add only literal fields.  ignore expressions (containing '*') - used to create
//              types for exploring values.  allowing this arg in create helps keep with add-only philosophy
//              (instead of deleting pfields and match_all)
function ObjType (props, opt) {
    Type.call(this, 'obj', props, opt)

    this.sfields = null         // vanilla string fields
    this.pfields = null         // pattern match fields
    this.match_all = null       // the special '*' match-everything fields
    this._fields = null         // lazy cache of all fields kept in order of sfields, pfields, then match_all - for efficient public view of all fields
    this.wild_regex = null      // cache of regular expressions (lazy-create from wild-card field names)
    this.link_children = !!(opt && opt.link_children)

    var self = this
    if (props.to_obj) {
        Object.keys(props.to_obj).forEach(function (k) { self.add_field(k, props.to_obj[k], opt) })
    }
    if (this.immutable) {
        this.fields     // create object fields before we freeze
    }
}
ObjType.prototype = extend(Type.prototype, {
    constructor: ObjType,
    fieldtyp: function (n) {
        if (this.sfields && this.sfields[n] ) {
            return this.sfields[n]
        }

        if (this.pfields) {
            var pf_keys = Object.keys(this.pfields)
            for (var i=0; i<pf_keys.length; i++) {
                var k = pf_keys[i]
                var re = this.wild_regex[k]
                if (!re) {
                    re = this.wild_regex[k] = new RegExp('^' + escape_wildcards(k) + '$')
                }
                if (re.test(n)) {
                    return this.pfields[k]
                }
            }
        }

        return this.match_all || null
    },
    add_field: function (n_or_pat, type) {
        if (n_or_pat === '*') {
            this.match_all = type
        } else if (has_char(n_or_pat, '*', '^')) {
            if (!this.pfields) {
                this.pfields = {}
                this.wild_regex = {}
            }
            this.pfields[n_or_pat] = type
        } else {
            if (!this.sfields) { this.sfields = {} }
            var nk = unesc_caret(n_or_pat).s        // no wild cards to worry about
            this.sfields[nk] = type
        }

        if (this.link_children) {
            type.parent = this
            type.parent_ctx = n_or_pat
        }

        // generic means has *no* key specifications { '*': 'some-type' }
        this.is_generic = !this.sfields && !this.pfields

        // generic_any means has no key or type specifications at all { '*':'*' }
        this.is_generic_any = this.is_generic && (this.match_all && this.match_all.name === '*')
        this._fields = null         // reset
    },
    // return all fields in order of sfields, pfields, then match_all
    get fields() {
        if (this._fields == null) {
            var ret = {}
            if (this.sfields) { qbobj.map(this.sfields, null, null, { init: ret }) }
            if (this.pfields) { qbobj.map(this.pfields, null, null, { init: ret }) }
            if (this.match_all) { ret['*'] = this.match_all }
            this._fields = ret
        }
        return this._fields
    },
    _to_obj: function (opt, depth) {
        if (this.name && depth >= opt.name_depth) {
            // the base object instance is given a familiar object look '{}' - which is fine because
            // fieldless objects are checked/blocked.  created objects with same any-pattern are returned as {'*':'*'}
            return this.name === 'obj' ? {} : this.name
        }
        var ret = Type.prototype._basic_obj.call(this)
        delete ret.$base                                    // default is 'obj'
        return qbobj.map(this.fields, null, function (k, v) { return typeof v === 'string' ? v : v._to_obj(opt, depth + 1) }, {init: ret})
    },
})

// String
function StrType (props, opt) {
    Type.call(this, 'str', props, opt)
}
StrType.prototype = extend(Type.prototype, {
    constructor: StrType,
})

// Type (Type)
function TypType (props, opt) {
    Type.call(this, 'typ', props, opt)
}
TypType.prototype = extend(Type.prototype, {
    constructor: TypType,
})

// Null
function NulType (props, opt) {
    Type.call(this, 'nul', props, opt)
}
NulType.prototype = extend(Type.prototype, {
    constructor: NulType,
})

// Return immutable instances of all the stand-alone base types using match_all's for obj {*:*} and arr [*].
// multi-type 'mul' is special in that without a type list it matches nothing, but we allow creation to
// complete the set of base type names and descriptions.
function create_immutable_types () {
    var any = _create('*', type_props('*'), {immutable: true})
    var ret = [any]
    ;['arr', 'blb', 'boo', 'byt', 'dec', 'flt', 'int', 'mul', 'nul', 'num', 'obj', 'str', 'typ'].forEach(function (n) {
        ret.push(_create(n, type_props(n, any), {immutable: true}))
    })
    ret.sort(function (a,b) { return a.name > b.name ? 1 : -1 })       // names never equal
    Object.freeze(ret)
    return ret
}

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

function _create (base, props, opt) {
    opt = opt || {}
    var ctor = CONSTRUCTORS[base]
    var ret = new ctor(props, opt)
    if (opt.immutable) {
        Object.freeze(ret)
    }
    return ret
}

// public create (accepts all names for base types, disallows creation of 'nul' and 'typ' types and redefinition of base types)
//
// opt
//      link_children   if set, then objects, arrays and multi-types will add parent and parent_ctx links to
//                      added types (children).
//
//      immutable       if set, then immutable types will be returned using Object.freeze().
//
function create (props, opt) {
    var base = props.base
    if (base == null) {
        if (props.arr) { base = 'arr' }
        else if (props.mul) { base = 'mul' }
        else if (props.to_obj) { base = 'obj' }
        else { err('no base specified') }
    }
    var t = TYPES_BY_ALL_NAMES[base] || err('unknown base type: ' + base)
    // t.name has the normalized base name
    ;({nul:1, '*':1, typ:1}[t.name]) == null || err('type ' + base + ' cannot be created using properties, use lookup() instead')
    props.name !== base && props.tinyname !== base && props.fullname !== base || err('cannot redefine a base type: ' + base)
    return _create(t.name, props, opt)
}

function err (msg) { throw Error(msg) }

// lookup a base type.  return the shared immutible instance or create a new copy using 'create_opt'.
// return null if not defined.
//
// opt
//      create_opt      same options supported by create (e.g. {link_children:true}).  if set
//                      then a new mutable instance is returned using create(<base_props>, opt).
//                      if not set, then the immutable shared base instance is returned
//
function lookup (base_name, opt) {
    var base_type = TYPES_BY_ALL_NAMES[base_name]
    if (base_type == null) {
        return null
    }
    if (opt && opt.create_opt) {
        // return a base with all the same settings as the lookup instance (such as object {'*':'*'}) , but is a copy (for building graphs)
        var any = (base_type.name === 'obj' || base_type.name === 'arr') ? _create('*', type_props('*'), opt.create_opt) : null
        return _create(base_type.name, type_props(base_type.name, any), opt.create_opt)
    } else {
        // return immutable shared instance
        base_type.name !== 'mul' || err('there is no generalized multi-type instance, it has to be created')
        return base_type
    }
}

// *** FINISH PROTOTYPE SETUP ***

// Create a single set of base types

var TYPES = create_immutable_types()
var TYPES_BY_ALL_NAMES = TYPES.reduce(function (m,t) { m[t.name] = m[t.tinyname] = m[t.fullname] = t; return m}, {})
var TYPES_BY_CODE = TYPES.reduce(function (a,t) { a[t.code] = t; return a}, [])
var PROPS_BY_ALL_NAMES = PROPS.reduce(function (m,p) { m[p.name] = m[p.tinyname] = m[p.fullname] = p; return m}, {})

module.exports = {
    create: create,
    lookup: lookup,
    props: function () { return PROPS },
    props_by_all_names: PROPS_BY_ALL_NAMES,
    types: function () { return TYPES },
    codes_by_name: function () { return CODES_BY_NAME },
    types_by_all_names: function () { return TYPES_BY_ALL_NAMES },
    codes_by_all_names: function () { return TYPES.reduce(function (m,t) { m[t.name] = m[t.tinyname] = m[t.fullname] = t.code; return m}, {}) },
    types_by_code: function () { return TYPES_BY_CODE },

    // exposed for testing only
    _unesc_caret: unesc_caret,
    _escape_wildcards: escape_wildcards,
    _has_char: has_char,
}
