var test = require('test-kit').tape()
var tdef = require('qb1-type-def')
var typeset = require('.')

test('create and nams and toString', function (t) {
    t.table_assert([
        [ 'args',               'fn',       'exp' ],
        [ [],                   'nams',     ['*','mul'] ],
        [ ['*'],                'nams',     ['*','mul'] ],              // any is ignored - and included by default
        [ ['int'],              'nams',     ['*','int','mul'] ],
        [ ['str', 'int'],       'nams',     ['*','int','str','mul'] ],
        [ ['*', 'str', 'int'],  'nams',     ['*','int','str','mul'] ],  // any is ignored again
        [ [],                   'toString', '{}' ],
        [ ['*', 'str', 'int'],  'toString', '{int|str}' ],
    ], function (args, fn) {
        return typeset.apply(null, args)[fn]()
    })
})

test('errors', function (t) {
    t.table_assert([
        [ 'args',               'exp' ],
        [ ['int', 'int'],       /already defined/ ],
    ], function (args) {
        typeset.apply(null, args)
    }, {assert: 'throws'})
})


test('new', function (t) {
    var tset = typeset(tdef.nams())
    tset.nams().forEach(function (n) {
        t.same(tset.new(n).nam, n, t.desc('new', [n], n))
    })
    t.end()
})
