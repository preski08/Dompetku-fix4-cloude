// DOMPETKU CHAT v5 (WA style + gambar + file + folder + lokasi Google Maps)
(function () {
  'use strict';

  function logErr(msg, stack) {
    var b = document.getElementById('debug-box');
    if (b) { b.style.display='block';
      b.textContent='❌ chat_v2.js: '+msg+(stack?'\n📍 '+stack.split('\n').slice(0,3).join('\n'):''); }
    try { console.error('[chat]',msg,stack); } catch(_){}
  }

  try {
    var CHAT_KEY='dk_chats', READ_KEY='dk_chat_read';
    var openWith=null, view='list';
    var recorder=null, recChunks=[], recInterval=null, recStart=0;
    var booted=false;

    function id(x){ return document.getElementById(x); }
    function setText(x,t){ var e=id(x); if(e) e.textContent=t; }
    function setDisp(x,v){ var e=id(x); if(e) e.style.display=v; }
    function addC(x,c){ var e=id(x); if(e) e.classList.add(c); }
    function remC(x,c){ var e=id(x); if(e) e.classList.remove(c); }
    function hasC(x,c){ var e=id(x); return e?e.classList.contains(c):false; }
    function rd(k,d){ try{ return JSON.parse(localStorage.getItem(k))||d; }catch(e){ return d; } }
    function wr(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){ alert('Penyimpanan penuh. Hapus chat/gambar lama.'); } }
    function me(){ var s=rd('dk_session',null); return s&&s.id?s.id:null; }
    function cKey(a,b){ return [a,b].sort().join('|'); }
    function users(){ return rd('dk_users',[]); }
    function userOK(u){ return users().some(function(x){ return x.id===u; }); }
    function getChats(){ return rd(CHAT_KEY,{}); }
    function saveChats(c){ wr(CHAT_KEY,c); }
    function getReads(){ return rd(READ_KEY,{}); }
    function saveReads(m){ wr(READ_KEY,m); }

    function t(ts){
      var d=new Date(ts),n=new Date();
      var hh=('0'+d.getHours()).slice(-2),mm=('0'+d.getMinutes()).slice(-2);
      if(d.toDateString()===n.toDateString()) return hh+':'+mm;
      return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+' '+hh+':'+mm;
    }
    function dayLbl(ts){
      var d=new Date(ts),n=new Date();
      var y=new Date(); y.setDate(y.getDate()-1);
      if(d.toDateString()===n.toDateString()) return 'HARI INI';
      if(d.toDateString()===y.toDateString()) return 'KEMARIN';
      var dn=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      var mn=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      return (dn[d.getDay()]+', '+d.getDate()+' '+mn[d.getMonth()]).toUpperCase();
    }
    function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
    function durMs(ms){ var s=Math.floor(ms/1000); return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2); }
    function fmtSize(b){
      if(b<1024) return b+' B';
      if(b<1048576) return (b/1024).toFixed(1)+' KB';
      return (b/1048576).toFixed(1)+' MB';
    }
    function fileIcon(name, type){
      var n=(name||'').toLowerCase(), m=(type||'').toLowerCase();
      if(m.indexOf('pdf')>=0||n.endsWith('.pdf')) return '📕';
      if(m.indexOf('word')>=0||n.endsWith('.doc')||n.endsWith('.docx')) return '📘';
      if(m.indexOf('sheet')>=0||m.indexOf('excel')>=0||n.endsWith('.xls')||n.endsWith('.xlsx')) return '📗';
      if(m.indexOf('zip')>=0||m.indexOf('rar')>=0||n.endsWith('.zip')||n.endsWith('.rar')) return '🗜️';
      if(m.indexOf('video')>=0||/\.(mp4|mov|avi|mkv)$/.test(n)) return '🎬';
      if(m.indexOf('audio')>=0||/\.(mp3|wav|m4a)$/.test(n)) return '🎵';
      if(m.indexOf('text')>=0||n.endsWith('.txt')) return '📄';
      if(n.endsWith('.apk')) return '📦';
      if(n.endsWith('.html')||n.endsWith('.js')||n.endsWith('.css')) return '💻';
      return '📎';
    }

    function unread(){
      var u=me(); if(!u) return 0;
      var c=getChats(),r=getReads(),n=0;
      Object.keys(c).forEach(function(k){
        if(!c[k].users||c[k].users.indexOf(u)<0) return;
        var lr=r[u+'|'+k]||0;
        c[k].messages.forEach(function(m){ if(m.from!==u&&m.ts>lr) n++; });
      });
      return n;
    }
    function markRead(p){
      var u=me(); if(!u) return;
      var k=cKey(u,p), r=getReads();
      r[u+'|'+k]=Date.now(); saveReads(r); notif();
    }

    function css(){
      if(id('dkc-css')) return;
      var s=''
      + '#dk-chat-btn{position:relative}'
      + '#dk-chat-notif{position:absolute;top:0;right:0;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#25D366;color:#0B141A;font-size:10px;font-weight:800;display:none;align-items:center;justify-content:center;font-family:sans-serif;line-height:1}'
      + '#dk-chat-notif.show{display:flex}'

      + '#dkc-ov{position:fixed;inset:0;background:#0B141A;z-index:9999;display:none;flex-direction:column;font-family:-apple-system,sans-serif}'
      + '#dkc-ov.active{display:flex}'
      + '.dkc-h{display:flex;align-items:center;gap:6px;padding:8px;background:#202C33;flex-shrink:0;padding-top:calc(8px + env(safe-area-inset-top));color:#E9EDEF}'
      + '.dkc-b{background:none;border:none;color:#E9EDEF;font-size:22px;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center}'
      + '.dkc-b:active{background:rgba(255,255,255,.08)}'
      + '.dkc-avh{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#25D366,#128C7E);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0}'
      + '.dkc-tt{flex:1;color:#E9EDEF;font-weight:600;font-size:16px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.2}'
      + '.dkc-tt small{display:block;color:#8696A0;font-weight:400;font-size:12px;margin-top:1px}'
      + '.dkc-hi{background:none;border:none;color:#AEBAC1;font-size:18px;width:38px;height:38px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center}'
      + '.dkc-hi:active{background:rgba(255,255,255,.08)}'

      + '.dkc-body{flex:1;overflow-y:auto;padding:12px 8px 4px;min-height:0;background:#0B141A;background-image:radial-gradient(rgba(255,255,255,.025) 1px, transparent 1px);background-size:22px 22px}'
      + '.dkc-empty{color:#8696A0;text-align:center;padding:80px 24px;font-size:14px}'
      + '.dkc-ei{font-size:56px;margin-bottom:14px;opacity:.5}'
      + '.dkc-eb{margin-top:18px;padding:12px 26px;border-radius:24px;background:#25D366;color:#0B141A;border:none;font-weight:700;font-size:14px;cursor:pointer}'

      + '.dkc-it{display:flex;align-items:center;gap:12px;padding:10px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04)}'
      + '.dkc-it:active{background:rgba(255,255,255,.05)}'
      + '.dkc-av{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#25D366,#128C7E);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;flex-shrink:0}'
      + '.dkc-ii{flex:1;min-width:0}'
      + '.dkc-in{color:#E9EDEF;font-weight:600;font-size:15px;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.dkc-il{color:#8696A0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.dkc-im{text-align:right;flex-shrink:0}'
      + '.dkc-id{color:#8696A0;font-size:11px}'
      + '.dkc-dot{display:inline-block;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:#25D366;color:#0B141A;font-size:11px;font-weight:800;text-align:center;line-height:20px;margin-left:auto}'

      + '.dkc-mr{display:flex;margin-bottom:4px;padding:0 6px;align-items:flex-end;gap:6px}'
      + '.dkc-mr.m{justify-content:flex-end}'
      + '.dkc-mb{max-width:78%;padding:6px 9px 6px 10px;border-radius:8px;font-size:14.5px;line-height:1.35;word-break:break-word;position:relative;box-shadow:0 1px 1px rgba(0,0,0,.2)}'
      + '.dkc-mr.t .dkc-mb{background:#202C33;color:#E9EDEF;border-top-left-radius:2px}'
      + '.dkc-mr.m .dkc-mb{background:#005C4B;color:#E9EDEF;border-top-right-radius:2px}'
      + '.dkc-mr.t .dkc-mb::before{content:"";position:absolute;left:-8px;top:0;width:0;height:0;border-right:8px solid #202C33;border-bottom:8px solid transparent}'
      + '.dkc-mr.m .dkc-mb::before{content:"";position:absolute;right:-8px;top:0;width:0;height:0;border-left:8px solid #005C4B;border-bottom:8px solid transparent}'
      + '.dkc-mt{display:inline-block;font-size:11px;margin-left:8px;opacity:.6;vertical-align:bottom;float:right;line-height:14px;transform:translateY(3px)}'

      + '.dkc-ds{text-align:center;margin:12px 0 8px}'
      + '.dkc-ds span{background:#182229;color:#8696A0;font-size:11px;font-weight:600;padding:5px 12px;border-radius:8px;letter-spacing:.5px}'

      + '.dkc-ib{display:flex;gap:6px;padding:6px 8px;align-items:flex-end;background:#0B141A;padding-bottom:calc(6px + env(safe-area-inset-bottom));flex-shrink:0}'
      + '.dkc-inp-wrap{flex:1;display:flex;align-items:flex-end;background:#202C33;border-radius:22px;padding:0 4px;min-height:44px;max-height:120px;position:relative}'
      + '.dkc-inp{flex:1;padding:11px 4px;background:transparent;border:none;color:#E9EDEF;font-size:15.5px;outline:none;font-family:inherit;resize:none;max-height:100px;min-height:22px;line-height:20px}'
      + '.dkc-inp::placeholder{color:#8696A0}'
      + '.dkc-inl{background:none;border:none;color:#8696A0;font-size:22px;width:40px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}'
      + '.dkc-inl:active{color:#25D366}'
      + '.dkc-sm{width:48px;height:48px;border-radius:50%;border:none;background:#25D366;color:#0B141A;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:800}'
      + '.dkc-sm:active{transform:scale(.92)}'
      + '.dkc-sm.mic{background:#00A884;font-size:22px}'

      + '.dkc-att-menu{position:absolute;bottom:calc(100% + 10px);left:8px;background:#233138;border-radius:14px;padding:6px;display:none;flex-direction:column;gap:2px;box-shadow:0 8px 32px rgba(0,0,0,.5);min-width:190px;z-index:20}'
      + '.dkc-att-menu.show{display:flex}'
      + '.dkc-att-item{display:flex;align-items:center;gap:14px;padding:10px 14px;border:none;background:none;color:#E9EDEF;font-size:15px;cursor:pointer;border-radius:10px;text-align:left;font-family:inherit;font-weight:500}'
      + '.dkc-att-item:active{background:rgba(255,255,255,.08)}'
      + '.dkc-att-ico{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;color:#fff}'
      + '.dkc-att-ico.g{background:#7C3AED}'
      + '.dkc-att-ico.c{background:#EF4444}'
      + '.dkc-att-ico.d{background:#3B82F6}'
      + '.dkc-att-ico.l{background:#10B981}'
      + '.dkc-att-ico.f{background:#F59E0B}'

      + '.dkc-dlg{position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;padding:20px;z-index:10001}'
      + '.dkc-dlg.active{display:flex}'
      + '.dkc-dc{background:#202C33;max-width:400px;width:100%;padding:24px;border-radius:20px;box-sizing:border-box}'
      + '.dkc-dc h3{color:#E9EDEF;margin:0 0 16px;font-size:18px}'
      + '.dkc-dc label{display:block;color:#8696A0;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:600}'
      + '.dkc-dc input{width:100%;padding:14px;background:#2A3942;border:none;border-radius:12px;color:#E9EDEF;font-size:15px;outline:none;margin-bottom:8px;box-sizing:border-box}'
      + '.dkc-st{font-size:12px;min-height:18px;color:#8696A0;margin-bottom:12px;font-family:monospace}'
      + '.dkc-da{display:flex;gap:10px}'
      + '.dkc-bt{flex:1;padding:14px;border-radius:14px;border:none;font-weight:700;font-size:14px;cursor:pointer}'
      + '.dkc-bt.p{background:#25D366;color:#0B141A}'
      + '.dkc-bt.g{background:rgba(255,255,255,.06);color:#E9EDEF}'

      + '.dkc-vo{display:flex;align-items:center;gap:10px;min-width:180px}'
      + '.dkc-pl{width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;background:rgba(255,255,255,.15);color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}'
      + '.dkc-wv{flex:1;height:24px;position:relative}'
      + '.dkc-wb{position:absolute;top:50%;transform:translateY(-50%);height:4px;width:100%;background:rgba(255,255,255,.2);border-radius:2px;overflow:hidden}'
      + '.dkc-wf{height:100%;width:0;background:#25D366}'
      + '.dkc-dr{font-size:11px;font-family:monospace;opacity:.85}'

      + '.dkc-mb.dkc-img-b{padding:4px;overflow:visible}'
      + '.dkc-imgw{position:relative;max-width:260px;border-radius:6px;overflow:hidden;cursor:pointer;background:#000;line-height:0}'
      + '.dkc-imgw img{display:block;width:100%;height:auto;max-height:340px;object-fit:cover}'
      + '.dkc-imgd{position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,.65);color:#fff;border:none;width:34px;height:34px;border-radius:50%;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)}'

      // FILE bubble
      + '.dkc-file-b{padding:10px 12px !important;display:flex;align-items:center;gap:12px;min-width:230px;max-width:280px}'
      + '.dkc-fi{width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}'
      + '.dkc-fd{flex:1;min-width:0}'
      + '.dkc-fn{color:#E9EDEF;font-weight:600;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px}'
      + '.dkc-fs{color:#8696A0;font-size:11.5px}'
      + '.dkc-fdl{background:rgba(255,255,255,.12);border:none;color:#E9EDEF;width:34px;height:34px;border-radius:50%;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}'
      + '.dkc-fdl:active{background:rgba(255,255,255,.25)}'

      // LOCATION bubble (Gojek-style pin putih dengan panah)
      + '.dkc-loc-b{padding:6px !important;overflow:visible;max-width:280px}'
      + '.dkc-loc-map{position:relative;width:270px;height:150px;border-radius:8px;overflow:hidden;background:linear-gradient(135deg,#e8f0e8,#cfd8cf);cursor:pointer}'
      + '.dkc-loc-map::after{content:"";position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,transparent,transparent 19px,rgba(0,0,0,.06) 19px,rgba(0,0,0,.06) 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(0,0,0,.06) 19px,rgba(0,0,0,.06) 20px)}'
      + '.dkc-loc-pin{position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);z-index:2;filter:drop-shadow(0 6px 10px rgba(0,0,0,.3))}'
      + '.dkc-loc-pin-c{width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#ffffff,#e2e5e8 70%,#b8bcc2);display:flex;align-items:center;justify-content:center;position:relative;box-shadow:inset 0 -3px 6px rgba(0,0,0,.12)}'
      + '.dkc-loc-pin-c::before{content:"";position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:11px solid #b8bcc2;z-index:-1}'
      + '.dkc-loc-pin-c::after{content:"";position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #e2e5e8;z-index:1}'
      + '.dkc-loc-arrow{font-size:22px;color:#374151;transform:rotate(0deg);line-height:1;margin-top:-2px}'
      + '.dkc-loc-shadow{position:absolute;left:50%;top:50%;transform:translate(-50%,0);width:22px;height:7px;background:rgba(0,0,0,.25);border-radius:50%;filter:blur(2px);z-index:1}'
      + '.dkc-loc-info{padding:6px 8px 2px;display:flex;align-items:center;gap:8px}'
      + '.dkc-loc-txt{flex:1;font-size:12.5px;color:#E9EDEF;line-height:1.3;overflow:hidden}'
      + '.dkc-loc-txt b{display:block;font-size:13.5px;font-weight:600;margin-bottom:2px}'
      + '.dkc-loc-txt span{color:#8696A0;font-size:11.5px}'
      + '.dkc-loc-badge{background:rgba(255,255,255,.1);color:#E9EDEF;border:1px solid rgba(255,255,255,.15);font-size:10px;padding:3px 8px;border-radius:10px;font-weight:600}'

      + '#dkc-vw{position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:10003;display:none;flex-direction:column}'
      + '#dkc-vw.active{display:flex}'
      + '.dkc-vwh{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;padding-top:calc(12px + env(safe-area-inset-top));background:#202C33}'
      + '.dkc-vwt{color:#E9EDEF;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;font-weight:500}'
      + '.dkc-vwa{display:flex;gap:8px}'
      + '.dkc-vwb{flex:1;display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto;min-height:0}'
      + '.dkc-vwb img{max-width:100%;max-height:100%;object-fit:contain}'
      + '.dkc-vwbtn{background:rgba(255,255,255,.1);color:#fff;border:none;padding:9px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer}'
      + '.dkc-vwbtn.p{background:#25D366;color:#0B141A}'

      + '#dkc-rec{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:10002;display:none;flex-direction:column;align-items:center;justify-content:center;padding:24px}'
      + '#dkc-rec.active{display:flex}'
      + '.dkc-rp{width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(239,68,68,.4),transparent 70%);display:flex;align-items:center;justify-content:center;margin-bottom:24px;animation:dkcPulse 1.2s infinite}'
      + '@keyframes dkcPulse{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.08);opacity:1}}'
      + '.dkc-rpi{width:80px;height:80px;border-radius:50%;background:#EF4444;display:flex;align-items:center;justify-content:center;font-size:36px;color:#fff}'
      + '.dkc-rt{color:#fff;font-size:32px;font-weight:800;font-family:monospace;margin-bottom:8px}'
      + '.dkc-rh{color:#8696A0;font-size:13px;margin-bottom:32px}'
      + '.dkc-ra{display:flex;gap:16px}'
      + '.dkc-rbt{padding:14px 28px;border-radius:24px;border:none;font-weight:700;font-size:14px;cursor:pointer}'
      + '.dkc-rbc{background:rgba(255,255,255,.1);color:#fff}'
      + '.dkc-rbs{background:#25D366;color:#0B141A}';

      var el=document.createElement('style');
      el.id='dkc-css'; el.textContent=s;
      document.head.appendChild(el);
    }

    function ui(){
      if(id('dkc-ov')) return;
      var btn=id('dk-chat-btn');
      if(!btn){
        var ha=document.querySelector('.header-actions');
        if(ha){
          var b=document.createElement('button');
          b.id='dk-chat-btn'; b.title='Chat';
          b.style.position='relative';
          b.innerHTML='💬<span id="dk-chat-notif"></span>';
          b.onclick=open;
          ha.insertBefore(b,ha.firstChild);
          btn=b;
        }
      }
      if(btn&&!btn.onclick) btn.onclick=open;

      var o=document.createElement('div');
      o.id='dkc-ov';
      o.innerHTML=''
        +'<div class="dkc-h">'
        +  '<button class="dkc-b" id="dkc-bk">←</button>'
        +  '<div class="dkc-avh" id="dkc-avh">💬</div>'
        +  '<div class="dkc-tt" id="dkc-tt">Chats<small id="dkc-sub"></small></div>'
        +  '<button class="dkc-hi" id="dkc-nw" title="Chat baru">＋</button>'
        +'</div>'
        +'<div class="dkc-body" id="dkc-body"></div>'
        +'<div class="dkc-ib" id="dkc-ib" style="display:none">'
        +  '<div class="dkc-inp-wrap">'
        +    '<button class="dkc-inl" id="dkc-emoji">😊</button>'
        +    '<textarea class="dkc-inp" id="dkc-inp" placeholder="Ketik pesan" rows="1"></textarea>'
        +    '<button class="dkc-inl" id="dkc-att">📎</button>'
        +    '<div class="dkc-att-menu" id="dkc-att-menu">'
        +      '<button class="dkc-att-item" data-t="gallery"><span class="dkc-att-ico g">🖼️</span>Galeri</button>'
        +      '<button class="dkc-att-item" data-t="camera"><span class="dkc-att-ico c">📷</span>Kamera</button>'
        +      '<button class="dkc-att-item" data-t="doc"><span class="dkc-att-ico d">📄</span>Dokumen</button>'
        +      '<button class="dkc-att-item" data-t="folder"><span class="dkc-att-ico f">📁</span>Folder</button>'
        +      '<button class="dkc-att-item" data-t="loc"><span class="dkc-att-ico l">📍</span>Lokasi</button>'
        +    '</div>'
        +  '</div>'
        +  '<button class="dkc-sm mic" id="dkc-sm">🎤</button>'
        +'</div>'
        +'<div class="dkc-dlg" id="dkc-dlg">'
        +  '<div class="dkc-dc">'
        +    '<h3>Chat Baru</h3>'
        +    '<label>Wallet ID</label>'
        +    '<input type="text" id="dkc-nwid" placeholder="username" maxlength="50">'
        +    '<div class="dkc-st" id="dkc-nwst"></div>'
        +    '<div class="dkc-da">'
        +      '<button class="dkc-bt g" id="dkc-nwca">Batal</button>'
        +      '<button class="dkc-bt p" id="dkc-nwgo">Mulai</button>'
        +    '</div>'
        +  '</div>'
        +'</div>';
      document.body.appendChild(o);

      // Hidden inputs
      ['file','file-cam','file-doc','file-folder'].forEach(function(nm){
        var fi=document.createElement('input');
        fi.type='file'; fi.id='dkc-'+nm;
        fi.style.display='none';
        if(nm==='file'||nm==='file-cam') fi.accept='image/*';
        if(nm==='file-cam') fi.capture='environment';
        if(nm==='file-folder'){ fi.webkitdirectory=true; fi.multiple=true; }
        document.body.appendChild(fi);
      });

      var r=document.createElement('div');
      r.id='dkc-rec';
      r.innerHTML=''
        +'<div class="dkc-rp"><div class="dkc-rpi">🎤</div></div>'
        +'<div class="dkc-rt" id="dkc-rt">0:00</div>'
        +'<div class="dkc-rh">Merekam... (maks 30 detik)</div>'
        +'<div class="dkc-ra">'
        +  '<button class="dkc-rbt dkc-rbc" id="dkc-rc">Batal</button>'
        +  '<button class="dkc-rbt dkc-rbs" id="dkc-rs">Kirim</button>'
        +'</div>';
      document.body.appendChild(r);

      var v=document.createElement('div');
      v.id='dkc-vw';
      v.innerHTML=''
        +'<div class="dkc-vwh">'
        +  '<div class="dkc-vwt" id="dkc-vwt"></div>'
        +  '<div class="dkc-vwa">'
        +    '<button class="dkc-vwbtn p" id="dkc-vwd">⬇ Unduh</button>'
        +    '<button class="dkc-vwbtn" id="dkc-vwx">✕</button>'
        +  '</div>'
        +'</div>'
        +'<div class="dkc-vwb"><img id="dkc-vwi" alt="preview"></div>';
      document.body.appendChild(v);

      bind();
    }

    function bind(){
      id('dkc-bk').onclick=back;
      id('dkc-nw').onclick=openDlg;
      id('dkc-nwca').onclick=function(){ remC('dkc-dlg','active'); };
      id('dkc-nwgo').onclick=startNew;
      id('dkc-nwid').addEventListener('keydown',function(e){ if(e.key==='Enter') startNew(); });

      var inp=id('dkc-inp');
      inp.addEventListener('keydown',function(e){
        if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); }
      });
      inp.addEventListener('input',function(){
        this.style.height='auto';
        this.style.height=Math.min(this.scrollHeight,100)+'px';
        updateSendBtn();
      });

      id('dkc-sm').onclick=function(){
        if(inp.value.trim().length>0) send(); else startRec();
      };
      id('dkc-att').onclick=function(e){ e.stopPropagation(); id('dkc-att-menu').classList.toggle('show'); };
      id('dkc-emoji').onclick=function(){
        var i=id('dkc-inp'); i.value+='😊'; i.focus(); updateSendBtn();
      };
      document.querySelectorAll('.dkc-att-item').forEach(function(b){
        b.onclick=function(){
          remC('dkc-att-menu','show');
          var tp=this.getAttribute('data-t');
          if(tp==='gallery') id('dkc-file').click();
          else if(tp==='camera') id('dkc-file-cam').click();
          else if(tp==='doc') id('dkc-file-doc').click();
          else if(tp==='folder') id('dkc-file-folder').click();
          else if(tp==='loc') shareLocation();
        };
      });
      document.addEventListener('click',function(e){
        var m=id('dkc-att-menu');
        if(m&&m.classList.contains('show')&&!e.target.closest('#dkc-att')&&!e.target.closest('#dkc-att-menu'))
          m.classList.remove('show');
      });

      id('dkc-file').onchange=sendImgFile;
      id('dkc-file-cam').onchange=sendImgFile;
      id('dkc-file-doc').onchange=sendFile;
      id('dkc-file-folder').onchange=sendFolder;

      id('dkc-rc').onclick=cancelRec;
      id('dkc-rs').onclick=stopRecSend;
      id('dkc-vwd').onclick=downloadViewerImg;
      id('dkc-vwx').onclick=function(){ remC('dkc-vw','active'); };
      id('dkc-vw').addEventListener('click',function(e){
        if(e.target===this||e.target.classList.contains('dkc-vwb')) remC('dkc-vw','active');
      });
    }

    function updateSendBtn(){
      var inp=id('dkc-inp'), sm=id('dkc-sm');
      if(!inp||!sm) return;
      if(inp.value.trim().length>0){ sm.classList.remove('mic'); sm.textContent='➤'; }
      else { sm.classList.add('mic'); sm.textContent='🎤'; }
    }

    function open(){
      if(!me()) return alert('Login dulu.');
      addC('dkc-ov','active');
      if(view==='room'&&openWith) drawRoom(openWith);
      else { view='list'; drawList(); }
    }
    function back(){
      if(view==='room'){ openWith=null; view='list'; drawList(); }
      else remC('dkc-ov','active');
    }

    function drawList(){
      view='list'; openWith=null;
      var u=me(); if(!u) return;
      setText('dkc-tt','Chats');
      var sub=id('dkc-sub'); if(sub) sub.textContent='Wallet ID: '+u;
      var avh=id('dkc-avh'); if(avh) avh.innerHTML='💬';
      setDisp('dkc-ib','none');

      var cs=getChats(); var arr=[];
      Object.keys(cs).forEach(function(k){
        var c=cs[k];
        if(!c.users||c.users.indexOf(u)<0) return;
        var p=null; c.users.forEach(function(x){ if(x!==u) p=x; });
        if(!p) return;
        arr.push({p:p,last:c.messages[c.messages.length-1]||null});
      });
      arr.sort(function(a,b){ return ((b.last&&b.last.ts)||0)-((a.last&&a.last.ts)||0); });

      var body=id('dkc-body'); if(!body) return;
      body.innerHTML='';

      if(!arr.length){
        body.innerHTML='<div class="dkc-empty"><div class="dkc-ei">💬</div><div>Belum ada chat</div>'
          +'<button class="dkc-eb" id="dkc-eb">Mulai Chat Baru</button></div>';
        id('dkc-eb').onclick=openDlg; return;
      }
      var reads=getReads();
      arr.forEach(function(it){
        var lr=reads[u+'|'+cKey(u,it.p)]||0;
        var unreadIt=0;
        var ch=cs[cKey(u,it.p)];
        if(ch) ch.messages.forEach(function(m){ if(m.from!==u&&m.ts>lr) unreadIt++; });
        var prev;
        if(!it.last) prev='Mulai...';
        else if(it.last.type==='voice') prev='🎤 Pesan suara';
        else if(it.last.type==='image') prev='🖼️ Foto';
        else if(it.last.type==='location') prev='📍 Lokasi';
        else if(it.last.type==='file') prev=(it.last.folder||'')+(it.last.name||'File');
        else prev=it.last.text;
        if(it.last&&it.last.from===u) prev='✓ '+prev;

        var d=document.createElement('div');
        d.className='dkc-it';
        d.innerHTML=''
          +'<div class="dkc-av">'+esc(it.p.charAt(0).toUpperCase())+'</div>'
          +'<div class="dkc-ii">'
          +  '<div class="dkc-in">'+esc(it.p)+'</div>'
          +  '<div class="dkc-il">'+esc(prev.slice(0,60))+'</div>'
          +'</div>'
          +'<div class="dkc-im"><div class="dkc-id">'+(it.last?t(it.last.ts):'')+'</div>'
          +(unreadIt>0?'<div class="dkc-dot" style="margin-top:4px">'+(unreadIt>99?'99+':unreadIt)+'</div>':'')
          +'</div>';
        d.onclick=(function(p){ return function(){ openRoom(p); }; })(it.p);
        body.appendChild(d);
      });
    }

    function openDlg(){
      id('dkc-nwid').value=''; setText('dkc-nwst','');
      addC('dkc-dlg','active');
      setTimeout(function(){ id('dkc-nwid').focus(); },100);
    }
    function startNew(){
      var u=me(); var v=id('dkc-nwid').value.trim(); var st=id('dkc-nwst');
      if(!v){ st.style.color='#EF4444'; st.textContent='Isi ID.'; return; }
      if(v===u){ st.style.color='#EF4444'; st.textContent='Tidak bisa chat diri sendiri.'; return; }
      if(!userOK(v)){ st.style.color='#EF4444'; st.textContent='✕ Tidak ditemukan.'; return; }
      st.style.color='#25D366'; st.textContent='✓ Membuka...';
      setTimeout(function(){ remC('dkc-dlg','active'); openRoom(v); },300);
    }

    function openRoom(p){ openWith=p; view='room'; markRead(p); drawRoom(p); }

    function drawRoom(p){
      var u=me(); if(!u) return;
      var k=cKey(u,p);
      var cs=getChats();
      if(!cs[k]) cs[k]={users:[u,p].sort(),messages:[]};
      saveChats(cs);

      setText('dkc-tt',p);
      var sub=id('dkc-sub'); if(sub) sub.textContent='online';
      var avh=id('dkc-avh'); if(avh) avh.textContent=p.charAt(0).toUpperCase();
      setDisp('dkc-ib','flex');
      updateSendBtn();

      var body=id('dkc-body'); if(!body) return;
      body.innerHTML='';

      if(!cs[k].messages.length){
        body.innerHTML='<div class="dkc-empty"><div class="dkc-ei">👋</div><div>Mulai chat dengan <b>'+esc(p)+'</b></div></div>';
        return;
      }

      var lastDay='';
      cs[k].messages.forEach(function(m){
        var dd=new Date(m.ts).toDateString();
        if(dd!==lastDay){
          lastDay=dd;
          var sp=document.createElement('div');
          sp.className='dkc-ds';
          sp.innerHTML='<span>'+dayLbl(m.ts)+'</span>';
          body.appendChild(sp);
        }
        var row=document.createElement('div');
        var isMe=m.from===u;
        row.className='dkc-mr '+(isMe?'m':'t');
        var tick=isMe?' ✓✓':'';

        if(m.type==='voice'){
          var aid='dkc-au-'+m.id;
          row.innerHTML=''
            +'<div class="dkc-mb" style="padding:8px 12px">'
            +  '<div class="dkc-vo">'
            +    '<button class="dkc-pl" data-a="'+aid+'" data-f="dkc-wf-'+m.id+'">▶</button>'
            +    '<div class="dkc-wv"><div class="dkc-wb"><div class="dkc-wf" id="dkc-wf-'+m.id+'"></div></div></div>'
            +    '<span class="dkc-dr">'+durMs(m.duration||0)+'</span>'
            +  '</div>'
            +  '<span class="dkc-mt">'+t(m.ts)+tick+'</span>'
            +'</div>'
            +'<audio id="'+aid+'" preload="none" src="'+m.audio+'"></audio>';
        } else if(m.type==='image'){
          row.innerHTML=''
            +'<div class="dkc-mb dkc-img-b">'
            +  '<div class="dkc-imgw" data-name="'+esc(m.name||'gambar.jpg')+'">'
            +    '<img src="'+m.image+'" alt="gambar">'
            +    '<button class="dkc-imgd" title="Unduh">⬇</button>'
            +  '</div>'
            +  '<div style="padding:2px 6px 2px 4px;line-height:1"><span class="dkc-mt" style="float:none;margin-left:0;transform:none;display:block;text-align:right">'+t(m.ts)+tick+'</span></div>'
            +'</div>';
        } else if(m.type==='file'){
          var ic=fileIcon(m.name,m.mime);
          row.innerHTML=''
            +'<div class="dkc-mb dkc-file-b">'
            +  '<div class="dkc-fi">'+ic+'</div>'
            +  '<div class="dkc-fd">'
            +    '<div class="dkc-fn">'+esc(m.name||'file')+'</div>'
            +    '<div class="dkc-fs">'+fmtSize(m.size||0)+' • '+(m.mime||'file')+'</div>'
            +  '</div>'
            +  '<button class="dkc-fdl" data-fid="'+m.id+'" title="Unduh">⬇</button>'
            +  '<span class="dkc-mt" style="position:absolute;bottom:2px;right:8px">'+t(m.ts)+tick+'</span>'
            +'</div>';
        } else if(m.type==='location'){
          var gmap='https://www.google.com/maps?q='+m.lat+','+m.lng;
          row.innerHTML=''
            +'<div class="dkc-mb dkc-loc-b">'
            +  '<div class="dkc-loc-map" data-lat="'+m.lat+'" data-lng="'+m.lng+'">'
            +    '<div class="dkc-loc-shadow" style="top:calc(50% + 3px)"></div>'
            +    '<div class="dkc-loc-pin">'
            +      '<div class="dkc-loc-pin-c"><span class="dkc-loc-arrow">➤</span></div>'
            +    '</div>'
            +  '</div>'
            +  '<div class="dkc-loc-info">'
            +    '<div class="dkc-loc-txt">'
            +      '<b>📍 Lokasi Saya</b>'
            +      '<span>'+m.lat.toFixed(5)+', '+m.lng.toFixed(5)+'</span>'
            +    '</div>'
            +    '<div class="dkc-loc-badge">Buka Peta</div>'
            +  '</div>'
            +  '<div style="padding:2px 6px 0;line-height:1"><span class="dkc-mt" style="float:none;margin-left:0;transform:none;display:block;text-align:right">'+t(m.ts)+tick+'</span></div>'
            +'</div>';
        } else {
          row.innerHTML=''
            +'<div class="dkc-mb">'
            +  esc(m.text).replace(/\n/g,'<br>')
            +  '<span class="dkc-mt">'+t(m.ts)+tick+'</span>'
            +'</div>';
        }
        body.appendChild(row);
      });

      // Bind audio
      body.querySelectorAll('.dkc-pl').forEach(function(btn){
        btn.onclick=function(){
          var au=id(this.getAttribute('data-a'));
          var fl=id(this.getAttribute('data-f'));
          if(!au) return;
          if(au.paused){
            document.querySelectorAll('audio').forEach(function(a){ if(a!==au){ a.pause(); a.currentTime=0; } });
            au.play(); this.textContent='❚❚';
          } else { au.pause(); this.textContent='▶'; }
          var self=this;
          au.onended=function(){ au.currentTime=0; self.textContent='▶'; if(fl) fl.style.width='0%'; };
          au.ontimeupdate=function(){ if(fl&&au.duration) fl.style.width=((au.currentTime/au.duration)*100)+'%'; };
        };
      });

      // Bind images
      body.querySelectorAll('.dkc-imgw').forEach(function(w){
        var img=w.querySelector('img');
        var dl=w.querySelector('.dkc-imgd');
        var name=w.getAttribute('data-name')||'gambar.jpg';
        if(img) img.onclick=function(){ showImg(img.src,name); };
        if(dl) dl.onclick=function(ev){ ev.stopPropagation(); downloadSrc(img.src,name); };
      });

      // Bind file download
      body.querySelectorAll('.dkc-fdl').forEach(function(b){
        b.onclick=function(ev){
          ev.stopPropagation();
          var fid=this.getAttribute('data-fid');
          var cs2=getChats();
          var msg=null;
          Object.keys(cs2).forEach(function(k2){
            cs2[k2].messages.forEach(function(m2){ if(m2.id===fid) msg=m2; });
          });
          if(msg&&msg.data) downloadSrc(msg.data, msg.name||'file');
        };
      });

      // Bind location (klik → Google Maps)
      body.querySelectorAll('.dkc-loc-map').forEach(function(el){
        el.onclick=function(){
          var lat=this.getAttribute('data-lat');
          var lng=this.getAttribute('data-lng');
          var url='https://www.google.com/maps?q='+lat+','+lng;
          window.open(url,'_blank','noopener');
        };
      });

      setTimeout(function(){ body.scrollTop=body.scrollHeight; },50);
      markRead(p);
    }

    function pushMsg(msg){
      var u=me(); if(!u||!openWith) return;
      var k=cKey(u,openWith);
      var cs=getChats();
      if(!cs[k]) cs[k]={users:[u,openWith].sort(),messages:[]};
      var base={id:'M'+Date.now()+Math.random().toString(36).slice(2,5),from:u,ts:Date.now()};
      Object.keys(msg).forEach(function(kk){ base[kk]=msg[kk]; });
      cs[k].messages.push(base);
      saveChats(cs);
      return base;
    }

    function send(){
      var i=id('dkc-inp'); if(!i) return;
      var v=i.value.trim(); if(!v) return;
      pushMsg({type:'text',text:v});
      i.value=''; i.style.height='auto';
      updateSendBtn();
      drawRoom(openWith);
      notif();
    }

    // ====== GAMBAR ======
    function sendImgFile(e){
      var f=e.target.files&&e.target.files[0];
      if(!f) return;
      e.target.value='';
      if(!/^image\//.test(f.type)){ alert('Hanya bisa kirim file gambar.'); return; }
      if(f.size>15*1024*1024){ alert('Maksimal 15MB.'); return; }
      if(!openWith){ alert('Buka chat dulu.'); return; }
      var sm=id('dkc-sm'); var old=sm.textContent; sm.textContent='⏳'; sm.disabled=true;
      compressImg(f,1280,0.72).then(function(d){
        if(d.length>1500000) return compressImg(f,900,0.55);
        return d;
      }).then(function(d){
        if(d.length>1500000) throw new Error('Gambar terlalu besar.');
        pushMsg({type:'image',image:d,name:f.name||('gambar_'+Date.now()+'.jpg')});
        if(openWith) drawRoom(openWith);
        notif();
      }).catch(function(err){ alert('Gagal kirim gambar: '+(err.message||err));
      }).then(function(){ sm.textContent=old; sm.disabled=false; updateSendBtn(); });
    }

    function compressImg(file,maxW,quality){
      return new Promise(function(resolve,reject){
        var fr=new FileReader();
        fr.onerror=function(){ reject(new Error('Gagal baca file')); };
        fr.onload=function(){
          var img=new Image();
          img.onerror=function(){ reject(new Error('Format tidak didukung')); };
          img.onload=function(){
            var w=img.width,h=img.height;
            if(w>maxW){ h=Math.round(h*maxW/w); w=maxW; }
            var c=document.createElement('canvas');
            c.width=w; c.height=h;
            var ctx=c.getContext('2d');
            ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
            ctx.drawImage(img,0,0,w,h);
            try{ resolve(c.toDataURL('image/jpeg',quality)); }catch(e){ reject(e); }
          };
          img.src=fr.result;
        };
        fr.readAsDataURL(file);
      });
    }

    function showImg(src,name){
      var img=id('dkc-vwi'); if(!img) return;
      img.src=src;
      var lbl=id('dkc-vwt'); if(lbl) lbl.textContent=name||'gambar.jpg';
      var d=id('dkc-vwd'); if(d) d.setAttribute('data-name',name||'gambar.jpg');
      addC('dkc-vw','active');
    }

    function downloadSrc(src,name){
      if(!src) return;
      try{
        var a=document.createElement('a');
        a.href=src; a.download=name||('file_'+Date.now());
        a.rel='noopener';
        document.body.appendChild(a); a.click();
        setTimeout(function(){ document.body.removeChild(a); },100);
      }catch(e){ alert('Gagal unduh: '+e.message); }
    }

    function downloadViewerImg(){
      var img=id('dkc-vwi'); if(!img||!img.src) return;
      var d=id('dkc-vwd');
      var name=(d&&d.getAttribute('data-name'))||'gambar.jpg';
      downloadSrc(img.src,name);
    }

    // ====== FILE / DOKUMEN ======
    function sendFile(e){
      var f=e.target.files&&e.target.files[0];
      if(!f) return;
      e.target.value='';
      if(!openWith){ alert('Buka chat dulu.'); return; }
      if(f.size>2*1024*1024){ alert('File terlalu besar (maks 2 MB karena penyimpanan browser terbatas).'); return; }
      var fr=new FileReader();
      fr.onloadend=function(){
        pushMsg({type:'file',data:fr.result,name:f.name,size:f.size,mime:f.type||'file'});
        if(openWith) drawRoom(openWith);
        notif();
      };
      fr.readAsDataURL(f);
    }

    // ====== FOLDER ======
    function sendFolder(e){
      var files=e.target.files;
      if(!files||!files.length) return;
      e.target.value='';
      if(!openWith){ alert('Buka chat dulu.'); return; }
      var list=Array.prototype.slice.call(files);
      // Filter & validasi total
      var total=0;
      list.forEach(function(f){ total+=f.size; });
      if(total>3*1024*1024){ alert('Total folder terlalu besar (maks 3 MB). Coba folder kecil.'); return; }
      if(!confirm('Kirim '+list.length+' file dari folder?\nTotal: '+fmtSize(total))) return;
      var i=0;
      function next(){
        if(i>=list.length){ if(openWith) drawRoom(openWith); notif(); return; }
        var f=list[i++];
        if(f.size>1024*1024){ next(); return; } // skip file >1MB
        var fr=new FileReader();
        fr.onloadend=function(){
          pushMsg({type:'file',data:fr.result,name:f.name,size:f.size,
            mime:f.type||'file',folder:'📁 '+(f.webkitRelativePath||'')});
          next();
        };
        fr.readAsDataURL(f);
      }
      next();
    }

    // ====== LOKASI (Gojek-style) ======
    function shareLocation(){
      if(!openWith){ alert('Buka chat dulu.'); return; }
      if(!navigator.geolocation){ alert('Browser tidak support lokasi.'); return; }
      var sm=id('dkc-sm'); var old=sm.textContent; sm.textContent='⏳'; sm.disabled=true;
      navigator.geolocation.getCurrentPosition(function(pos){
        var lat=pos.coords.latitude, lng=pos.coords.longitude;
        pushMsg({type:'location',lat:lat,lng:lng});
        if(openWith) drawRoom(openWith);
        notif();
        sm.textContent=old; sm.disabled=false; updateSendBtn();
      }, function(err){
        alert('Gagal ambil lokasi: '+err.message+'\n\nPastikan izin lokasi diaktifkan.');
        sm.textContent=old; sm.disabled=false; updateSendBtn();
      }, { enableHighAccuracy:true, timeout:15000, maximumAge:0 });
    }

    // ====== VOICE ======
    function startRec(){
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) return alert('Browser tidak support voice.');
      recChunks=[];
      navigator.mediaDevices.getUserMedia({audio:true}).then(function(st){
        try{ recorder=new MediaRecorder(st); }catch(e){ return alert('MediaRecorder gagal: '+e.message); }
        recorder.ondataavailable=function(e){ if(e.data.size>0) recChunks.push(e.data); };
        recorder.onstop=onRecStop;
        recorder.start();
        recStart=Date.now();
        addC('dkc-rec','active');
        setText('dkc-rt','0:00');
        recInterval=setInterval(function(){
          setText('dkc-rt',durMs(Date.now()-recStart));
          if(Date.now()-recStart>=30000) stopRecSend();
        },200);
      }).catch(function(e){ alert('Mic gagal: '+e.message); });
    }
    function cancelRec(){
      if(recorder&&recorder.state!=='inactive'){
        recorder.onstop=null;
        try{ recorder.stop(); }catch(e){}
        if(recorder.stream) recorder.stream.getTracks().forEach(function(t){ t.stop(); });
      }
      cleanRec();
    }
    function stopRecSend(){
      if(recorder&&recorder.state!=='inactive') try{ recorder.stop(); }catch(e){}
    }
    function onRecStop(){
      var dur=Date.now()-recStart;
      if(recorder&&recorder.stream) recorder.stream.getTracks().forEach(function(t){ t.stop(); });
      if(dur<800){ cleanRec(); return alert('Terlalu pendek.'); }
      var blob=new Blob(recChunks,{type:recChunks[0]?recChunks[0].type:'audio/webm'});
      if(blob.size>500000){ cleanRec(); return alert('Voice terlalu besar.'); }
      var fr=new FileReader();
      fr.onloadend=function(){
        pushMsg({type:'voice',audio:fr.result,duration:dur});
        cleanRec();
        if(openWith) drawRoom(openWith);
        notif();
      };
      fr.readAsDataURL(blob);
    }
    function cleanRec(){
      if(recInterval){ clearInterval(recInterval); recInterval=null; }
      remC('dkc-rec','active');
      recorder=null; recChunks=[];
    }

    function notif(){
      var b=id('dk-chat-notif'); if(!b) return;
      var n=unread();
      if(n>0){ b.textContent=n>99?'99+':String(n); b.classList.add('show'); }
      else b.classList.remove('show');
    }

    window.dkChatOpen=open;
    window.dkChatDrawList=drawList;
    window.dkChatOpenRoom=openRoom;

    window.addEventListener('storage',function(e){
      try{
        if(e.key===CHAT_KEY||e.key===READ_KEY||e.key==='dk_session'){
          notif();
          if(hasC('dkc-ov','active')){
            if(view==='room'&&openWith) drawRoom(openWith);
            else drawList();
          }
        }
      }catch(_){}
    });

    function boot(){
      try{ console.log('[chat] boot'); css(); ui(); booted=true; notif(); console.log('[chat] OK'); }
      catch(e){ logErr(e.message,e.stack); }
    }
    function tryBoot(){ if(!document.body){ setTimeout(tryBoot,100); return; } boot(); }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tryBoot);
    else tryBoot();
    setInterval(function(){ try{ if(booted) notif(); }catch(_){} },1500);

  } catch(e){ logErr('outer: '+e.message,e.stack); }
})();
