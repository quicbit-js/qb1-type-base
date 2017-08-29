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

var test = require('test-kit').tape()
var tbase = require('.')

test('names', function (t) {
    t.table_assert([
        [ 'tnf',            'exp' ],
        [ 'tinyname',       [ '*', 'F', 'N', 'T', 'X', 'a', 'b', 'd', 'f', 'i', 'm', 'n', 'o', 'r', 's', 't', 'x' ] ],
        [ 'tinyname',       [ '*', 'F', 'N', 'T', 'X', 'a', 'b', 'd', 'f', 'i', 'm', 'n', 'o', 'r', 's', 't', 'x' ] ],
        [ 'name',           [ '*', 'arr', 'blb', 'boo', 'byt', 'dec', 'fal', 'flt', 'int', 'mul', 'nul', 'num', 'obj', 'rec', 'str', 'tru', 'typ' ] ],
        [ 'fullname',       [ 'any', 'array', 'blob', 'boolean', 'byte', 'decimal', 'false', 'float', 'integer', 'multi', 'null', 'number', 'object', 'record', 'string', 'true', 'type' ] ],
    ], function(tnf) { return tbase.names(tnf) })
})