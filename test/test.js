const DelimSplit = require('../index.js').DelimSplit;
const ReSplit = require('../index.js').ReSplit;
const Fail = require('../index.js').Fail;
const CharSplit = require('../index.js').CharSplit;
const Runner = require('./runner').Runner;
const path = require('path');

const DELIMS=[  "\n",
      "a",
      "b",
      "c",
      "d",
      "u",
      "v",
      "x",
      "y",
      "z",
      "d",
      "\r\n",
      "\r",
      "\n",
      "abc",
      "\rabc",
      "\r\nabc",
      "x\r\nabc",
      "xyz\r\n",
      "xyz\r",
      "xyz",
      "mno",
      "lmno",
      "lo",
      "lmnr",
      "lmnrp",
      "lmnrpq",
      "lmnxo",
      "lmnx",
      //"",
      "xlmn" 
      ].map( delim => new Object( { pattern: delim, joinstring: delim } ) )

const REGEX = DELIMS.map( elt => {
   return { joinstring: elt.joinstring, pattern: new RegExp( elt.pattern, 'g' ) }
})


const CHARDELIMS = DELIMS.filter( elt => elt.pattern.length == 1 )

/**
 * For each delimiter, generate test cases for
 * a 16k highWaterMark, then for high water mark values
 * from 1 up through maxHighWaterMark.
 */

function gencases( delimiters, maxHighWaterMark ) {

    function tc( delimiter, hwm ) {
        return {
           delimiter: delimiter,
           // highWaterMark causes source data buffers to be varying lengths, ensuring
           // that some buffers will have many lines, that some lines will be split across buffers,
           // and for low hwm, single lines will arrive in many separate buffers.
           // Tests that incomplete line chunks are correctly stored until a delimiter arrives.
           sourceOpts: { highWaterMark: hwm }
        }
    }

    let cases = [];

    delimiters.forEach( function(delimiter) {
        cases.push( tc( delimiter, 1024 * 16 ) );
        if( maxHighWaterMark == 1 ) return;
        cases.push( tc( delimiter, 1000 ));
        for( let i = 1; i < maxHighWaterMark; ++i ) {
           cases.push( tc( delimiter, i ));
        }
    });
    return cases;
}



function testClass( opts ) { //name, klass, delimiters, maxcases, expectFailure ) {

    let runner = new Runner( { klass: opts.klass, fpath: path.join(__dirname, 'crlf.txt' )  } );
    let testcases = gencases( opts.delimiters, opts.maxHighWaterMark );

    if( opts.expectFailure ) {
        testcase = testcases.pop();
        testcase.silent = true;
        testcases = [ testcase ];
    }

    let tstart = Date.now()
    return runner.run( testcases )
        .then( result => {
            if( opts.expectFailure ) {
                if(  result.failures.length == 0 ) {
                    return Promise.reject(new Error( 'Test is not properly detecting failures' ));
                }
                return Promise.resolve()
             } 

             let obj = {
                 name: opts.name,
                 successes: result.successes.length,
                 failures: result.failures.length,
                 elapsed: Date.now() - tstart
             }

             if( result.failures.length ) {
                 obj.failures = result.failures
             }
             
             console.log( JSON.stringify( obj, null, 4 ) )
             return Promise.resolve()

     })
}

const MAX_HIGH_WATER_MARK = 1000 // test buffer sizes from 1 through max hwm

let eol = { pattern: "\n", joinstring: "\n" }
CASES = [
  //{ name: 'Fail'      , klass: Fail      , delimiters: [ eol ]   , maxHighWaterMark: 1, expectFailure: true },
  //{ name: 'DelimSplit', klass: DelimSplit, delimiters: DELIMS    , maxHighWaterMark: MAX_HIGH_WATER_MARK },
  //{ name: 'ReSplit'   , klass: ReSplit   , delimiters: REGEX     , maxHighWaterMark: MAX_HIGH_WATER_MARK },
  { name: 'CharSplit' , klass: CharSplit , delimiters: CHARDELIMS, maxHighWaterMark: MAX_HIGH_WATER_MARK }
]

function reducer( p, testcase ) {
   console.log( testcase )
   return p.then( () => testClass( testcase ) )
}

CASES.reduce( reducer, Promise.resolve() )
   .catch( console.log )
