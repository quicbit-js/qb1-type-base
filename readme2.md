# qb1-type-set

A qb1-type-set is a collection of qb1 data types.  

## a review of qb1 types

To understand what a type-set is, we first review some aspects of qb1 types:

1. Type Aggregation

    A qb1 type can represent multiple types via nested string form. For example,
    an array of float-or-integer-or-string:

        [ float|integer|string ]
    
    ... can be simplified to an array of number-or-string:

        [ number|string ]
    
    ... which can be further simplified to an array (of anything):

        [ any ] or 'array' or just '[*]'
    
    Similarly, object types aggregate.  A record containing 'foo' strings and 'bar' array-of-string-or-null:
    
        { foo: string, bar: [string|number] }
             
    ... can be restated as a general object type:
    
        { string|[string|number] }
        
    ... which aggregates into:
    
        { any } or 'object' or just '{}'
        
    (different aggregations are possible see qb1-type for more on type aggregation)
    
2. Full names, short names, and char identities

    Every type has three identities - a full name, a short name, and a char.  The
    above examples could have been also written using 3-character 'nam' form:
    
        [ flt|int|str ]
        [ num|str ]
        [*] or 'arr' or []   (see note below *)       
        
        { foo:str, bar: [str|num] }
        { str|[str|num] }
        {*} or 'obj' or {}   (see note below *)
        
    \* loose parse mode, the default, handles all forms, strict modes can be used to enforce a 
    consistent form.
    
    Or using single 'char' form:
    
        [f|i|s]
        [n|s]
        [*] or 'a' or []
        
        {foo:s, bar:[s|n]}
        {s|[s|n]}
        {*} or 'o' or {}
        
        

3. Token Types

    While most qb types represent a set of possible values:
    
        integer:  0, 1, 2, 3...
        string: '', 'a', 'hello', ...
    
    A qb type may also represent a single value, such as 'null', or 'true'.  We call these 'token'
    types because the names represent an single value rather than a set of possible values.  For
    simplicity, you may see qb1 handling token types like other types, in which case it may be
    helpful to think of tokens as sets (sets-of-one).  Similarly, qb1 may handle array and object
    complex types like simple string and number types in which case it may help to think of both
    as sets of possible values:
    
        [*]             an array of any value
        [num]           an array of number values (subset of [*])
        
        unt             an integer value in the range 0..infinity
        unt8            an integer in the range 0..255 (subset of unt)
    
## type-set

Keeping complex type aggregation and identities in mind (above), know that a type-set is the 
master palette of types (value set/subset rules) from which we may select or define our 
own types.

### design note - why have type-set at all?

If we look closely we can see that a type-set has many similarities with the record
complex type; both are named sets of types.  So why implement type-set as
something special and not just use an object?  Well, implementing type-set allowed us
to validate from a common registry and require string and (fast) integer codes for every type.
Although we may a some point bring these concepts closer together in 
implementation, for now this approach seemed more straight-forward.

## pre-defined sets

qb1 uses a makes use of a pre-defined type set that matches the qb1 type specification.  This
library also supports creating subsets of the full qb1 type set or defining new types using
the registry.
