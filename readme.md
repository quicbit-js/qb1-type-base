# qb1-type-base

Core types for qb1.

## Overview

qb1-type-base defines the flexible identities of types allowing qb1 to read and write type information 
in highly intuitive as well as compact forms, as clean strings, or using JSON format

### Representing Types as Simple Strings

    full-name             short           mini        description 
                          
    number                num             n           a JSON number (plus float or rational, if desired)
    string                str             s           a string of characters
    [number]              [num]           [n]         an array of numbers (integer, decimal, float...)
    {string:number}       {str:num}       {s:n}       an object with number values
    [string|number|null]  [str|num|nul}   [s|n|N]     an array containing strings or numbers or null
    
### Types as JSON

Like string format, but in JSON:

    full-name             short           mini        description 
                          
    "number"              "num"           "n"         a JSON number (or base 2 float or rational)
    "string"              "str"           "s"         a string of characters
    ["number"]            ["num"]         ["n"]       an array of numbers (integer, decimal, float...)
    {"string":"number"}   {"str":"num"}   {"s":"n"}   an object with number values
    
One can use any of these short, long and mini forms interchangeably 
with qb1. 

## Basic Types

This brief overview of qb1 types is covered in more detail in the qb1-type project.  While
perusing the types, keep in mind that none of these types have upper limits.  number,
string, integer, etc have no bounds.  See the Constraints section for options on
constraining values to desired size limits.

### JSON Tokens
    
    null                    same token as in JSON, usable anywhere a value can be used
    true                    same token as in JSON
    false                   same token as in JSON

### JSON Types

    number                  signed or unsigned integer or decimal value
    string                  string of characters encoded as UTF-8
    object                  a dictionary or map with string keys and any values
    array                   ordered list of any values

### JSON Number Sub-Types

These numeric are all represented directly in JSON.  Note that while decimal is the JSON
format used for floating point numbers, it may not be an ideal fit for serialization from
systems that use base 2 floating point or rational numbers, which are supported options in qb1.

    decimal                 base 10 floating point number
    integer                 signed integer
    unteger                 unsigned integer

Other Numeric Types (representable as JSON object or string)
    
    float                   base 2 floating point number
    rational                a rational number expressed as a fraction p/q

Binary Types (representable in JSON as integers or arrays of integer - as well as object with
compact string encodings)
                            
    blob                    array of bytes
    byte                    eight-bit unsigned integer (values 0..255)
    
Boolean (representable as both true/false or byte or integer 1/0)

    boolean                 can be true or false
    
Special Types

    type                    type is a type definition
    any or *                is a wild-card representing any valid type within a chosen type-set


## Full, Short, Mini, and Numeric Representations

Every token and type has three string identities - full name (called 'name'), short (3-letter called
'nam', and single character or 'char'.  Single character identities are common ascii (in range
0..127) and so are also a small integer representation of type.

Short names and characters are easy to remember because 'nam' is almost always the first three letters 
of name and char is almost always the first letter of name.  Tokens (single value types) are capitalized while
other types, with the exception of blob, are lower case.

    name        nam     char    ascii
    
    null        nul     N       
    true        tru     T
    false       fal     F
    number      num     n
    string      str     s
    object      obj     o
    array       arr     a
    decimal     dec     d
    integer     int     i
    untiger     unt     u 
    rational    rat     r
    boolean     boo     b 
    type        typ     t
    float       flt     f               // exception to nam convention
    any         any     *               // exception to char convention
    blob        blb     X               // exception to char convention               
    byte        byt     x               // exception to char convention



## Compound Types

type-def does not handle compound types but qb1 does.  See qb1-type-set or qb1-type for more information
on compound types like <code>[str|int|boo]</code> (array of string-or-integer-or-boolean))

## Number Size Constraints (bits)

qb1 has integrated support for the popular bit size constraints across all numeric types.   

    name                            description
                                    
    integer8                        8 bit signed integer                                    
    int8                            8 bit signed integer
    i8                              8 bit signed integer
    unt8                            8 bit unsigned integer (same as 'byt')
    flt32                           32 bit float
    f32                             32 bit float (short-code)
    dec64                           64 bit decimal
    d64                             64 bit decimal (short-code)
    rational64                      64 bit rational
    ...

The pre-defined number sizes are limited to the common sizes 8, 16, 32, 64, or 128 for integer and
uinteger and 32, 64, or 128 for float, decimal or rational.

More examples are given in [the full list of size-constrained numbers](#size-constrained-numbers) below.

(why use bit size for number instead of bytes like we do for string/blob?  Tradition.  Using 
'int8' for a 64 bit integer would be terribly misleading to most programmers)

## String and Blob Size Constraints (bytes)

qb1 has integrated suppport for byte size constraints for string and blob types
 
    string<n>           str<n>              s<n>            string with limit of n characters
    blob<n>             blb<n>              X<n>            array of n bytes
    
For example
    
    str32  - a string of 32 bytes or less
    blb1024 -   blob of 1024 bytes or less

Note that we very intentionally chose byte constraints, not character constraints because character limits
are a business concern while byte limits are a storage and serialization concern.  It can be helpful
to think of concrete physical limits taking precedence over business limits, not the other way around.

## Compound Types, Binary Interoperability and More...

See qb1-type for deeper and broader coverage of qb1 types.
