// Software License Agreement (ISC License)
//
// Copyright (c) 2018, Matthew Voss
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


// map of all 14 basic type codes to type code name (align with qb1-type-base codes).
// verified by tests against qb1-type-base
var CODE2NAME = [
    'nul',      // 0
    'str',      // 1
    'num',      // 2
    'boo',      // 3
    'arr',      // 4
    'obj',      // 5
    'byt',      // 6
    'int',      // 7
    'dec',      // 8
    'flt',      // 9
    'blb',      // 10
    'any',      // 11
    'mul',      // 12
    'typ'       // 13
]

// FLAG: name -> hex flag (1 through E)
var FLAG = CODE2NAME.reduce(function (m, n, i) { m[n] = 1 << i; return m }, {__proto__: null})
var FLAG_NAME = CODE2NAME.reduce(function (a, n) { a[FLAG[n]] = n; return a}, [] )

var NUL = FLAG.nul
var STR = FLAG.str
var NUM = FLAG.num
var BOO = FLAG.boo
var ARR = FLAG.arr
var OBJ = FLAG.obj
var BYT = FLAG.byt
var INT = FLAG.int
var DEC = FLAG.dec
var FLT = FLAG.flt
var BLB = FLAG.blb
var ANY = FLAG.any
var MUL = FLAG.mul
var TYP = FLAG.typ

function err (msg) { throw Error(msg) }

function vtype (v) {
    if (v == null) {
        return NUL
    }
    switch (typeof v) {
        case 'number':
            if (v === ~~v) {
                return ((v & 0xFFFFFF00) === 0) ? BYT : INT
            } else {
                return FLT
            }
        case 'string':
            return STR
        case 'boolean':
            return BOO
        case 'object':
            if (v.$type) {
                return FLAG[v.$type] || OBJ
            } else if (Array.isArray(v)) {
                return ARR
            } else if (ArrayBuffer.isView(v)) {
                return BLB
            } else {
                return OBJ
            }
        default:
            err('unknown type: ' + typeof v)
    }
}

function arr_types (a, off, lim) {
    off = off || 0
    lim = lim == null ? a.length : lim
    var ret = 0
    for (var i=off; i<lim; i++) {
        ret |= vtype(a[i])
    }
    return ret
}

// convert tflag to a single type flag, for example:
//   int|flt -> flt
//   flt|num -> num
//   num|boo -> mul
function to_single (tflag) {
    if ( (tflag & NUM) || ((tflag & (FLT|DEC)) === (FLT|DEC)) ) {
        tflag |= NUM
        tflag &= ~(INT|DEC|FLT|BYT)                 // clear INT|DEC|FLT|BYT
    } else if ((tflag & (FLT|DEC)) !== 0) {         // FLT and DEC set
        tflag &= ~(INT|BYT)                         // clear INT|BYT
    } else if ((tflag & INT)) {
        tflag &= ~(BYT)                             // clear BYT
    }
    var n = 0
    // multi-type check: count types, other than null (0x1)
    for (var f = tflag >>> 1; f !== 0; f >>>= 1) {
        if (f & 0x1) { n++ }
    }
    if (n > 1) {
        tflag = MUL
    }
    if (tflag !== NUL) {
        tflag &= ~NUL
    }
    return tflag
}

function is_type_of (subname, tname) {
    if (subname != null && subname === tname) {
        return true
    }
    var sub = FLAG[subname] || err('unknown type: ' + subname)
    var t = FLAG[tname] || err('unknown type: ' + tname)
    switch (t) {
        // all stats handle nul, so nul type is compatible with all
        case NUM: return (sub & (INT|DEC|FLT|BYT|NUL)) !== 0
        case FLT: return (sub & (INT|BYT|NUL)) !== 0
        case DEC: return (sub & (INT|BYT|NUL)) !== 0
        case INT: return (sub & (BYT|NUL)) !== 0

        case ANY:
        case MUL:
            return true

        default: return false
    }
}

// return all-flags string (for debugging)
function flag2str (f) {
    var ta = []
    for (var i = 0x1; i < 0xFFFF; i <<= 1) {
        if (f & i) {
            ta.push(FLAG_NAME[i])
        }
    }
    return ta.join('|')
}

function str2flag (s) {
    var ret = 0
    s.split('|').forEach(function (tname) {
        ret |= FLAG[tname] || err('unknown type: ' + tname)
    })
    return ret
}

module.exports = {
    FLAG: FLAG,
    FLAG_NAME: FLAG_NAME,
    CODE2NAME: CODE2NAME,
    vtype: vtype,
    arr_types: arr_types,
    flag2str: flag2str,
    str2flag: str2flag,
    to_single: to_single,
    is_type_of: is_type_of,
}
