/*
* Ensure that split stream is backpressure sensitive.
* Seems that high water mark on destination needs to be set,
* but once that's done, the duplex CharSplit does observe
* backpressure well enough that it doesn't run out of memory
*/

const stream = require('stream')
const split = require('../index')

const DATA = Array(100).fill( "abcdefg\nhijklmn" ).join('')

class Source extends stream.Readable {
    _read( sz ) {
        this.push( DATA )
    }
}

class Sink extends stream.Writable {
   _write( data, enc, cb ) {
       cb( null )
   }
}

function onComplete( err ) {
   console.log( 'onComplete' )
   if( err ) {
      console.log(err)
   }
   process.exit(0)
}

/* TODO, try PassThrough stream w hwm = 1 as a regulator to apply backpressure */

stream.pipeline( [
    new Source,
    new split.CharSplit({ delimiter: "\n" } ),
    new Sink( { highWaterMark: 1 } ) /* NB: high water mark = 1 to apply backpressure */
  ],
  onComplete )
