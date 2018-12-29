const stream = require('stream')
const DEBUG = false


class DelimSplit extends stream.Transform {

    constructor(opts) {
        super()
        this.delimiter = Buffer.from(opts.delimiter)
        this.remainders = []
        this.matchCount = 0
    }

    _transform( data, encoding, cb ) {
        if(!this.tstart) this.tstart = Date.now()
        let idx = 0
        let start = 0
        let endpos = 0
        while( idx < data.length ) {
            let b = data[idx++]
            if( b != this.delimiter[this.matchCount] ) {
                endpos = idx
                // Start of the delimiter was matched in the last buffer, but the rest of the delimiter
                // doesn't match in the start of this buffer.
                // Since the start portion was ommitted in the save, it would be missing from the
                // output if we don't save it here.
                if( idx <= this.matchCount ) { 
                    start = endpos - 1
                    this.remainders.push( this.delimiter.slice( 0, this.matchCount ) )
                }
                this.matchCount = 0
                continue
            }
            if(++this.matchCount >= this.delimiter.length ) {
                this.emitLine( data, start, endpos )
                endpos = start = idx;// + 1
                this.matchCount = 0
                continue

            }
        }
        cb(null)
        if( start < data.length && idx > this.matchCount ) {
            this.remainders.push( data.slice(start, idx - this.matchCount ) )
        }
    }

    end() {
        if( this.remainders.length  ) {
            this.emit('data', Buffer.concat(this.remainders) )
        }
        super.end()
    }


    emitLine(data, start, end ) {
        ++this.lines

        let line = data.slice( start, end )
        if( this.remainders.length ) {
            this.remainders.push( line )
            line = Buffer.concat( this.remainders )
            this.remainders = []
        }
        this.emit('data', line )
    }
}

/**
 *
 * Two or three times slower than the 
 *
 *
 */

class ReSplit extends stream.Transform {

    constructor(opts) {
        super(opts)
        this.delimiter = opts.delimiter
        this.remainder = null
    }

    _transform( data, encoding, cb ) {
        if( !this.tstart ) this.tstart = new Date
        if( typeof('data') != 'string' ) {
            data = data.toString()
        }
        if( this.remainder ) {
            data = [this.remainder, data].join('')
            this.remainder = null
        }
        let idx = 0
        let match, lastmatch; 
        while( match = this.delimiter.exec( data, idx ) ) {
            let buff = data.slice( idx, match.index )
            this.emit( 'data', buff )
            idx = match.index + (match[0].length || 1 )
            lastmatch = match
        }
        if( idx < data.length ) {
            this.remainder = data.slice( idx, data.length )
        }
        cb(null)
    }
    end() { 
        this.elapsed = Date.now() - this.tstart
        this.remainder && this.emit('data', this.remainder )
        super.end()
    }
}

/**
 * class CharSplit
 * 
 * Split buffer on single, 7-bit ASCII character ( typically 0x0a , "\n" )
 *
 */

class CharSplit extends stream.Transform {

    constructor(opts) {
        opts = Object.assign({delimiter:"\n"}, opts)
        super(opts)
        this.delimiter = opts.delimiter.charCodeAt(0)
        this.remainder = []
        this.buffered = []
        this.lines = 0
        this.reccnt = 0
    }


    _transform( data, enc, cb ) {
        //console.log( 'RECCNT', ++this.reccnt, 'bufflen', this.buffered.length  )
        let lines = []
        let idx = 0, start = 0
        while( true ) {
            idx = data.indexOf( this.delimiter, idx )
            if( idx < 0 ) {
                let remainder = data.slice( start, data.length )
                this.remainder.push( remainder )
                cb(null)
                return
            }
            //console.log( idx, data[idx], data.toString() )
            let line = data.slice( start, idx )
            if( this.remainder.length ) {
                this.remainder.push( line )
                line = Buffer.concat( this.remainder )
                this.remainder = []
            }
            ++this.lines
            start = ++idx
            this.emit('data', line )
        }
    }

    end() {
        this.remainder.length && this.emit( 'data', Buffer.concat(this.remainder) )
        super.end()
    }
}


class Fail extends stream.Transform {
    _transform( data, encoding, cb ) {
        cb(null, Buffer.from("This is unlikely to occur in any test file.  Results won't match, and test will fail\n"))
    }
    //end() { 
    //    this.emit('end')
    //}
}

module.exports = {
    DelimSplit: DelimSplit,
    ReSplit: ReSplit,
    CharSplit: CharSplit,
    Fail: Fail
}
