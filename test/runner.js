const stream = require('stream');
const fs = require('fs');
const path = require('path');
const DelimSplit = require('../index.js').DelimSplit;
const ReSplit = require('../index.js').ReSplit;

function failLog( testcase, original, result ) {

    if( testcase.silent ) return;

    console.log( 'faillog1');
    let delimiter = testcase.delimiter
    console.log( 'faillog2');

    console.log("\n===========================\n");
    console.log( 'faillog3');
    console.log( 'DELIM', delimiter.toString(), typeof( delimiter ) === 'string' ? Buffer.from( delimiter ) : delimiter );
    console.log( 'faillog4 original');
    console.log( original.toString(), "\n", original.length  );
    console.log( 'faillog5 result');
    console.log( result.toString(), "\n", result.length );
    console.log( 'faillog6');
}

/*
 *
 */
class Capture extends stream.Writable {
    constructor( joinstring ) {
        super({ highWaterMark:1});

        this.joinstring = Buffer.from(joinstring);
        this.accumulator = [];
    } 
    _write( data, encoding, cb ) {

        if( this.joinstring && this.accumulator.length ) {
            this.accumulator.push( this.joinstring );
        }
        this.accumulator.push( data );
        cb(null);
    }

    result() {

        return Buffer.concat( this.accumulator );
    }
}

const TESTFILE = path.join(__dirname, 'crlf.txt' );
let data = fs.readFileSync( TESTFILE );

class Runner {

    constructor(opts) {
        this.klass = opts.klass;
        this.testCount = 0;
        this.failures = [];
        this.successes = [];
        this.fpath = opts.fpath;
        this.data = fs.readFileSync( this.fpath );
        this.testCount = 0;
    }

    _runTest( testcase, resolve, reject ) {


        let joinstring = testcase.delimiter.joinstring
        let pattern = testcase.delimiter.pattern

        ++this.testCount;
        let src = fs.createReadStream( TESTFILE )//, testcase.sourceOpts );
        let linesplit = new this.klass( { delimiter: pattern } );

        let capture = new Capture( joinstring );

        let self = this
        function onComplete( err ) {

            if( err ) {
                reject(err)
                return
            }
 
            let success = false;
    
            let original = data.toString();
            let result = capture.result();


            if( original == result ) {
                success = true;
            }

            if( original == result + joinstring ) {
                success = true;
            }

            if( joinstring.indexOf( "\r\n" ) == 0 ) {
               if( original == result + "\r\n" ) {
                   success = true;
               }
            }

            if( joinstring.indexOf( "\n" ) == 0 ) {
               if( original == result + "\n" ) {
                   success = true;
               }
            }

            if( original == result + joinstring) {
                success = true;
            }
    
            // Mismatch may simply be that file ended with joinstring, which was not emitted.
            //if( ending == "\r\n" ) result = result + ending;
    
            if( success ) {
                self.successes.push( testcase );
            }
            else
            {
                self.failures.push(testcase);
                failLog( testcase, original, result );
            }

            resolve();
         }
        stream.pipeline( [ src, linesplit, capture ], onComplete )
    }


    runTest( testcase ) {
        return new Promise( (resolve, reject) => this._runTest( testcase, resolve, reject ));
    }
    
    run( testcases ) {
 
        let runner = this;
          function reducer( accum, testcase ) {
              return accum.then( result => {
                  let rv = runner.runTest( testcase ) 
                  return rv.then( result => {
                          return result;
                  } )
              })
          }
          return testcases.reduce( reducer, Promise.resolve() )
              .then( ()  => {
                  return { successes: runner.successes, failures: runner.failures };
              })
    }
}
module.exports = { Runner: Runner } 
