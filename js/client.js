/* ============================================================
   ZOVRYN — Client Portal Logic
   New Customer + Existing Client flows, 5-digit File Number,
   view/edit/update. All fields & options come from
   window.GG_DATA (Excel-derived — single source of truth).
   ============================================================ */
(function(){
  'use strict';
  var D = window.GG_DATA;
  var $ = function(s,ctx){return (ctx||document).querySelector(s);};
  var $$ = function(s,ctx){return Array.prototype.slice.call((ctx||document).querySelectorAll(s));};
  var el = function(t,cls,html){var e=document.createElement(t); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e;};

  function blankState(){
    return {
      clientName:'', mobile:'',
      eventType:'', eventTypeOther:'', eventDate:'', eventSlot:'', eventTime:'',
      occasion:'', pax:'', dietary:'', location:'', locationOther:'', venue:'',
      services:[], addons:[],
      menu:{}, customMenu:'',
      notes:'',
      discDate:'', discTime:'', discAltDate:'', discAltTime:''
    };
  }
  var state = blankState();
  var editing = false;
  var currentFileNumber = null;
  var lastRecord = null;

  var STEPS = [
    {id:'entry',   name:'Your Details'},
    {id:'event',   name:'Event Details'},
    {id:'services',name:'Services & Experiences'},
    {id:'menu',    name:'Curate Your Menu'},
    {id:'notes',   name:'Additional Notes'},
    {id:'discuss', name:'Discussion Round'},
    {id:'review',  name:'Review & Submit'}
  ];
  var current = 0;

  // ---- Embedded mode (admin/ops opens this form inside the console) ----
  var Q = new URLSearchParams(location.search);
  var EMBED = Q.has('embed') || Q.has('by');
  // Trust admin/ops params ONLY when this page is embedded inside the
  // authenticated Operations Console (same-origin parent with a valid session).
  // This prevents anyone from editing records via a crafted public URL.
  function adminAuthorized(){
    try{
      if(window.parent===window) return false;
      var s=window.parent.sessionStorage.getItem('zov_admin');
      if(!s) return false;
      var o=JSON.parse(s); return !!(o && o.role);
    }catch(e){ return false; }
  }
  var ADMIN_OK = adminAuthorized();
  var ACTOR = (function(){ if(!ADMIN_OK) return 'Client'; var b=(Q.get('by')||'').toLowerCase(); if(b==='admin')return 'Admin'; if(b==='ops'||b==='operations')return 'Operations'; return 'Client'; })();
  // Public clients must complete every section; admin/ops create+edit stays flexible.
  var STRICT = !ADMIN_OK;
  function postParent(type, extra){ if(EMBED && window.parent && window.parent!==window){ try{ window.parent.postMessage(Object.assign({type:type},extra||{}),'*'); }catch(e){} } }

  function toast(msg, kind){
    var t=$('#toast'); t.textContent=msg; t.className='toast show '+(kind||'');
    clearTimeout(t._t); t._t=setTimeout(function(){t.className='toast';},2600);
  }

  function optCards(items, selected, multi, onChange){
    var wrap = el('div','opt-grid');
    items.forEach(function(it){
      var active = multi ? selected.indexOf(it)>-1 : selected===it;
      var o = el('div','opt'+(active?' active':''));
      o.innerHTML = '<span class="tick"></span><span>'+it.toLowerCase()+'</span>';
      o.onclick = function(){
        if(multi){ var i=selected.indexOf(it); if(i>-1) selected.splice(i,1); else selected.push(it); }
        else { selected = it; }
        onChange(selected);
        $$('.opt',wrap).forEach(function(x,idx){
          var val=items[idx]; var act = multi ? selected.indexOf(val)>-1 : selected===val;
          x.classList.toggle('active',act);
        });
      };
      wrap.appendChild(o);
    });
    return wrap;
  }
  function field(labelHtml, node, hint){
    var f = el('div','field');
    f.appendChild(el('label',null,labelHtml));
    if(hint){ var h=el('div','small muted'); h.style.marginBottom='8px'; h.textContent=hint; f.appendChild(h);}
    f.appendChild(node);
    return f;
  }
  function input(type, val, ph, id){ var i=el('input'); i.type=type||'text'; i.value=val||''; if(ph)i.placeholder=ph; if(id)i.id=id; return i; }
  function errNode(){ return el('div','err-msg','Please complete this field.'); }

  // ================= STEP RENDERERS =================
  function renderStep(){
    var host = $('#formSteps'); host.innerHTML='';
    var s = STEPS[current];
    var body = el('div','step-body');
    ({entry:rEntry,event:rEvent,services:rServices,menu:rMenu,notes:rNotes,discuss:rDiscuss,review:rReview}[s.id])(body);
    host.appendChild(body);
    $('#stepName').textContent = s.name;
    $('#stepCount').textContent = 'Step '+(current+1)+' of '+STEPS.length;
    $('#progressBar').style.width = Math.round(((current+1)/STEPS.length)*100)+'%';
    $('#backBtn').style.display = current===0 ? 'none' : '';
    $('#nextBtn').textContent = current===STEPS.length-1 ? (editing?'Update Submission ✦':'Submit Enquiry ✦') : 'Continue →';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function rEntry(b){
    b.appendChild(intro('Let\'s begin','Tell us who we have the pleasure of curating for.'));
    var name = input('text', state.clientName, 'e.g. Aanya Kapoor');
    name.oninput=function(){state.clientName=this.value;};
    var fn = field('Client Name <span class="req">*</span>', name); fn.appendChild(errNode()); b.appendChild(fn);
    var mob = input('tel', state.mobile, '+91 98XXXXXXXX'); mob.setAttribute('inputmode','numeric');
    mob.oninput=function(){state.mobile=this.value;};
    var fm = field('Mobile Number <span class="req">*</span>', mob); fm.appendChild(errNode()); b.appendChild(fm);
  }

  function rEvent(b){
    b.appendChild(intro('Event Details','Share the essentials so we can shape the occasion.'));
    var etWrap = el('div');
    etWrap.appendChild(optCards(D.eventTypes, state.eventType, false, function(v){
      state.eventType=v; otherBox.style.display = /others/i.test(v)?'block':'none';
    }));
    var otherBox = input('text', state.eventTypeOther, 'Please specify'); otherBox.style.display=/others/i.test(state.eventType)?'block':'none'; otherBox.style.marginTop='10px';
    otherBox.oninput=function(){state.eventTypeOther=this.value;}; etWrap.appendChild(otherBox);
    var fe=field('Event Type <span class="req">*</span>', etWrap); fe.appendChild(errNode()); b.appendChild(fe);

    var dt=input('date', state.eventDate); dt.oninput=function(){state.eventDate=this.value;};
    var fd=field('Date of Event <span class="req">*</span>', dt); fd.appendChild(errNode()); b.appendChild(fd);

    var slotChips=el('div','chips');
    D.eventTimes.forEach(function(t){
      var c=el('div','chip'+(state.eventSlot===t?' active':''),'<span class="dot"></span>'+t.toLowerCase());
      c.onclick=function(){state.eventSlot=t; $$('.chip',slotChips).forEach(function(x){x.classList.remove('active');}); c.classList.add('active');};
      slotChips.appendChild(c);
    });
    var fs=field('Event Slot <span class="req">*</span>', slotChips); fs.appendChild(errNode()); b.appendChild(fs);

    var tm=input('time', state.eventTime); tm.oninput=function(){state.eventTime=this.value;};
    var ft=field('Event Time <span class="req">*</span>', tm); ft.appendChild(errNode()); b.appendChild(ft);

    var oc=input('text', state.occasion, 'e.g. 25th Wedding Anniversary'); oc.oninput=function(){state.occasion=this.value;};
    var foc=field('Occasion <span class="req">*</span>', oc); foc.dataset.key='occasion'; foc.appendChild(errNode()); b.appendChild(foc);

    var px=input('number', state.pax, 'Approx. number of guests'); px.min=1; px.oninput=function(){state.pax=this.value;};
    var fp=field('Guest Count / PAX <span class="req">*</span>', px); fp.appendChild(errNode()); b.appendChild(fp);

    var fdi=field('Dietary Preference <span class="req">*</span>', optCards(D.dietaryPreferences, state.dietary, false, function(v){state.dietary=v;})); fdi.appendChild(errNode()); b.appendChild(fdi);

    var locWrap=el('div');
    locWrap.appendChild(optCards(D.eventLocations, state.location, false, function(v){ state.location=v; locOther.style.display=/others/i.test(v)?'block':'none'; }));
    var locOther=input('text',state.locationOther,'Please specify'); locOther.style.display=/others/i.test(state.location)?'block':'none'; locOther.style.marginTop='10px';
    locOther.oninput=function(){state.locationOther=this.value;}; locWrap.appendChild(locOther);
    var flo=field('Event Location <span class="req">*</span>', locWrap); flo.dataset.key='location'; flo.appendChild(errNode()); b.appendChild(flo);

    var vn=el('textarea'); vn.value=state.venue; vn.placeholder='Full venue address / landmark'; vn.style.minHeight='80px';
    vn.oninput=function(){state.venue=this.value;};
    var fvn=field('Venue Details <span class="req">*</span>', vn); fvn.dataset.key='venue'; fvn.appendChild(errNode()); b.appendChild(fvn);
  }

  function rServices(b){
    b.appendChild(intro('Services & Experiences','Select everything you\'d like us to bring to life. Choose as many as you wish.'));
    var fsv=field('Services Required <span class="req">*</span>', optCards(D.servicesRequired, state.services, true, function(){})); fsv.dataset.key='services'; fsv.appendChild(errNode()); b.appendChild(fsv);
    var fad=field('Add-on Resources <span class="req">*</span>', optCards(D.addOnResources, state.addons, true, function(){})); fad.dataset.key='addons'; fad.appendChild(errNode()); b.appendChild(fad);
  }

  function rMenu(b){
    b.appendChild(intro('Curate Your Menu','Browse by category or search. Select as many dishes as you like — our chefs will refine with you on the call.'));
    var menuErr=el('div','field'); menuErr.dataset.key='menu'; var me=errNode(); me.textContent='Please select at least one dish, or add a custom menu request below.'; menuErr.appendChild(me); b.appendChild(menuErr);
    var sw=el('div','menu-search'); var si=input('search','','Search dishes…'); sw.appendChild(si); b.appendChild(sw);
    var tabs=el('div','cat-tabs'); b.appendChild(tabs);
    var list=el('div'); b.appendChild(list);
    var countBar=el('div','menu-count'); b.appendChild(countBar);
    function totalSel(){var n=0;Object.keys(state.menu).forEach(function(c){n+=(state.menu[c]||[]).length;});return n;}
    function updateCount(){var n=totalSel();countBar.innerHTML='<span>Dishes selected</span><span><b>'+n+'</b> item'+(n===1?'':'s')+'</span>';}

    D.menuOrder.forEach(function(cat){
      var tab=el('div','cat-tab','<span>'+cat.toLowerCase()+'</span>'); tab.dataset.cat=cat;
      tab.onclick=function(){var blk=$('#cat-'+slug(cat)); if(blk) blk.scrollIntoView({behavior:'smooth'});};
      tabs.appendChild(tab);
      var block=el('div','cat-block'); block.id='cat-'+slug(cat);
      var head=el('div','cat-head'); head.innerHTML='<h3>'+cat.toLowerCase()+'</h3><span class="cline"></span>'; block.appendChild(head);
      var types=D.menu[cat];
      Object.keys(types).forEach(function(type){
        var tl=el('div','type-label'); tl.innerHTML=(/non/i.test(type)?'<span class="nonveg"></span>':'<span class="veg"></span>')+type; block.appendChild(tl);
        types[type].forEach(function(item){
          if(!state.menu[cat]) state.menu[cat]=[];
          var active=state.menu[cat].indexOf(item)>-1;
          var mi=el('div','mitem'+(active?' active':'')); mi.innerHTML='<span class="mcheck"></span><span class="mname">'+item.toLowerCase()+'</span>'; mi.dataset.name=item.toLowerCase();
          mi.onclick=function(){ var arr=state.menu[cat]; var i=arr.indexOf(item); if(i>-1)arr.splice(i,1); else arr.push(item); mi.classList.toggle('active'); updateCount(); updateTabCounts(); };
          block.appendChild(mi);
        });
      });
      list.appendChild(block);
    });
    var cm=el('textarea'); cm.value=state.customMenu; cm.placeholder='Any dish, cuisine or regional specialty not listed above? Tell us here.';
    list.appendChild(field('Custom Menu Request', cm)); cm.oninput=function(){state.customMenu=this.value;};

    function updateTabCounts(){ $$('.cat-tab',tabs).forEach(function(t){ var c=t.dataset.cat; var n=(state.menu[c]||[]).length; t.innerHTML='<span>'+c.toLowerCase()+'</span>'+(n?'<span class="n">'+n+'</span>':''); }); }
    si.oninput=function(){
      var q=this.value.trim().toLowerCase();
      $$('.mitem',list).forEach(function(mi){ mi.style.display = !q || mi.dataset.name.indexOf(q)>-1 ? '' : 'none'; });
      $$('.cat-block',list).forEach(function(blk){
        var any=$$('.mitem',blk).some(function(mi){return mi.style.display!=='none';}); blk.style.display=any?'':'none';
        $$('.type-label',blk).forEach(function(tl){ var next=tl.nextElementSibling, show=false; while(next && next.classList.contains('mitem')){ if(next.style.display!=='none')show=true; next=next.nextElementSibling; } tl.style.display=show?'':'none'; });
      });
      var nr=$('#noRes');
      if(q){ var visible=$$('.mitem',list).some(function(mi){return mi.style.display!=='none';}); if(!visible){ if(!nr){nr=el('div','no-results','No dishes match "'+q+'"'); nr.id='noRes'; list.appendChild(nr);} else nr.style.display=''; } else if(nr) nr.style.display='none'; }
      else if(nr) nr.style.display='none';
    };
    updateTabCounts(); updateCount();
  }

  function rNotes(b){
    b.appendChild(intro('Additional Notes','Please share any additional details, preferences, or special requests for your event.'));
    var ta=el('textarea'); ta.value=state.notes; ta.placeholder='Themes, colour palette, allergies, timing preferences, décor inspiration, budget indications…'; ta.style.minHeight='180px';
    ta.oninput=function(){state.notes=this.value;};
    var fnotes=field('Your Notes <span class="req">*</span>', ta); fnotes.dataset.key='notes'; fnotes.appendChild(errNode()); b.appendChild(fnotes);
  }

  function rDiscuss(b){
    b.appendChild(intro('Discussion Round','We would set up a 30-minute call between you and our experience team to better understand your event and deliverables.'));
    var d1=input('date',state.discDate); d1.oninput=function(){state.discDate=this.value;};
    var fd1=field('Preferred Discussion Date <span class="req">*</span>', d1); fd1.appendChild(errNode()); b.appendChild(fd1);
    var t1=input('time',state.discTime); t1.oninput=function(){state.discTime=this.value;};
    var ft1=field('Preferred Discussion Time <span class="req">*</span>', t1); ft1.appendChild(errNode()); b.appendChild(ft1);
  }

  function rReview(b){
    b.appendChild(intro(editing?'Review & Update':'Review & Submit','A final glance before we begin curating.'));
    function line(k,v){ return v ? '<div class="kv" style="margin-bottom:6px"><span class="k">'+k+'</span><span class="v">'+v+'</span></div>' : ''; }
    var menuCount=0, menuHtml='';
    D.menuOrder.forEach(function(c){ var arr=state.menu[c]||[]; menuCount+=arr.length; if(arr.length) menuHtml+='<div class="menu-detail-cat"><div class="mc-h">'+c.toLowerCase()+' ('+arr.length+')</div><div class="tag-list">'+arr.map(function(i){return '<span>'+i.toLowerCase()+'</span>';}).join('')+'</div></div>'; });
    var c=el('div','card');
    c.innerHTML =
      (editing?'<div class="file-badge" style="padding:12px 22px;margin-bottom:12px"><div class="l">File Number</div><div class="v" style="font-size:1.6rem">'+esc(currentFileNumber)+'</div></div>':'')+
      '<div class="eyebrow">Client</div>'+line('Name',esc(state.clientName))+line('Mobile',esc(state.mobile))+
      '<div class="eyebrow" style="margin-top:14px">Event</div>'+
      line('Type', esc(state.eventType)+(state.eventTypeOther?' ('+esc(state.eventTypeOther)+')':''))+
      line('Date', esc(fmtD(state.eventDate)))+line('Slot', esc(state.eventSlot))+line('Time', esc(state.eventTime))+
      line('Occasion', esc(state.occasion))+line('PAX', esc(state.pax))+line('Dietary', esc(state.dietary))+
      line('Location', esc(state.location)+(state.locationOther?' ('+esc(state.locationOther)+')':''))+line('Venue', esc(state.venue))+
      line('Services', state.services.map(esc).join(', '))+line('Add-ons', state.addons.map(esc).join(', '))+
      '<div class="eyebrow" style="margin-top:14px">Menu — '+menuCount+' dishes</div>'+(menuHtml||'<p class="small muted">No dishes selected yet.</p>')+
      (state.customMenu?line('Custom Request', esc(state.customMenu)):'')+
      '<div class="eyebrow" style="margin-top:14px">Notes</div><p class="small">'+(esc(state.notes)||'—')+'</p>'+
      '<div class="eyebrow" style="margin-top:14px">Discussion</div>'+line('Preferred', esc(fmtD(state.discDate))+' '+esc(state.discTime));
    b.appendChild(c);
    var note=el('p','small muted center'); note.style.marginTop='14px'; note.textContent='By submitting, you agree to be contacted by our team regarding this enquiry.';
    b.appendChild(note);
  }

  function intro(h2,txt){var d=el('div','step-intro'); d.innerHTML='<h2>'+h2+'</h2><p>'+txt+'</p>'; return d;}
  function esc(s){return (s==null?'':String(s)).replace(/[<>&]/g,function(c){return{'<':'&lt;','>':'&gt;','&':'&amp;'}[c];});}
  function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-');}
  function fmtD(ds){ if(!ds) return ''; try{ return new Date(String(ds)+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }catch(e){ return ds; } }

  // ================= VALIDATION =================
  function validate(){
    var b=$('#formSteps'); var ok=true;
    $$('.input-err',b).forEach(function(x){x.classList.remove('input-err');});
    $$('.err-msg.show',b).forEach(function(x){x.classList.remove('show');});
    $$('.opt-grid',b).forEach(function(x){x.style.outline='';});
    var id=STEPS[current].id;
    if(id==='entry'){
      if(!state.clientName.trim()){ failInput(b,0); ok=false; }
      if(!/^[+\d][\d\s-]{7,}$/.test(state.mobile.trim())){ failInput(b,1); ok=false; }
    }
    if(id==='event'){
      if(!state.eventType){markGroup(b,0);ok=false;}
      if(!state.eventDate){failByType(b,'date');ok=false;}
      if(!state.eventSlot){markChipGroup(b);ok=false;}
      if(!state.eventTime){failByType(b,'time');ok=false;}
      if(!state.pax){failByType(b,'number');ok=false;}
      if(!state.dietary){markGroup(b,1);ok=false;}
      if(STRICT){
        if(!state.occasion.trim()){ failKey(b,'occasion'); ok=false; }
        if(!state.location){ failKey(b,'location'); ok=false; }
        if(!state.venue.trim()){ failKey(b,'venue'); ok=false; }
      }
    }
    if(STRICT && id==='services'){
      if(!state.services.length){ failKey(b,'services'); ok=false; }
      if(!state.addons.length){ failKey(b,'addons'); ok=false; }
    }
    if(STRICT && id==='menu'){
      var mc=0; Object.keys(state.menu).forEach(function(c){ mc+=(state.menu[c]||[]).length; });
      if(mc===0 && !state.customMenu.trim()){ failKey(b,'menu'); ok=false; }
    }
    if(STRICT && id==='notes' && !state.notes.trim()){ failKey(b,'notes'); ok=false; }
    if(id==='discuss'){
      if(!state.discDate){failByType(b,'date',0);ok=false;}
      if(!state.discTime){failByType(b,'time',0);ok=false;}
    }
    if(!ok) toast('Please complete the highlighted fields.','err');
    return ok;
  }
  function failKey(b,key){
    var f=b.querySelector('[data-key="'+key+'"]'); if(!f) return;
    var m=f.querySelector('.err-msg'); if(m) m.classList.add('show');
    var grid=f.querySelector('.opt-grid'); if(grid) grid.style.outline='1px solid var(--red)';
    var inp=f.querySelector('input,textarea'); if(inp) inp.classList.add('input-err');
  }
  function failInput(b,idx){var e=$$('input',b)[idx]; if(e){e.classList.add('input-err'); var m=e.parentNode.querySelector('.err-msg'); if(m)m.classList.add('show');}}
  function failByType(b,type,idx){var els=$$('input[type="'+type+'"]',b); var e=els[idx||0]; if(e){e.classList.add('input-err'); var m=(e.parentNode.parentNode&&e.parentNode.parentNode.querySelector('.err-msg'))||e.parentNode.querySelector('.err-msg'); if(m)m.classList.add('show');}}
  function markGroup(b,which){var f=$$('.field',b).filter(function(x){return x.querySelector('.opt-grid');})[which]; if(f){var m=f.querySelector('.err-msg'); if(m)m.classList.add('show'); f.querySelector('.opt-grid').style.outline='1px solid var(--red)';}}
  function markChipGroup(b){var f=$$('.field',b).filter(function(x){return x.querySelector('.chips');})[0]; if(f){var m=f.querySelector('.err-msg'); if(m)m.classList.add('show');}}

  // ================= NAV =================
  function go(dir){
    if(dir>0 && !validate()) return;
    if(dir>0 && current===STEPS.length-1){ submit(); return; }
    current=Math.max(0,Math.min(STEPS.length-1,current+dir));
    renderStep();
  }

  var EDITABLE=['clientName','mobile','eventType','eventTypeOther','eventDate','eventSlot','eventTime','occasion','pax','dietary','location','locationOther','venue','services','addons','menu','customMenu','notes','discDate','discTime','discAltDate','discAltTime'];

  function submit(){
    var btn=$('#nextBtn'); btn.disabled=true; btn.textContent=editing?'Updating…':'Submitting…';
    var clean=JSON.parse(JSON.stringify(state));
    Object.keys(clean.menu).forEach(function(c){ if(!clean.menu[c] || !clean.menu[c].length) delete clean.menu[c]; });
    if(editing){
      var patch={}; EDITABLE.forEach(function(k){ patch[k]=clean[k]; });
      window.GG_STORE.update(currentFileNumber, patch, ACTOR).then(function(){
        window.GG_STORE.get(currentFileNumber).then(function(rec){ lastRecord=rec||Object.assign({fileNumber:currentFileNumber},clean); finishThankYou(true); });
      }).catch(function(){ toast('Something went wrong. Please try again.','err'); btn.disabled=false; renderStep(); });
    } else {
      window.GG_STORE.submit(clean, ACTOR).then(function(saved){ lastRecord=saved; currentFileNumber=saved.fileNumber; finishThankYou(false); })
        .catch(function(){ toast('Something went wrong. Please try again.','err'); btn.disabled=false; renderStep(); });
    }
  }

  function finishThankYou(wasUpdate){
    $('#tyFileNo').textContent=currentFileNumber;
    $('#tyEyebrow').textContent = wasUpdate ? 'Updated' : 'Received';
    $('#tyHeading').textContent = wasUpdate ? 'Your Submission Has Been Updated!' : 'Thank You for Sharing Your Requirements!';
    $('#nextBtn').disabled=false;
    showScreen('thankyou');
    postParent('zovryn:saved', {fileNumber:currentFileNumber, wasUpdate:!!wasUpdate});
  }

  // ================= EXISTING CLIENT LOGIN =================
  function doLogin(){
    var fileNo=$('#lgFile').value.trim(), mobile=$('#lgMobile').value.trim();
    var lp=$('#step-login'); $$('.err-msg',lp).forEach(function(m){m.classList.remove('show');});
    var ok=true;
    if(!/^\d{4,6}$/.test(fileNo)){ $('#lgFile').parentNode.querySelector('.err-msg').classList.add('show'); ok=false; }
    if(!/\d{10}/.test(mobile.replace(/\D/g,''))){ $('#lgMobile').parentNode.querySelector('.err-msg').classList.add('show'); ok=false; }
    if(!ok) return;
    var btn=$('#loginBtn'); btn.disabled=true; btn.textContent='Verifying…';
    window.GG_STORE.findByCredentials(fileNo, mobile).then(function(rec){
      btn.disabled=false; btn.textContent='Login';
      if(!rec){ $('#loginErr').classList.add('show'); return; }
      loadRecord(rec);
    }).catch(function(){ btn.disabled=false; btn.textContent='Login'; $('#loginErr').classList.add('show'); });
  }

  function loadRecord(rec){
    state = blankState();
    EDITABLE.forEach(function(k){ if(rec[k]!==undefined && rec[k]!==null) state[k]=rec[k]; });
    // ensure arrays/objects are fresh copies
    state.services = (rec.services||[]).slice();
    state.addons = (rec.addons||[]).slice();
    state.menu = JSON.parse(JSON.stringify(rec.menu||{}));
    editing = true; currentFileNumber = rec.fileNumber; lastRecord = rec;
    $('#editBanner').style.display=''; $('#editFileNo').textContent=rec.fileNumber;
    current = 0; showScreen('form');
    if(EMBED) toast('Editing File '+rec.fileNumber+' — changes save for everyone','ok');
    else toast('Welcome back, '+(rec.clientName||'')+' — File '+rec.fileNumber,'ok');
  }

  // ================= SCREENS =================
  function showScreen(which){
    $$('.step').forEach(function(s){s.classList.remove('active');});
    if(which==='landing') $('#step-landing').classList.add('active');
    else if(which==='login'){ $('#step-login').classList.add('active'); $('#loginErr').classList.remove('show'); }
    else if(which==='form'){ $('#step-form').classList.add('active'); renderStep(); }
    else if(which==='thankyou') $('#step-thankyou').classList.add('active');
    window.scrollTo(0,0);
  }

  function startNewCustomer(){
    state = blankState(); editing=false; currentFileNumber=null; current=0;
    $('#editBanner').style.display='none';
    showScreen('form');
  }

  // ================= WIRE UP =================
  function init(){
    var banner=$('#syncBanner');
    if(window.GG_STORE.mode==='live'){ banner.className='sync-banner live'; banner.textContent='Connected — submissions sync to Google Sheets in real time.'; }

    // marquee clone + lightbox
    var mt=$('#marqueeTrack');
    if(mt){
      var originals=Array.prototype.slice.call(mt.children);
      originals.forEach(function(node){ var clone=node.cloneNode(true); clone.setAttribute('aria-hidden','true'); mt.appendChild(clone); });
      var lb=$('#lightbox'), lbImg=$('#lbImg'), lbCap=$('#lbCap'), lbCount=$('#lbCount');
      if(lb){
        var items=originals.map(function(f){ var im=f.querySelector('img'), c=f.querySelector('figcaption'); return {src:im.getAttribute('src'), alt:im.alt||'', cap:c?c.textContent:''}; });
        var idx=0;
        var show=function(i){ idx=(i+items.length)%items.length; lbImg.src=items[idx].src; lbImg.alt=items[idx].alt; lbCap.textContent=items[idx].cap; lbCount.textContent=(idx+1)+' / '+items.length; lb.classList.add('show'); document.body.classList.add('no-scroll'); };
        var close=function(){ lb.classList.remove('show'); document.body.classList.remove('no-scroll'); };
        mt.addEventListener('click', function(e){ var im=e.target && e.target.tagName==='IMG' ? e.target : (e.target.closest?e.target.closest('img'):null); if(!im)return; var src=im.getAttribute('src'), found=0; for(var k=0;k<items.length;k++){ if(items[k].src===src){found=k;break;} } show(found); });
        $('#lbClose').onclick=close; $('#lbPrev').onclick=function(){ show(idx-1); }; $('#lbNext').onclick=function(){ show(idx+1); };
        lb.addEventListener('click', function(e){ if(e.target===lb) close(); });
        document.addEventListener('keydown', function(e){ if(!lb.classList.contains('show')) return; if(e.key==='Escape') close(); else if(e.key==='ArrowLeft') show(idx-1); else if(e.key==='ArrowRight') show(idx+1); });
        var sx=0; lb.addEventListener('touchstart', function(e){ sx=e.touches[0].clientX; }, {passive:true}); lb.addEventListener('touchend', function(e){ var dx=e.changedTouches[0].clientX - sx; if(Math.abs(dx)>50) show(idx + (dx<0?1:-1)); }, {passive:true});
      }
    }

    // entry choice
    $('#newCustomerBtn').onclick=startNewCustomer;
    $('#existingClientBtn').onclick=function(){ showScreen('login'); };
    $('#loginBackBtn').onclick=function(){ showScreen('landing'); };
    $('#loginBtn').onclick=doLogin;
    $('#lgMobile').addEventListener('keydown',function(e){ if(e.key==='Enter') doLogin(); });

    // form nav
    $('#nextBtn').onclick=function(){ go(1); };
    $('#backBtn').onclick=function(){ go(-1); };
    $('#newEnquiryBtn').onclick=function(){ if(EMBED){ postParent('zovryn:close'); } else { location.reload(); } };

    // thank-you actions
    $('#dlPdfBtn').onclick=function(){ if(lastRecord) window.GG_PDF(lastRecord); };
    $('#shareWaBtn').onclick=function(){
      if(!lastRecord)return; var m=lastRecord;
      var lines=[
        '*Gourmet Gatherings — Event Enquiry*',
        'File Number: '+m.fileNumber,
        'Name: '+m.clientName,
        'Type: '+m.eventType+(m.eventTypeOther?' ('+m.eventTypeOther+')':''),
        'Date: '+fmtD(m.eventDate)+'  ·  '+m.eventSlot+'  '+m.eventTime,
        'PAX: '+m.pax+'  ·  Dietary: '+m.dietary,
        'Menu items: '+Object.keys(m.menu||{}).reduce(function(n,c){return n+m.menu[c].length;},0),
        'Preferred call: '+fmtD(m.discDate)+' '+m.discTime,
        '',
        'Sent via the Gourmet Gatherings Experience Portal.'
      ];
      window.open('https://wa.me/919311877987?text='+encodeURIComponent(lines.join('\n')),'_blank','noopener');
    };

    // ---- Embedded / deep-link routing (admin & ops "Create" / "Edit Event") ----
    if(EMBED) document.body.classList.add('embed');
    var flow=Q.get('flow');
    if(flow==='new'){
      startNewCustomer();
    } else if(flow==='edit' && Q.get('file') && ADMIN_OK){
      var fno=Q.get('file');
      window.GG_STORE.get(fno).then(function(rec){
        if(rec) loadRecord(rec);
        else { toast('File '+fno+' not found.','err'); startNewCustomer(); }
      }).catch(function(){ toast('Could not load File '+fno,'err'); });
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
