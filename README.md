### LineSplit

Answers the stack overflow question "How do I read a file one line at a time in Node.js" ( or, "How do I read a file line by line in Node" );

More generally, breaks an input stream into records based on any arbitrary delimiter.

The trick is handling records or delimiters that are broken across multiple input buffers, which this code does.

No dependencies.   I suspect the code is very fast.

Usage:

    const splitstrm = require('linesplit');
    const fs = require('fs');

    fs.createReadStream('myfile').pipe( new splitstrm.DelimSplit( { delim: "\r\n" } ).pipe( process.stdout );

or any delimiter, really:

    "\n"
    "\r\n\r\n"
    "\r\n -- my fancy record delimiter -- \r\n"
    "foobar"

Also handles regular expressions, though this can be a lot slower than the DelimSplit.

    fs.createReadStream( 'myfile' ).pipe( new splitstrm.ReSplit( delim: /\r?\n/g ).pipe( process.stdout )

If you're only splitting on a single character then the fastest option is the CharSplit stream:

    fs.createReadStream('myfile')
        .pipe( new strmsplit.CharSplit( { delim: "\n" } )
        .pipe( process.stdout )
 
