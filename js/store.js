/* ============================================================
   ZOVRYN — Data Store
   Instant local store (localStorage) + optional Google Sheets
   sync via an Apps Script Web App endpoint.
   Primary reference: 5-digit numeric File Number.
   Backend-agnostic: swap SheetsBackend for PostgreSQL/Firebase
   later without touching the UI.
   ============================================================ */
(function(){
  'use strict';

  var CONFIG = {
    SHEETS_ENDPOINT: 'https://script.google.com/macros/s/AKfycbz2as4AuwsMM4almuHW7jgif65NzdJA6sywIFDEpOmxx8KjFyz3jhZIgUH62IvVEI7dMA/exec',
    SHEETS_TOKEN: 'ZOVRYN-SECRET-2026'
  };
  try{
    var ov = localStorage.getItem('zov_endpoint'); if(ov) CONFIG.SHEETS_ENDPOINT = ov;
    var tk = localStorage.getItem('zov_token');    if(tk) CONFIG.SHEETS_TOKEN = tk;
  }catch(e){}

  var LS_KEY = 'zovryn_events_v1';

  function readLocal(){
    try{ return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }catch(e){ return []; }
  }
  function writeLocal(list){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(list)); }catch(e){}
  }

  // ---- Unique 5-digit numeric file number ----
  function generateFileNumber(existing){
    var taken = {};
    (existing||[]).forEach(function(e){ if(e.fileNumber) taken[String(e.fileNumber)] = 1; });
    var n, tries = 0;
    do {
      n = String(Math.floor(10000 + Math.random() * 90000)); // 10000–99999
      tries++;
    } while (taken[n] && tries < 500);
    return n;
  }

  function sheetsEnabled(){ return !!CONFIG.SHEETS_ENDPOINT; }
  function sheetsPost(action, payload){
    if(!sheetsEnabled()) return Promise.reject('no-endpoint');
    return fetch(CONFIG.SHEETS_ENDPOINT, {
      method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({action:action, token:CONFIG.SHEETS_TOKEN, data:payload})
    }).then(function(r){ return r.json(); });
  }
  function sheetsGet(){
    if(!sheetsEnabled()) return Promise.reject('no-endpoint');
    var url = CONFIG.SHEETS_ENDPOINT + '?action=list&token=' + encodeURIComponent(CONFIG.SHEETS_TOKEN);
    return fetch(url).then(function(r){ return r.json(); });
  }

  var Store = {
    config: CONFIG,
    mode: sheetsEnabled() ? 'live' : 'local',

    // Instant, synchronous read of the last-cached list (no network).
    // Used to paint the console immediately, then revalidate via all().
    localList: function(){ return readLocal(); },

    // New submission. modifiedBy: 'Client' (default) | 'Admin' | 'Operations'
    submit: function(record, modifiedBy){
      var list = readLocal();
      record.fileNumber   = generateFileNumber(list);
      record.status       = 'New Lead';
      record.createdAt     = new Date().toISOString();
      record.lastUpdatedOn = record.createdAt;
      record.lastModifiedBy = modifiedBy || 'Client';
      record.createdBy      = modifiedBy || 'Client';
      record.internalNotes = { discussion:'', proposal:'', followup:'' };
      list.push(record);
      writeLocal(list);
      if(sheetsEnabled()) sheetsPost('submit', record).catch(function(){});
      return Promise.resolve(record);
    },

    // Admin: fetch all
    all: function(){
      var local = readLocal();
      if(!sheetsEnabled()) return Promise.resolve(local);
      return sheetsGet().then(function(res){
        if(res && res.ok && Array.isArray(res.events)){ writeLocal(res.events); return res.events; }
        return local;
      }).catch(function(){ return local; });
    },

    get: function(fileNumber){
      return this.all().then(function(list){
        return list.filter(function(e){ return String(e.fileNumber)===String(fileNumber); })[0] || null;
      });
    },

    // Existing-client login: File Number + Mobile must both match
    findByCredentials: function(fileNumber, mobile){
      var digits = function(s){ return String(s||'').replace(/\D/g,''); };
      var m = digits(mobile);
      return this.all().then(function(list){
        var rec = list.filter(function(e){
          return String(e.fileNumber)===String(fileNumber).trim() && digits(e.mobile).slice(-10)===m.slice(-10) && m.length>=10;
        })[0];
        return rec || null;
      });
    },

    // Update by file number. modifiedBy: 'Client' | 'Admin' | 'Operations'
    update: function(fileNumber, patch, modifiedBy){
      var list = readLocal();
      for(var i=0;i<list.length;i++){
        if(String(list[i].fileNumber)===String(fileNumber)){
          Object.keys(patch).forEach(function(k){
            if(k==='internalNotes'){
              list[i].internalNotes = Object.assign({}, list[i].internalNotes||{}, patch.internalNotes);
            } else { list[i][k]=patch[k]; }
          });
          list[i].lastUpdatedOn = new Date().toISOString();
          list[i].lastModifiedBy = modifiedBy || 'Admin';
          break;
        }
      }
      writeLocal(list);
      if(sheetsEnabled()) sheetsPost('update', {fileNumber:fileNumber, patch:patch, modifiedBy:modifiedBy||'Admin'}).catch(function(){});
      return Promise.resolve();
    }
  };

  window.GG_STORE = Store;
})();
