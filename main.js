var Imap = require("imap");
var inspect = require('util').inspect;
var mailparser = require("mailparser");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var fs = require("fs");
var config = JSON.parse(fs.readFileSync(process.cwd()+"/config.json", "utf-8"));

var server=function() {
  return new Imap(
    {user: config.username,
    password: config.password,
    host: config.imap.host,
    port: config.imap.port,
    autotls: 'always',
    tls: config.imap.secure,
    keepalive: {
      idleInterval: 2*60*1000, // 2 mins
      forceNoop: true
    }
    }
    );
}
var imap=server();
//var detailImap = server();

function openInbox(cb) {
  imap.openBox('INBOX', true, cb);
}

function fetchBySeq(seq) {
    console.log("fetching:",seq)

    var f = imap.seq.fetch(seq, {
      bodies: 'HEADER',
      struct: true
    });
    f.on('error', function(error) {
      console.log("error occured on fetch",error);
    })
    f.on('message', function(msg, seqno) {
      console.log('Message #%d', seqno);
      var prefix = '(#' + seqno + ') ';
      msg.on('body', function(stream, info) {
        var buffer = '';
        stream.on('data', function(chunk) {
          buffer += chunk.toString('utf8');
        });
        stream.once('end', function() {
          console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
        });
      });
      msg.once('attributes', function(attrs) {
        console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
      });
      msg.once('end', function() {
        console.log(prefix + 'Finished');
      });
    });
}

imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) throw err;
    function addConnectionListener(event, message, cb) {
        imap.on(event, function(seq,more,more2) {
          console.log("Event",message,event,seq,more, more2)
          if (cb) {
           cb(seq)
          }
        })
    }
    addConnectionListener('mail',    'New Mail');
    addConnectionListener('expunge', 'Deleted Mail');
    addConnectionListener('update', 'Altered message metadata', function(seq) { fetchBySeq(seq) } );
    addConnectionListener('uidvalidity', 'uid validity changed');
    console.log("registered");
  });
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('close', function(hadError) {
  console.log('Connection closed',hadError);
});

imap.once('end', function() {
  console.log('Connection ended');
});
//detailImap.connect();
imap.connect();

console.log("done");
