/* ============================================================
   ZOVRYN — Operations Console Logic
   File Number reference · Last Modified By · Last Updated On
   ============================================================ */
(function(){
  'use strict';
  var D=window.GG_DATA, S=window.GG_STORE;
  var $=function(s,c){return (c||document).querySelector(s);};
  var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));};
  var el=function(t,cls,html){var e=document.createElement(t);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};

  var STAGES=['New Lead','Discussion Pending','Discussion Completed','Proposal Shared','Negotiation','Confirmed','Closed'];
  var USERS={ admin:{pass:'zovryn2026',role:'Admin'}, ops:{pass:'ops2026',role:'Operations Manager'} };

  var events=[]; var session=null; var calRef=new Date();

  function toast(m,k){var t=$('#toast');t.textContent=m;t.className='toast show '+(k||'');clearTimeout(t._t);t._t=setTimeout(function(){t.className='toast';},2400);}
  function cap(s){return (s==null?'':String(s)).toLowerCase().replace(/\b\w/g,function(c){return c.toUpperCase();});}
  function esc(s){return (s==null?'':String(s)).replace(/[<>&]/g,function(c){return{'<':'&lt;','>':'&gt;','&':'&amp;'}[c];});}
  function fmtTime(iso){ if(!iso) return '—'; try{ return new Date(iso).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}); }catch(e){ return iso; } }
  function actorRole(){ return session && session.role==='Operations Manager' ? 'Operations' : 'Admin'; }

  function timing(ev){
    var today=new Date(); today.setHours(0,0,0,0);
    var d=ev.eventDate?new Date(ev.eventDate):null;
    if(ev.status==='Closed') return 'past';
    if(!d) return 'new';
    if(d<today) return 'past';
    var isNew=(ev.status==='New Lead');
    return isNew?'new':'upcoming';
  }
  function badgeClass(status){ var i=STAGES.indexOf(status); if(i<=0)return 'new'; if(i>=5)return 'done'; return 'mid'; }
  function menuCount(ev){var n=0,m=ev.menu||{};Object.keys(m).forEach(function(c){n+=(m[c]||[]).length;});return n;}

  // ===== AUTH =====
  function login(){
    var u=$('#lgUser').value.trim().toLowerCase(), p=$('#lgPass').value;
    if(USERS[u] && USERS[u].pass===p){
      session={user:u,role:USERS[u].role};
      try{sessionStorage.setItem('zov_admin',JSON.stringify(session));}catch(e){}
      openConsole();
    } else { $('#lgErr').classList.add('show'); }
  }
  function openConsole(){
    $('#loginWrap').style.display='none'; $('#console').style.display='';
    $('#whoami').textContent=session.role;
    if(S.mode==='live'){var b=$('#aSync');b.className='sync-banner live';b.textContent='Connected to Google Sheets — data is live.';}
    load();
  }
  function logout(){ try{sessionStorage.removeItem('zov_admin');}catch(e){} location.reload(); }

  function load(){ S.all().then(function(list){ events=list||[]; renderAll(); }); }
  function renderAll(){ renderDash(); renderEvents(); renderCalendar(); renderAnalytics(); populateFilters(); }

  // ===== DASHBOARD =====
  function renderDash(){
    var today=new Date(); today.setHours(0,0,0,0);
    var counts={
      total:events.length,
      neu:events.filter(function(e){return e.status==='New Lead';}).length,
      upcoming:events.filter(function(e){return e.eventDate && new Date(e.eventDate)>=today && e.status!=='Closed';}).length,
      discuss:events.filter(function(e){return e.status==='Discussion Pending';}).length,
      proposal:events.filter(function(e){return e.status==='Proposal Shared';}).length,
      negotiation:events.filter(function(e){return e.status==='Negotiation';}).length,
      closed:events.filter(function(e){return e.status==='Closed';}).length
    };
    var cards=[['Total Events',counts.total,''],['New Leads',counts.neu,'g'],['Upcoming Events',counts.upcoming,'a'],['Discussion Pending',counts.discuss,'a'],['Proposal Shared',counts.proposal,''],['Negotiation',counts.negotiation,'a'],['Closed Events',counts.closed,'r']];
    $('#statCards').innerHTML=cards.map(function(c){return '<div class="stat '+c[2]+'"><div class="v">'+c[1]+'</div><div class="l">'+c[0]+'</div></div>';}).join('');
    var att=events.filter(function(e){return ['New Lead','Discussion Pending'].indexOf(e.status)>-1;})
      .sort(function(a,b){return new Date(b.createdAt||0)-new Date(a.createdAt||0);}).slice(0,6);
    var host=$('#attentionList');
    host.innerHTML = att.length ? '' : '<div class="empty-state"><div class="serif">All caught up</div><p class="small">No leads awaiting first action.</p></div>';
    att.forEach(function(e){ host.appendChild(eventCard(e)); });
  }

  // ===== EVENT CARD =====
  function eventCard(e){
    var c=el('div','ev-card '+timing(e));
    c.innerHTML=
      '<div class="r1"><div><div class="eid">File '+esc(e.fileNumber)+'</div><div class="cname">'+esc(cap(e.clientName))+'</div></div>'+
      '<span class="badge '+badgeClass(e.status)+'">'+esc(e.status)+'</span></div>'+
      '<div class="meta">'+
        '<span>📞 <b>'+esc(e.mobile||'—')+'</b></span>'+
        '<span>📅 <b>'+esc(e.eventDate||'—')+'</b></span>'+
        '<span>'+esc(cap(e.eventSlot||'—'))+'</span>'+
        '<span>👥 <b>'+esc(e.pax||'—')+'</b> pax</span>'+
        '<span>'+esc(cap(e.eventType||'—'))+'</span>'+
      '</div>'+
      '<div class="meta" style="margin-top:5px">'+
        '<span class="badge by">Modified by: '+esc(e.lastModifiedBy||'Client')+'</span>'+
        '<span>Updated: <b>'+esc(fmtTime(e.lastUpdatedOn||e.createdAt))+'</b></span>'+
      '</div>'+
      '<div class="ev-actions"><button class="btn sm btn-gold act-view">View</button><button class="btn sm btn-ghost act-edit">Edit Status</button></div>';
    c.querySelector('.act-view').onclick=function(ev){ev.stopPropagation();openDetail(e.fileNumber,false);};
    c.querySelector('.act-edit').onclick=function(ev){ev.stopPropagation();openDetail(e.fileNumber,true);};
    c.onclick=function(){openDetail(e.fileNumber,false);};
    return c;
  }

  // ===== EVENTS PAGE =====
  function populateFilters(){
    var sSel=$('#fStatus'); if(sSel.options.length<=1){ STAGES.forEach(function(s){sSel.appendChild(new Option(s,s));}); }
    var tSel=$('#fType'); if(tSel.options.length<=1){ D.eventTypes.forEach(function(t){tSel.appendChild(new Option(cap(t),t));}); }
  }
  function renderEvents(){
    var q=($('#fSearch').value||'').trim().toLowerCase();
    var st=$('#fStatus').value, ty=$('#fType').value, px=$('#fPax').value, dt=$('#fDate').value;
    var out=events.filter(function(e){
      if(st && e.status!==st) return false;
      if(ty && e.eventType!==ty) return false;
      if(dt && e.eventDate!==dt) return false;
      if(px){var r=px.split('-'),n=parseInt(e.pax||0,10); if(n<+r[0]||n>+r[1])return false;}
      if(q){var hay=((e.clientName||'')+' '+(e.mobile||'')+' '+(e.fileNumber||'')).toLowerCase(); if(hay.indexOf(q)<0)return false;}
      return true;
    }).sort(function(a,b){return new Date(b.lastUpdatedOn||b.createdAt||0)-new Date(a.lastUpdatedOn||a.createdAt||0);});
    var host=$('#eventList'); host.innerHTML='';
    if(!out.length){ host.innerHTML='<div class="empty-state"><div class="serif">No events found</div><p class="small">Try adjusting your filters, or share the client link to gather enquiries.</p></div>'; return; }
    out.forEach(function(e){host.appendChild(eventCard(e));});
  }

  // ===== DETAIL MODAL =====
  function openDetail(fileNumber, editMode){
    var e=events.filter(function(x){return String(x.fileNumber)===String(fileNumber);})[0]; if(!e)return;
    $('#mTitle').textContent='File '+e.fileNumber+' · '+cap(e.clientName);
    var body=$('#mBody'); body.innerHTML='';

    // meta strip
    var meta=el('div','detail-sec'); meta.style.padding='16px 20px';
    meta.innerHTML='<div class="kv"><span class="k">File Number</span><span class="v" style="color:var(--gold);font-family:var(--serif);font-size:1.1rem">'+esc(e.fileNumber)+'</span>'+
      '<span class="k">Last Modified By</span><span class="v">'+esc(e.lastModifiedBy||'Client')+'</span>'+
      '<span class="k">Last Updated On</span><span class="v" style="text-transform:none">'+esc(fmtTime(e.lastUpdatedOn||e.createdAt))+'</span>'+
      '<span class="k">Created On</span><span class="v" style="text-transform:none">'+esc(fmtTime(e.createdAt))+'</span></div>';
    body.appendChild(meta);

    // pipeline
    var pipe=el('div','detail-sec'); pipe.innerHTML='<h3>Status Pipeline</h3>';
    var pl=el('div','pipeline'); var cur=STAGES.indexOf(e.status);
    STAGES.forEach(function(s,i){
      var cls = i===cur?'active':(i<cur?'done':'');
      var b=el('div','pstage '+cls, (i<cur?'✓ ':'')+s);
      b.onclick=function(){ S.update(e.fileNumber,{status:s},actorRole()).then(function(){ e.status=s; e.lastModifiedBy=actorRole(); e.lastUpdatedOn=new Date().toISOString(); renderAll(); openDetail(e.fileNumber,editMode); toast('Status → '+s,'ok'); }); };
      pl.appendChild(b);
    });
    pipe.appendChild(pl); body.appendChild(pipe);

    function kvsec(title, rows){
      var d=el('div','detail-sec'); var h='<h3>'+title+'</h3><div class="kv">';
      rows.forEach(function(r){ if(r[1]) h+='<span class="k">'+r[0]+'</span><span class="v">'+esc(r[1])+'</span>'; });
      d.innerHTML=h+'</div>'; return d;
    }
    body.appendChild(kvsec('Client Info',[['Name',cap(e.clientName)],['Mobile',e.mobile]]));
    body.appendChild(kvsec('Event Info',[
      ['Type',cap(e.eventType)+(e.eventTypeOther?' ('+e.eventTypeOther+')':'')],['Date',e.eventDate],['Slot',cap(e.eventSlot)],
      ['Time',e.eventTime],['Occasion',e.occasion],['PAX',e.pax],['Dietary',cap(e.dietary)],
      ['Location',cap(e.location)+(e.locationOther?' ('+e.locationOther+')':'')],['Venue',e.venue]
    ]));
    if((e.services&&e.services.length)||(e.addons&&e.addons.length)){
      var sv=el('div','detail-sec'); sv.innerHTML='<h3>Services & Add-ons</h3>';
      if(e.services&&e.services.length) sv.innerHTML+='<div class="tag-list">'+e.services.map(function(s){return '<span>'+esc(cap(s))+'</span>';}).join('')+'</div>';
      if(e.addons&&e.addons.length) sv.innerHTML+='<div class="mc-h" style="margin-top:8px">Add-ons</div><div class="tag-list">'+e.addons.map(function(s){return '<span>'+esc(cap(s))+'</span>';}).join('')+'</div>';
      body.appendChild(sv);
    }
    var mn=el('div','detail-sec'); mn.innerHTML='<h3>Menu Selection ('+menuCount(e)+')</h3>';
    var m=e.menu||{}, any=false;
    D.menuOrder.forEach(function(c){ if(m[c]&&m[c].length){any=true; mn.innerHTML+='<div class="menu-detail-cat"><div class="mc-h">'+c.toLowerCase()+' ('+m[c].length+')</div><div class="tag-list">'+m[c].map(function(i){return '<span>'+esc(i.toLowerCase())+'</span>';}).join('')+'</div></div>';} });
    if(!any) mn.innerHTML+='<p class="small muted">No dishes selected.</p>';
    if(e.customMenu) mn.innerHTML+='<div class="mc-h" style="margin-top:8px">Custom Request</div><p class="small">'+esc(e.customMenu)+'</p>';
    body.appendChild(mn);

    body.appendChild(kvsec('Additional Notes',[['Notes',e.notes||'—']]));
    body.appendChild(kvsec('Discussion Preferences',[['Preferred',(e.discDate||'')+' '+(e.discTime||'')],['Alternate',(e.discAltDate||e.discAltTime)?((e.discAltDate||'')+' '+(e.discAltTime||'')):'']]));

    var iN=e.internalNotes||{};
    var ns=el('div','detail-sec'); ns.innerHTML='<h3>Internal Notes</h3>';
    [['discussion','Discussion Notes'],['proposal','Proposal Notes'],['followup','Follow-up Notes']].forEach(function(p){
      var f=el('div','field'); f.innerHTML='<label>'+p[1]+'</label>';
      var ta=el('textarea'); ta.value=iN[p[0]]||''; ta.style.minHeight='72px'; ta.dataset.key=p[0]; f.appendChild(ta); ns.appendChild(f);
    });
    var saveBtn=el('button','btn btn-gold','Save Internal Notes');
    saveBtn.onclick=function(){ var patch={}; $$('textarea',ns).forEach(function(ta){patch[ta.dataset.key]=ta.value;}); S.update(e.fileNumber,{internalNotes:patch},actorRole()).then(function(){ e.internalNotes=patch; e.lastModifiedBy=actorRole(); e.lastUpdatedOn=new Date().toISOString(); toast('Notes saved','ok'); renderEvents(); }); };
    ns.appendChild(saveBtn); body.appendChild(ns);

    var act=el('div','btn-row'); act.style.marginTop='6px';
    var pdfB=el('button','btn btn-gold','⬇ Download PDF'); pdfB.onclick=function(){window.GG_PDF(e);};
    var waB=el('button','btn btn-wa','WhatsApp Client');
    waB.onclick=function(){window.open('https://wa.me/'+(e.mobile||'').replace(/\D/g,'')+'?text='+encodeURIComponent('Hello '+cap(e.clientName)+', warm greetings from ZOVRYN regarding your enquiry — File '+e.fileNumber+'.'),'_blank','noopener');};
    act.appendChild(pdfB); act.appendChild(waB); body.appendChild(act);

    $('#detailModal').classList.add('show'); document.body.classList.add('no-scroll');
    if(editMode) pipe.scrollIntoView({behavior:'smooth'});
  }
  function closeModal(){ $('#detailModal').classList.remove('show'); document.body.classList.remove('no-scroll'); }

  // ===== CALENDAR =====
  function renderCalendar(){
    var dows=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    $('#calDows').innerHTML=dows.map(function(d){return '<div class="cal-dow">'+d+'</div>';}).join('');
    var y=calRef.getFullYear(), m=calRef.getMonth();
    $('#calTitle').textContent=calRef.toLocaleString('en-US',{month:'long',year:'numeric'});
    var first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate();
    var todayStr=new Date().toISOString().slice(0,10);
    var byDate={}; events.forEach(function(e){ if(e.eventDate){ (byDate[e.eventDate]=byDate[e.eventDate]||[]).push(e); } });
    var grid=$('#calGrid'); grid.innerHTML='';
    for(var i=0;i<first;i++) grid.appendChild(el('div','cal-cell empty'));
    for(var d=1;d<=days;d++){
      var ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      var cell=el('div','cal-cell'+(ds===todayStr?' today':'')); cell.innerHTML='<div class="cd">'+d+'</div>';
      var evs=byDate[ds]||[];
      if(evs.length){ var e0=evs[0]; var chip=el('div','cev '+timing(e0), esc(cap(e0.clientName).split(' ')[0])+(evs.length>1?' +'+(evs.length-1):'')); chip.onclick=function(id){return function(ev){ev.stopPropagation();openDetail(id,false);};}(e0.fileNumber); cell.appendChild(chip); }
      grid.appendChild(cell);
    }
  }

  // ===== ANALYTICS =====
  function renderAnalytics(){
    var total=events.length;
    var confirmed=events.filter(function(e){return e.status==='Confirmed';}).length;
    var today=new Date();today.setHours(0,0,0,0);
    var upcoming=events.filter(function(e){return e.eventDate&&new Date(e.eventDate)>=today&&e.status!=='Closed';}).length;
    var conv= total? Math.round((confirmed/total)*100):0;
    var proj=events.filter(function(e){return ['Proposal Shared','Negotiation','Confirmed'].indexOf(e.status)>-1;}).reduce(function(s,e){return s+(parseInt(e.pax||0,10)*1550);},0);
    $('#anStats').innerHTML=[['Total Leads',total,''],['Conversion',conv+'%','g'],['Upcoming',upcoming,'a'],['Revenue Projection','₹'+(proj/100000).toFixed(1)+'L','']].map(function(c){return '<div class="stat '+c[2]+'"><div class="v">'+c[1]+'</div><div class="l">'+c[0]+'</div></div>';}).join('');
    barChart('#anByType', tally(events,function(e){return cap(e.eventType||'—');}));
    barChart('#anByStage', STAGES.map(function(s){return [s, events.filter(function(e){return e.status===s;}).length];}).filter(function(r){return r[1];}));
    var catTally={}; events.forEach(function(e){var m=e.menu||{};Object.keys(m).forEach(function(c){catTally[c]=(catTally[c]||0)+m[c].length;});});
    barChart('#anByCat', Object.keys(catTally).map(function(c){return [c.toLowerCase(),catTally[c]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,8));
    var slotTally={}; events.forEach(function(e){var s=cap(e.eventSlot||'—');slotTally[s]=(slotTally[s]||0)+parseInt(e.pax||0,10);});
    barChart('#anBySlot', Object.keys(slotTally).map(function(s){return [s,slotTally[s]];}));
  }
  function tally(arr,fn){var o={};arr.forEach(function(x){var k=fn(x);o[k]=(o[k]||0)+1;});return Object.keys(o).map(function(k){return [k,o[k]];}).sort(function(a,b){return b[1]-a[1];});}
  function barChart(sel,rows){ var host=$(sel); if(!rows.length){host.innerHTML='<p class="small muted">No data yet.</p>';return;} var max=Math.max.apply(null,rows.map(function(r){return r[1];}))||1; host.innerHTML=rows.map(function(r){return '<div class="bar-row"><span class="bl">'+esc(r[0])+'</span><span class="bt"><span style="width:'+Math.round((r[1]/max)*100)+'%"></span></span><span class="bv">'+r[1]+'</span></div>';}).join(''); }

  // ===== EXPORT =====
  function exportExcel(){
    if(!window.XLSX){toast('Export library loading…','err');return;}
    var wb=XLSX.utils.book_new();
    var s1=events.map(function(e){
      var menuStr=Object.keys(e.menu||{}).map(function(c){return c+': '+e.menu[c].join(', ');}).join(' | ');
      return {'File Number':e.fileNumber,'Client Name':e.clientName,'Mobile':e.mobile,'Event Date':e.eventDate,'Event Slot':e.eventSlot,'Event Time':e.eventTime,'Event Type':e.eventType,'Occasion':e.occasion,'PAX':e.pax,'Dietary':e.dietary,'Location':e.location,'Venue':e.venue,'Services':(e.services||[]).join(', '),'Add-ons':(e.addons||[]).join(', '),'Menu Selection':menuStr,'Custom Menu':e.customMenu||'','Notes':e.notes||'','Discussion Preference':(e.discDate||'')+' '+(e.discTime||'')+(e.discAltDate?(' / alt '+e.discAltDate+' '+(e.discAltTime||'')):''),'Status':e.status,'Last Modified By':e.lastModifiedBy||'Client','Last Updated On':e.lastUpdatedOn||e.createdAt,'Created On':e.createdAt};
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s1.length?s1:[{'File Number':''}]),'Event Submissions');
    var s2=events.map(function(e){var n=e.internalNotes||{};return {'File Number':e.fileNumber,'Client':e.clientName,'Discussion Date':(e.discDate||'')+' '+(e.discTime||''),'Discussion Notes':n.discussion||'','Follow-up Actions':n.followup||'','Proposal Status':n.proposal?'Notes added':(e.status==='Proposal Shared'?'Shared':'Pending'),'Last Modified By':e.lastModifiedBy||'Client','Last Updated On':e.lastUpdatedOn||e.createdAt};});
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s2.length?s2:[{'File Number':''}]),'Discussion Tracker');
    var total=events.length, confirmed=events.filter(function(e){return e.status==='Confirmed';}).length;
    var today=new Date();today.setHours(0,0,0,0);
    var upcoming=events.filter(function(e){return e.eventDate&&new Date(e.eventDate)>=today&&e.status!=='Closed';}).length;
    var proj=events.filter(function(e){return ['Proposal Shared','Negotiation','Confirmed'].indexOf(e.status)>-1;}).reduce(function(s,e){return s+parseInt(e.pax||0,10)*1550;},0);
    var s3=[{'Metric':'Total Leads','Value':total},{'Metric':'Conversion %','Value':(total?Math.round(confirmed/total*100):0)+'%'},{'Metric':'Upcoming Events','Value':upcoming},{'Metric':'Revenue Projection (₹)','Value':proj}];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s3),'Analytics Dashboard');
    XLSX.writeFile(wb,'ZOVRYN-Events-'+new Date().toISOString().slice(0,10)+'.xlsx');
    toast('Exported '+events.length+' events','ok');
  }

  // ===== WIRE UP =====
  function init(){
    try{var s=sessionStorage.getItem('zov_admin'); if(s){session=JSON.parse(s);}}catch(e){}
    if(session) openConsole();
    $('#lgBtn').onclick=login;
    $('#lgPass').addEventListener('keydown',function(e){if(e.key==='Enter')login();});
    $('#logoutBtn').onclick=logout;
    $('#refreshBtn').onclick=function(){load();toast('Refreshed','ok');};
    $$('.admin-nav button').forEach(function(b){ b.onclick=function(){ $$('.admin-nav button').forEach(function(x){x.classList.remove('active');}); b.classList.add('active'); $$('.admin-page').forEach(function(p){p.classList.remove('active');}); $('#page-'+b.dataset.page).classList.add('active'); }; });
    ['fSearch','fStatus','fType','fPax','fDate'].forEach(function(id){ var e=$('#'+id); e.addEventListener('input',renderEvents); e.addEventListener('change',renderEvents); });
    $('#exportBtn').onclick=exportExcel;
    $('#mClose').onclick=closeModal;
    $('#detailModal').addEventListener('click',function(e){if(e.target===this)closeModal();});
    $('#calPrev').onclick=function(){calRef.setMonth(calRef.getMonth()-1);renderCalendar();};
    $('#calNext').onclick=function(){calRef.setMonth(calRef.getMonth()+1);renderCalendar();};
    if(S.mode==='live') setInterval(load, 30000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
