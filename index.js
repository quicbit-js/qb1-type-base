var extend = require('qb-extend-flat')
var assign = require('qb-assign')
var qbstips = require('qb1-type-stips')
var range = require('qb-range')

// initialize a type with name(s) and properties (both embedded, and extra)
// Embedded properties are implied by the type name identity and cannot be expanded, only further
// constrained (i.e. using prop.and(), not prop.or()).
// IOW an unt64 with a restriction "10 or greater" can be represented as unsigned integer 'unt64(10..)' but adding
// a restriction (..-10) "-10 or less to an unt64 creates the empty set.
//
//  opt: {
//      name:           required.  brief name like 'int64'.  used by default.
//      shortname:      (optional) very short name for the most common types like 'i64'
//      fullname:       (optional) full name like 'integer64'
//      emb:            StipSet of stips that are implied by the type name
//      xtr:            StipSet of 'extra' (non-embedded) stips (these are printed in the canonical name)
//      all:            StipSet of all stips for the type
//  }
//
// Design note: we could store the canonical string form of embedded and xtra properties rather than keeping full
// objects (to be light weight when simply comparing and printing).  Or we could keep emb and xtra as arrays of
// stip keys (which are in all).
function init(t, opt) {
    t.name = opt.name || err('missing name')    // make name a "normal" enumerable property (for debugging)
    t.fullname = opt.fullname
    t.shortname = opt.shortname
    t.emb = opt.emb || err('missing stipulations (emb)')
    if (opt.xtr) {
        t.xtr = opt.xtr.copy()
        t.all = opt.emb.and(opt.xtr)
    } else {
        t.xtr = qbstips(opt.emb.stip_fns)
        t.all = opt.emb.copy()
    }
}

function assign_some(dst, src, ignore) {
    Object.keys(src).forEach(function (k) { if(!~ignore.indexOf(k)) { dst[k] = src[k] }})
}

// create options for a named or anonymous subtype
function subtype_opt(t, opt) {
    var ret = {}
    var namesrc
    if (opt.name && opt.name !== t.name) {
        // named subtype - ensure unique names and embed all properties
        opt.fullname !== t.fullname || err(opt.fullname + ' is already defined for ' + t.name)
        opt.shortname !== t.shortname || err(opt.shortname + ' is already defined for ' + t.name)
        namesrc = opt
        ret.emb = t.all.and(opt.emb || {})
        ret.xtr = qbstips(t.all.stip_fns).put(opt.xtr || {})
    } else {
        // define anonymous subtype same name with separate xtra props
        namesrc = t
        ret.emb = t.emb.copy()
        ret.xtr = t.xtr.and(opt.xtr)
    }
    ret.name = namesrc.name
    ret.shortname = namesrc.shortname
    ret.fullname = namesrc.fullname
    return ret
}

// common functions for all types
function Type(opt) { init(this, opt) }
Type.prototype = {
    _str: function (opt) {
        var xopt = {
            parens: opt.xtr_paren || ['(', ')'],
            show: opt.xtr_show || 'vals'
        }
        return (this[opt.name] || this.name) + (this.xtr.length ? this.xtr.toString(xopt) : '')
    },
    check: function (v) {
        this.all.check(v)
    },
    // opt holds property settings for the new type.  if name is set, properties are combined and embedded with the name of the type,
    // if not, properties are combined with xtra properties and will show in the cannonical name (toString())
    subtype: function (opt) {
        return new (this.constructor)(subtype_opt(this, opt || {}))
    },
    info: function () {
        var ret = {
            names: '[' + [this.toString({name:'fullname'}), this.toString(), this.toString({name:'shortname'})].join(', ') + ']',
        }
        if (this.emb.length) { ret.emb = this.emb.toString() }
        if (this.xtr.length) { ret.xtr = this.xtr.toString() }
        return ret
    },
    toString: function (opt) { return this._str(opt || {}) },
}

// example of prototype-type
// function Int(opt) {
//     var nopt = assign({}, opt)
//     nopt.emb = qbstips({range: range}, {range: '1..5'})
//     nopt.emb.put('range', '2..4', 'and')
//     init(this, nopt)
// }
// Int.prototype = extend(Type.prototype, { constructor: Int })
//

function ArrayType(opt) {
    init(this, opt)
    this.vtype = opt.vtype || ANY
}
ArrayType.prototype = extend( Type.prototype, {
    subtype: function (opt) {
        opt = subtype_opt(this, opt)
        // set, combine or default the item-type
        opt.vtype = opt.vtype || (opt.vtype_opt && this.vtype.subtype(opt.vtype_opt)) || this.vtype
        return new ArrayType(opt)
    },
    // [ string('[A-Z][a-z]+') ]($name: contact_list, $length: 1..30)
    // { "$typ": "arr", "$name": "contact_list", "vt": "str32" }
    // { "$typ": "str", "$name": "person_name", "$stip": "/[a-z]/" }
    // { "$typ": "obj", "$name": "result", "rating": "flt", "degree": "int", "user": "person_name" }
    // { "$typ": "result" } === "result"
    // contact_list
    // { $name: result, output: float, label: string }
    _str: function (opt) {
        var vtype = this.vtype.toString(opt)
        var args = xtr.as_args(opt)
        return '[' + [].concat(vtype, args).join(',') + ']'
    },
})

function ObjectType(vt, opt) { this.vtype = vtype || ANY }
ObjectType.prototype = {
    name: 'obj',
    new: function (vt) { return new ObjectType(vtype) },
    str: function (opt) { return '{' + this.vtype.str(opt || {}) + '}' },
    toString: function (opt) { return this.str(opt) },
}

function MultiType(types) {
    types && types.length || err('multi type must contain at least one type')
    this.types = types
}
MultiType.prototype = {
    name: 'mul',
    new: function (types) { return new MultiType(types) },
    str: function (opt) { return this.types.join('|') },
    toString: function (opt) { return this.str(opt) },
}

// Design notes:
// typeset and multi-type are similar.  they both represent a set of types such as:
//      string|integer|null
//
// typeset                                      multi-type
//
// types with embedded props                    types with embedded and xtra props
// creates types, subtypes and multi-type       merges with other types to become new subtype (may have to be optimized)
//                                              validates values
//
function TypeSet (types) {
    this.by_name = types.reduce(function (m, t) {
        var n = t.name || err('unnamed type: ' + t)
        !m[n] || err(n + ' is already in the set')
        m[n] = t
        return m
    }, {})
    this.names = Object.keys(this.by_name).sort()
    this.name = this.names.join('|')

}
TypeSet.prototype = {
    new: function(opt) {
        var t = this.by_name[name] || err('no such type: ' + name)
        return t.clone()
    },
    toString: function() {
        return '{' + this.names().join('|') + '}'
    },
}

function err(msg) { throw Error(msg) }

// var BASE_TYPES = [
//     // name,        nam,    char    // range,        expression
//     // [ 'blob',       'blb',  'X' ],  // null,          '*' ],
//     [ 'boolean',    'boo',  'b' ],  // '0..1',        'true|false|tru|fal|t|f' ],
//     // [ 'byte',       'byt',  'x' ],  // '0..255',      '[0-9a-fA-F]*' ],
//     // [ 'decimal',    'dec',  'd' ],  // '-inf~~inf',   '[0-9]+',
//     // [ 'float',      'flt',  'f' ],  // '-inf~~inf',    ],
//     // [ 'integer',    'int',  'i' ],  // '-inf~~inf' ],
//     [ 'number',     'num',  'n' ],
//     // [ 'rational',   'rat',  'r' ],
//     [ 'string',     'str',  's' ],
//     // [ 'type',       'typ',  't' ],
//     // [ 'unteger',    'unt',  'u' ],
//
//     // tokens (value = name)
//     [ 'null',       'nul',  'N' ],
//     [ 'false',      'fal',  'F' ],
//     [ 'true',       'tru',  'T' ],
// ].map(function (r) { return new Type(r[0], r[1], r[2])})  // no stipulations
// var any = new Type('any', '*', '*')      // represents every type in the set
// BASE_TYPES.push(any)
// BASE_TYPES.push(new ArrayType(any))
// BASE_TYPES.push(new ObjectType(any))
// BASE_TYPES.push(new MultiType())

// Create a typeset from an array or argument list
//
// Attempting to specify the same type twice will throw error.
// The 'any' (*) type and general 'multiple' (mul) types are always understood by typeset and are ignored if passed
// as arguments.  To control use of these special types , use parse, write, and/or merge options.
//
function typeset() {
    // ignore any '*' and multiple 'mul' types - add these automatically to the first and last positions
    var type_args = vargs(arguments)
    type_args = type_args.filter(function (n) { return n !== '*' && n !== 'mul' }).sort()
    type_args.unshift('*')
    type_args.push('mul')
    var types = type_args.map(function (t) { return typeof t === 'string' ? BASE.new(t).clone() : t })
    return types.reduce(function (tset, t) { tset.put(t); return tset }, new TypeSet())

    return new TypeSet(types, def_by_flag, def_by_name)
}


// given variable arguments, no agruments, or a single array argument, return an array of values
function vargs (args) {
    switch (args.length) {
        case 0: return []
        case 1: return Array.isArray(args[0]) ? args[0] : [args[0]]
        default: return Array.prototype.slice.call(args)
    }
}

// var TYPESETS = {
//     json: function() { return typeset('num', 'str', 'arr', 'obj', 'boo', 'nul') },
//     qb1: function() { return typeset( )} // todo: return all qb1 type names
// }
//

// given an array or arguments object containing types, return a single type representing the combination, flattening
// 1 level (arrays and multiple types).
//
// args_to_type()               ->  null
// args_to_type( null )         ->  null
// args_to_type( [] )           ->  null
// args_to_type( int )          ->  int
// args_to_type( int|str )      ->  int|str (returns SAME multi-type)
// args_to_type( int, str )     ->  int|str
// args_to_type( [ int, str ] ) ->  int|str
//
// convert multiple args or single array arg to a type, zero args to null, and single non-array as-is
// function flatten1 (args, allow_single) {
//     if (args.length === 0) { return null }
//     if (args.length > 1) { return new Mul.constructor(Array.prototype.slice.apply(args).sort()) }
//     var v = args[0]
//     if (Array.isArray(v)) {
//         if (v.length > 1) { return new Mul.constructor(v.sort()) }
//         v = v[0]
//     }
//     v == null || allow_single || err('expected more than one argument')
//     return v
// }

function create(fullname, name, shortname, emb) {
    return function() {
        var emb_fns = {}
        var emb_stips = {}
        Object.keys(emb).forEach(function (k) { emb_fns[k] = emb[k][0]; emb_stips[k] = emb[k][1] })
        return new Type({
            name: name,
            fullname: fullname,
            shortname: shortname,
            emb: qbstips(emb_fns, emb_stips),
        })
    }
}

module.exports = {
    // int: create(Int, 'integer', 'int', 'i')
    int: create('integer', 'int', 'i', { range: [range, '~~'] }),
    unt: create('unteger', 'unt', 'u', { range: [range, '0..~'] }),
    // str: create('string', 'str', 's', { regex: [regex, '*'] }),
    flt: create('float', 'flt', 'f', { range: [range, '~~'] } ),
    num: create('number', 'num', 'n', { range: [range, '~~'] }),
    boo: create('boolean', 'boo', 'b', { enum: []})
}

