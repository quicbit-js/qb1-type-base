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
var qb_tflags = require('./qb-type-flags')

var TYPE_DATA_BY_NAME = {
// name
    //   tinyname  fullname  code   description
    any: [ '*',   'any',     11,    'Represents any value or type.  For example, [*] is an array of anything' ],
    arr: [ 'a',   'array',   4,     'Array of values matching types in a *cycle* (also see multi type).  [str] is an array of strings while [str, int] is an alternating array of [str, int, str, int, ...]' ],
    blb: [ 'X',   'blob',    10,    'A sequence of bytes' ],
    boo: [ 'b',   'boolean', 3,     'A true or false value.  Also can be a 0 or non-zero byte' ],
    byt: [ 'x',   'byte',    6,     'An integer in range 0..255'   ],
    dec: [ 'd',   'decimal', 8,     'An unbounded base-10 number (range ~~)' ],
    flt: [ 'f',   'float',   9,     'An unbounded base-2 number (range ~~)' ],
    int: [ 'i',   'integer', 7,     'An unbounded integer (range ..)' ],
    mul: [ 'm',   'multi',   12,    'A set of possible types in the form t1|t2|t3, (also see array cycling types)'   ],
    nul: [ 'N',   'null',    0,     'A null value which represents "not-set" for most situations' ],
    num: [ 'n',   'number',  2,     'Any rational number including decimals, floats, and integers' ],
    obj: [ 'o',   'object',  5,     'A record-like object with fixed field names, or flexible fields (using *-expressions)'  ],
    str: [ 's',   'string',  1,     'A string of unicode characters (code points in range 0..1114111)'  ],   // (1-3 chained bytes, 7-21 bits)
    typ: [ 't',   'type',    13,    'The type-type. integer, array, object, boolean, etc, all have this as their type.'  ],
}

var CONSTRUCTORS = {
    any: AnyType,
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

var TCODE = qbobj.map(TYPE_DATA_BY_NAME,  null, function (k, v) { return v[2] })
var NAMES_BY_CODE = Object.keys(TYPE_DATA_BY_NAME).reduce(function (a, n) { a[TYPE_DATA_BY_NAME[n][2]] = n; return a }, [])

// Type property information including whether they are user-facing and how they are merged.

// type inherit flags (inheriting properties from a base type):
//
//      YES_EQL   - inherited. if both are set they must be equal
//      NO_NEQ    - not inherited.  if both are set they must not be equal
//      NO        - not inherited.  value is ignored.
//      YES_MRG   - inherit/merge.  result will be a subset of the container and child value (intersection of constraints)
var PROPS = [
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

var PROPS_BY_ALL_NAMES = PROPS.reduce(function (m,p) { m[p.name] = m[p.tinyname] = m[p.fullname] = p; return m}, {})

function type_props (name, any) {
    var r = TYPE_DATA_BY_NAME[name]
    var ret = { name: name, tinyname: r[0], fullname: r[1], desc: r[3] } // r[2] code is included in they object
    switch (name) {
        case 'obj':
            ret = assign(ret, {obj: {'*': any}})
            break
        case 'arr':
            ret = assign(ret, {arr: [any]})
    }
    return ret
}

// return the high-level json-like code (nul, str, num, boo, blb, arr, or obj) for a given code
function jcode (code) {
    switch (code) {
        case TCODE.byt: case TCODE.int: case TCODE.flt: case TCODE.dec:
            return TCODE.num
        case TCODE.any: case TCODE.mul: case TCODE.typ:
            return TCODE.obj
        default:
            return code
    }
}

var TYPE_ID = 0
function Type (base, props, opt) {
    this.id = ++TYPE_ID
    this.immutable = !!(opt && opt.immutable)
    this.base = base
    this.code = TCODE[base]
    this.jcode = jcode(this.code)
    this.name = props.name || null
    this.desc = props.desc || null
    this._depth = null
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
    // "complex" means composed of different types. e.g. blb and str are NOT complex. is true for arr, mul, obj, any, and typ.
    complex: false,
    // a type that can hold many values.  obj and arr are containers, as is any.  mul is a container iff it allows containers.
    container: false,
    type: 'type',
    get depth () {
        var d = 0
        var p = this.parent
        while (p) {
            if (p.code !== TCODE.mul) {
                d++
            }
            p = p.parent
        }
        return d
    },
    toString: function () {
        if (this.name) { return this.name }
        return this.json()
    },
    json: function (opt) {
        opt = opt || {}
        return JSON.stringify(this.to_obj(opt.name_depth), null, opt.indent)
    },
    _basic_to_obj: function () {
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
        return (this.name && depth >= opt.name_depth ? this.name : this._basic_to_obj())
    },
    // return the cananoical form of object up to a given opt.name_depth
    to_obj: function (opt) {
        opt = assign({name_depth: 0}, opt)
        return this._to_obj(opt, 0)
    },
    toJSON: function () {
        return this.to_obj()
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
    },
}

// Any
function AnyType (props, opt) {
    Type.call(this, 'any', props, opt)
}
AnyType.prototype = extend(Type.prototype, {
    constructor: AnyType,
    complex: true,
    container: true,
    checkv: function (v, null_ok, quiet) { return typeof v !== 'function' || (quiet ? false : err('not a value: ' + v))},
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
    complex: true,                                      // represents a variety of types
    container: true,                                    // holds multiple instances
    checkv: function (v, null_ok, quiet) {
        return (null_ok && v == null) || Array.isArray(v) || ArrayBuffer.isView(v)
            || (quiet ? false : err('not an array: ' + v))
    },
    add_type: function (t) {
        var i = this.arr.length
        this.arr[i] = t
        if (this.link_children) {
            t.parent = this
            t.parent_ctx = i
        }
        this.is_generic = (i === 0 && this.arr[0].name === 'any')
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
            var ret = Type.prototype._basic_to_obj.call(this)
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
    checkv: function (v, null_ok, quiet) {
        if (v == null) { return null_ok || (quiet ? false : err('not a blob: ' + v)) }
        switch (typeof v) {
            case 'string':
                return v[0] === '0' && v[1] === 'x' || (quiet ? false : err('not a blob: ' + v))
            case 'object':
                if (Array.isArray(v) || ArrayBuffer.isView(v)) {
                    return true
                }
                var t = v.$t || v.$typ || v.$type || (quiet ? false : err('not a blob: ' + v))
                return { X: true, blb: true, blob: true }[t] || (quiet ? false : err('not a blob: ' + v))
            default:
                return (quiet ? false : err('not a blob: ' + v))
        }
    }
})

// Boolean
function BooType (props, opt) {
    Type.call(this, 'boo', props, opt)
}
BooType.prototype = extend(Type.prototype, {
    constructor: BooType,
    checkv: function (v, null_ok, quiet) {
        if (null_ok && v == null) { return true }
        switch (typeof v) {
            case 'number': case 'boolean': return true
            default: return (quiet ? false : err('not a boolean: ' + v))
        }
    }
})

// Byte
function BytType (props, opt) {
    Type.call(this, 'byt', props, opt)
}
BytType.prototype = extend(Type.prototype, {
    constructor: BytType,
    checkv: function (v, null_ok, quiet) {
        if (v == null) { return null_ok }
        return (v >= 0 && v <= 255) || (quiet ? false : err('not a byte: ' + v)) }
})

// Decimal
function DecType (props, opt) {
    Type.call(this, 'dec', props, opt)
}
DecType.prototype = extend(Type.prototype, {
    constructor: DecType,
    checkv: function (v, null_ok, quiet) { return (null_ok && v == null) || typeof v === 'number' || (quiet ? false : err('not a decimal: ' + v))}
})

// Float
function FltType (props, opt) {
    Type.call(this, 'flt', props, opt)
}
FltType.prototype = extend(Type.prototype, {
    constructor: FltType,
    checkv: function (v, null_ok, quiet) { return (null_ok && v == null) || typeof v === 'number' || (quiet ? false : err('not a float: ' + v)) }
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
    this._by_jcode = null
}
MulType.prototype = extend(Type.prototype, {
    constructor: MulType,
    complex: true,
    checkv: function (v, null_ok, quiet) {
        if (null_ok && v == null) { return true }
        var mul = this.mul
        for (var i = 0; i < mul.length; i++) {
            if (mul[i].checkv(v, null_ok, true)) {
                return true
            }
        }
        return (quiet ? false : err('does not match multi-type: ' + v + ': ' + this.toString()))
    },
    // container iff mul contains a container
    _to_obj: function (opt, depth) {
        if (this.mul.length === 1) {
            var t = this.mul[0]
            // skip this trivial multi-type without increasing depth
            return typeof t === 'string' ? t : t._to_obj(opt, depth)       // allow string references
        }
        if (this.name && depth >= opt.name_depth) {
            return this.name
        }
        var ret = Type.prototype._basic_to_obj.call(this)
        delete ret.$base
        ret.$mul = this.mul.map(function (t) {
            return (typeof t === 'string') ? t : t._to_obj(opt, depth + 1)     // allow string references
        })
        return ret
    },
    // return types indexed by high-level (json-like) code (nul, str, num, boo, blb, arr, or obj)
    get by_jcode () {
        if (!this._by_jcode) {
            this._by_jcode = this.mul.reduce(function (a, t) {
                if (!a[t.jcode]) { a[t.jcode] = [t] } else { a[t.jcode].push(t) }
                return a
            }, [])
        }
        return this._by_jcode
    },
    get byname () {
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
        if (t.container) { this.container = true }
        this._byname = this._by_jcode = null
    }
})

var MAX_INT = Math.pow(2, 53) - 1
var MIN_INT = -MAX_INT - 1
// Integer
function IntType (props, opt) {
    Type.call(this, 'int', props, opt)
}
IntType.prototype = extend(Type.prototype, {
    constructor: IntType,
    checkv: function (v, null_ok, quiet) {
        return (null_ok && v == null) || typeof v === 'number' && v > MIN_INT && v < MAX_INT || (quiet ? false : err('not an integer: ' + v))
    },
})

// Number
function NumType (props, opt) {
    Type.call(this, 'num', props, opt)
}
NumType.prototype = extend(Type.prototype, {
    constructor: NumType,
    checkv: function (v, null_ok, quiet) {
        return (null_ok && v == null) || typeof v === 'number' || (quiet ? false : err('not a number: ' + v))
    }
})

// Handling two-levels of escaping is tricky with regex.  This unescape of caret sequences is simpler than
// my attempts at pure/simple regex.  It returns a new string 'ns' with double-escapes reduced to single and
// the indexes into 'ns' that are to be interpreted as literal asterix (not wild).
function unesc_caret(s) {
    var literal_asterix = []
    var ns = ''
    var i = 0
    var last = 0
    while (i < s.length) {
        if (s[i] === '^') {
            i+1 < s.length || err('dangling escape ^')
            ns += s.substring(last, i)
            last = i+1                                      // includes escaped character ^^ -> ^, ^* -> *, ^x -> x...
            if (s[i+1] === '*') {
                literal_asterix[ns.length] = 1
            }
            i += 2
        } else {
            i ++
        }
    }
    ns += s.substring(last)
    return { s: ns, literal_asterix: literal_asterix }
}

function escape_wildcards(s) {
    var info = unesc_caret(s)

    var bslash_escape = function (c, off) {
        if (c === '*' && !info.literal_asterix[off]) {
            return '.*'
        } else {
            return '\\' + c     // just escape it
        }
    }
    return info.s.replace(/[-[\]{}()+?.,\\$|*^#\s]/g, bslash_escape)
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

function field_type (n) {
    if (this.sfields && this.sfields[n] ) {
        return this.sfields[n]
    }
    var fn = this.field_name(n)
    return fn === '*' ? this.match_all : (this.pfields && this.pfields[fn] || null)
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
    this.match_all = null       // the special '*' match-everything field
    this._fields = null         // lazy cache of all fields kept in order of sfields, pfields, then match_all - for efficient public view of all fields
    this.wild_regex = null      // cache of regular expressions (lazy-create from wild-card field names)
    this.link_children = !!(opt && opt.link_children)

    var self = this
    if (props.obj) {
        Object.keys(props.obj).forEach(function (k) { self.add_field(k, props.obj[k], opt) })
    }
    if (this.immutable) {
        this.fields     // create object fields before we freeze
    }
}
ObjType.prototype = extend(Type.prototype, {
    constructor: ObjType,
    complex: true,
    container: true,
    checkv: function (v, null_ok, quiet) {
        if (v == null) { return null_ok }
        return (typeof v === 'object' && !Array.isArray(v) && !ArrayBuffer.isView(v) ||
            (quiet ? false : err('not an object: ' + v)))
    },
    fieldtyp: field_type,        // deprecate fieldtyp
    field_type: field_type,
    // return the first-match field name
    field_name: function (n) {
        if (this.sfields && this.sfields[n] ) {
            return n
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
                    return k
                }
            }
        }

        return this.match_all ? '*' : null
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
            if (!this.sfields) { this.sfields = {__proto__: null} }
            var nk = unesc_caret(n_or_pat).s        // no wild cards to worry about
            this.sfields[nk] = type
        }

        if (this.link_children) {
            type.parent = this
            type.parent_ctx = n_or_pat
        }

        // generic means has *no* key specifications { '*': 'some-type' }
        this.is_generic = !this.sfields && !this.pfields

        // generic_any means has no key or type specifications at all { '*':'any' }
        this.is_generic_any = this.is_generic && (this.match_all && this.match_all.name === 'any')
        this._fields = null         // reset
    },
    // return all fields in order of sfields, pfields, then match_all
    get fields() {
        if (this._fields == null) {
            var ret = {__proto__:null}
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
            // fieldless objects are checked/blocked.  created objects with same any-pattern are returned as {'*':'any'}
            return this.name === 'obj' ? {} : this.name
        }
        var ret = Type.prototype._basic_to_obj.call(this)
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
    checkv: function (v, null_ok, quiet) { return (null_ok && v == null) || typeof v === 'string' || ( quiet ? false : err('not a string: ' + v))}
})

// Type (Type)
function TypType (props, opt) {
    Type.call(this, 'typ', props, opt)
}
TypType.prototype = extend(Type.prototype, {
    constructor: TypType,
    complex: true,
    // not a container.  though complex, type represents a single value.
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
    var any = _create('any', type_props('any'), {immutable: true})
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
    var ret = assign({}, props)
    var base
    var pbase = props.base
    if (ret.arr) {
        ret.arr = ret.arr.map(function (t) { return create_from(t, opt) })
        base = 'arr'
    } else if (ret.mul) {
        ret.mul = ret.mul.map(function (t) { return create_from(t, opt) })
        base = 'mul'
    } else if (ret.obj) {
        ret.obj = qbobj.map(ret.obj, null, function (k, t) { return create_from(t, opt) })
        base = 'obj'
    } else {
        pbase != null || err('no base specified')
        var t = TYPES_BY_ALL_NAMES[pbase] || err('unknown base')     // normalize pbase and base
        base = pbase = t.name
    }
    if (pbase) {
        pbase === base || err('base mismatch: ' + base + ' and ' + pbase)
    }
    ({nul:1, 'any':1, typ:1}[base]) == null || err('type ' + base + ' cannot be created using properties, use lookup() instead')
    ret.name !== base && ret.tinyname !== base && ret.fullname !== base || err('cannot redefine a base type: ' + base)
    return _create(base, ret, opt)
}

function err (msg) {
    throw Error(msg)
}

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
        // return of the lookup instance (such as object {'*':'any'})
        var any = (base_type.name === 'obj' || base_type.name === 'arr') ? _create('any', type_props('any'), opt.create_opt) : null
        return _create(base_type.name, type_props(base_type.name, any), opt.create_opt)
    } else {
        // return immutable shared instance
        base_type.name !== 'mul' || err('there is no general multi-type.  use create instead')
        return base_type
    }
}

function create_from (v, opt) {
    opt = opt || {}
    if (v.type === 'type') { return v }
    if (typeof v === 'string') {
        return lookup(v, opt) || (opt.allow_unresolved ? v : err('no such type'))
    } else {
        return create(v, opt)
    }
}

// *** FINISH PROTOTYPE SETUP ***

// Create a single set of base types

var TYPES = create_immutable_types()
var TYPES_BY_ALL_NAMES = TYPES.reduce(function (m,t) { m[t.name] = m[t.tinyname] = m[t.fullname] = t; return m}, {})
var CODES_BY_ALL_NAMES = TYPES.reduce(function (m,t) { m[t.name] = m[t.tinyname] = m[t.fullname] = t.code; return m}, {})
var TYPES_BY_CODE = TYPES.reduce(function (a,t) { a[t.code] = t; return a}, [])

function arr_type (a, off, lim) {
    var atype = qb_tflags.arr_types(a, off, lim)
    if (atype === 0) {
        return null
    }
    return qb_tflags.FLAG_NAME[qb_tflags.to_single(atype)] || err('could not determine array type')
}

function is_type_of (subname, tname) {
    var subt = TYPES_BY_ALL_NAMES[subname]
    var t = TYPES_BY_ALL_NAMES[tname]
    return qb_tflags.is_type_of(subt && subt.name, t && t.name)
}

// return the high-level (json-like) code for a value (nul, str, num, boo, blb, arr, or obj)
function jcode_of (v) {
    if (v == null) {
        return TCODE.nul
    }
    switch (typeof v) {
        case 'string':
            return TCODE.str
        case 'number':
            return TCODE.num
        case 'object':
            if (v.$type) {
                var tc = TCODE[v.$type]
                return tc ? jcode(tc) : TCODE.obj
            } else if (Array.isArray(v)) {
                return TCODE.arr
            } else if (ArrayBuffer.isView(v)) {
                return TCODE.blb
            } else {
                return TCODE.obj
            }
        case 'boolean':
            return TCODE.boo
        default:
            err('unknown type: ' + typeof v)
    }
}

module.exports = {
    from: create_from,          // flexible create - (from properties) or lookup (of string)
    create: create,
    lookup: lookup,
    props: function () { return PROPS },
    types: function () { return TYPES },
    codes_by_name: function () { return TCODE },
    names_by_code: function () { return NAMES_BY_CODE },
    types_by_code: function () { return TYPES_BY_CODE },
    props_by_all_names: function () {return PROPS_BY_ALL_NAMES },
    types_by_all_names: function () { return TYPES_BY_ALL_NAMES },
    codes_by_all_names: function () { return CODES_BY_ALL_NAMES },

    // expose a couple functions powered by flags, but not the flags themselves (yet).  still thinking about
    // what type codes to make public other than the basic codes.
    is_type_of: is_type_of,
    arr_type: arr_type,
    jcode_of: jcode_of,

    // exposed for testing only
    _unesc_caret: unesc_caret,
    _escape_wildcards: escape_wildcards,
    _has_char: has_char,
}
