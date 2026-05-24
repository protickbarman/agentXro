const ws = require('ws');
const http = require('http');
const TOKEN = process.argv[2];
const CID = process.argv[3];
const s = new ws('ws://localhost:3000?token='+TOKEN);
s.on('open', () => s.send(JSON.stringify({type:'subscribe_conversation',conversationId: CID})));
s.on('message', r => {
  const d = JSON.parse(r.toString());
  if (d.type === 'final_result') {
    console.log('=== WS final_result (UI) ===');
    console.log(JSON.stringify({type:d.type, content:d.content, agentType:d.agentType, tokensUsed:d.tokensUsed}, null, 2));
    s.close();
    setTimeout(() => {
      http.get('http://localhost:3000/api/messages/'+CID+'/messages', {headers:{'Authorization':'Bearer '+TOKEN}}, (res) => {
        let data='';
        res.on('data',c=>data+=c);
        res.on('end',() => {
          const msgs = JSON.parse(data);
          const m = msgs.data.find(x => x.role === 'agent');
          if (m) {
            console.log('\n=== DB metadata (NVIDIA) ===');
            console.log(JSON.stringify(m.metadata, null, 2));
          }
          process.exit(0);
        });
      });
    }, 2000);
  }
});
setTimeout(() => process.exit(1), 35000);
