const stream = require('stream');


class LineSplit extends stream.Transform {

    constructor(opts) {
        opts = Object.assign( {}, opts );
        let ending = opts.ending; // || "\n");
        super(opts);
        this.bytes = this.lines = 0;
        this.ending = Buffer.from(ending);
        this.remainder = null;
    }

    _transform( data, encoding, cb ) {
        let idx = 0;
        let start = 0;
        let endpos = 0;
        this.bytes += data.length;
        while( idx < data.length ) {
            let b = data[idx++];
            if( b != this.ending[this.matchCount] ) {
                endpos = idx;
                this.matchCount = 0;
                continue;
            }

            if(++this.matchCount >= this.ending.length ) {
                this.emitLine( data, start, endpos );
                endpos = start = idx;// + 1;
                this.matchCount = 0;
                continue;

            }
        }
        cb(null);
        if( start < data.length ) {
            let remainder = data.slice(start, idx - this.matchCount);
            this.remainder = this.remainder ? Buffer.concat( [this.remainder, remainder] ) : remainder;
        }
    }

    end() {
        if( this.remainder ) {
            this.emit('data', this.remainder );
        }
        this.emit('end');
    }


    emitLine(data, start, end ) {
        ++this.lines;


        let line = data.slice( start, end );
        if( this.remainder ) {
            line = Buffer.concat( [ this.remainder, line ] );
            this.remainder = null;
        }
        this.emit('data', line );
        //this.emit('data', "\nfoo\n");
    }
}


module.exports.LineSplit = LineSplit;
if( module.parent === null ) {

    class Foo extends stream.Writable {
        _write( data, encoding, cb ) {
            console.log("Got", data.toString(), "\n" );
            cb(null);
        }
    }
    let src = require('fs').createReadStream( 'crlf.txt' , { highWaterMark: 2 } )
    let linesplit = new LineSplit( { ending: "lmn" });
    linesplit.on('end', () => console.log( linesplit.lines, linesplit.bytes ) );
    src.pipe( linesplit ).pipe( new Foo );

}
