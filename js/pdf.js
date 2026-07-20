/* ============================================================
   ZOVRYN — PDF Generation (client-side, jsPDF)
   Branded summary: File Number, Client, Event, Menu, Notes,
   Discussion — followed by full Terms & Conditions.
   Operated by Flenbo Foodworks Private Limited.
   ============================================================ */
(function(){
  'use strict';

  /* GOLD kept as the accent-var name but now holds Gourmet red; DARK now holds the light header band colour */
  var GOLD=[216,30,58], GOLD_SOFT=[231,69,95], CHAR=[30,26,20], MUTED=[140,131,117], LINE=[224,214,198], DARK=[255,253,248];
  var LOGO = window.GG_LOGO || null;

  function cap(s){ return (s||'').replace(/\b\w/g,function(c){return c.toUpperCase();}); }

  var TERMS = {
    intro:"Gourmet Gatherings is Delhi NCR's premium culinary and experiential hospitality brand, operated by Flenbo Foodworks Private Limited. Whether it's a private celebration, a corporate gathering, or a social function, we pride ourselves on delivering excellence, personalization, and seamless execution.",
    highlightsTitle:"Some highlights about us:",
    highlights:[
      "Operated by a passionate team of culinary professionals and hospitality experts",
      "Multi-brand cloud kitchens with high operational standards",
      "Kitchens certified with ISO 9001, ISO 22000, and HACCP for food safety and quality assurance",
      "Capacity to manage events from 20 to 2000+ guests with on-site and off-site setups",
      "Wide range of menu themes including North Indian, Asian, Continental, Fusion, and Live Counter formats."
    ],
    lead:"Order confirmation in the form of Advance Payment implies acceptance of these terms:",
    sections:[
      {h:"1. Pricing & Guest Count", items:[
        "Prices are per plate and inclusive of applicable taxes unless mentioned otherwise.",
        "Final guest count (MG – Minimum Guarantee) must be confirmed 48 hours prior to the event.",
        "We provision only 5%–7.5% extra plates over MG.",
        "Any consumption beyond MG will be charged additionally as per per-plate rate."
      ]},
      {h:"2. Payment Terms", items:[
        "75% advance payment or as agreed by Flenbo Foodworks is mandatory for order confirmation.",
        "Balance 25% payment or due amount must be cleared immediately after the event on the same day (before team demobilization).",
        "Credit card payment would attract additional 3% charges on the invoice amount.",
        "Any delay in balance payment beyond 24 hours will attract follow-up and may impact future services."
      ]},
      {h:"3. Service Timings", items:[
        "Beverage service – Only one option applicable: (With Starters / With Main Course / Post Main Course)",
        "Starter service duration: Maximum 60 minutes or as agreed by Flenbo Foodworks in writing.",
        "Main course service duration: Maximum 90 minutes after starters or as agreed by Flenbo Foodworks in writing.",
        "Starters and Main Course will not run simultaneously.",
        "There will be a 15-minute gap between closure of starter service and start of main course service.",
        "Any extension beyond agreed service time will be chargeable and communicated well in advance to the client."
      ]},
      {h:"4. Cancellation & Refund Policy", sub:"Partial Refunds are applicable only in cases of:", items:[
        "Non-delivery due to our fault",
        "Completely wrong menu supplied",
        "Verified quality issues (with photo proof)",
        "Order is cancelled atleast 48 hours before the event."
      ], sub2:"No refunds will be given for:", items2:[
        "Taste preferences or dislikes",
        "Change of mind",
        "Guest turnout being lower than MG",
        "Guest delays or no show due to traffic, weather, or venue restrictions",
        "No refunds for orders cancelled within 0–48 hours prior to the event."
      ]},
      {h:"5. Food Allergens", items:[
        "Our food may contain or come in contact with allergens such as dairy, gluten, nuts, soy, and seeds.",
        "Clients must inform us in advance of any dietary restrictions or allergies."
      ]},
      {h:"6. Client Responsibilities", sub:"Client must ensure:", items:[
        "To provide space at ODC site to setup cooking area and Tandoor (if required as per menu)",
        "Power & water availability (if required)",
        "Timely start of event as per schedule.",
        "Maintain Starters and Main Course timelines as communicated above in service timings.",
        "Delay caused due to venue readiness will not impact service duration or billing."
      ]},
      {h:"7. Left Over Food Packing", items:[
        "Left over food would be packed in the proportion of shortfall of numbers to that of Minimum Guarantee. No left over food would be packed once the minimum guarantee numbers are achieved."
      ]},
      {h:"8. Legal Jurisdiction", items:[
        "All disputes shall be subject to Gurugram, Haryana jurisdiction only."
      ]}
    ],
    acceptance:"By confirming the order and making advance payment, the client agrees to all the above Terms & Conditions."
  };

  window.GG_PDF = function(rec){
    if(!window.jspdf){ alert('PDF library still loading — please try again in a moment.'); return; }
    var doc = new window.jspdf.jsPDF({unit:'pt', format:'a4'});
    var W = doc.internal.pageSize.getWidth();
    var H = doc.internal.pageSize.getHeight();
    var M = 48, y = 0;

    function footer(){
      doc.setDrawColor(LINE[0],LINE[1],LINE[2]); doc.setLineWidth(.5); doc.line(M, H-46, W-M, H-46);
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(MUTED[0],MUTED[1],MUTED[2]);
      doc.text('Gourmet Gatherings  ·  Operated by Flenbo Foodworks Private Limited', M, H-33);
      doc.text('+91 93118 77987  ·  customercare@flenbo.com  ·  @gatherings.gourmet', W-M, H-33, {align:'right'});
      doc.setFontSize(7); doc.setTextColor(GOLD[0],GOLD[1],GOLD[2]);
      doc.text('GSTIN: 06AAFCF3966J1ZC     ·     UDYAM-HR-05-0080298', W/2, H-19, {align:'center'});
    }
    function ensure(space){ if(y + space > H - 60){ footer(); doc.addPage(); y = 56; } }

    // ---- Dark header band with gold logo ----
    function brandHeader(subtitle){
      doc.setFillColor(DARK[0],DARK[1],DARK[2]); doc.rect(0,0,W,118,'F');
      doc.setDrawColor(GOLD[0],GOLD[1],GOLD[2]); doc.setLineWidth(2); doc.line(0,118,W,118);
      if(LOGO && LOGO.full){
        var lw=150, lh=lw*(LOGO.fullH/LOGO.fullW);
        try{ doc.addImage(LOGO.full,'PNG', W/2-lw/2, 16, lw, lh); }catch(e){ textLogo(); }
      } else { textLogo(); }
      doc.setFontSize(8); doc.setTextColor(MUTED[0],MUTED[1],MUTED[2]);
      doc.text(subtitle, W/2, 108, {align:'center'});
      y = 146;
    }
    function textLogo(){
      doc.setFont('helvetica','bold'); doc.setFontSize(24); doc.setTextColor(GOLD[0],GOLD[1],GOLD[2]);
      doc.text('GOURMET GATHERINGS', W/2, 56, {align:'center'});
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(MUTED[0],MUTED[1],MUTED[2]);
      doc.text('PREMIUM CULINARY EXPERIENCE', W/2, 76, {align:'center'});
    }

    function sectionTitle(t){
      ensure(40); y+=6;
      doc.setDrawColor(GOLD[0],GOLD[1],GOLD[2]); doc.setLineWidth(1.4); doc.line(M, y, M+22, y);
      doc.setFont('times','bold'); doc.setFontSize(12.5); doc.setTextColor(CHAR[0],CHAR[1],CHAR[2]);
      doc.text(t.toUpperCase(), M+30, y+4); y+=18;
    }
    function kv(k,v){
      if(v===undefined||v===null||v==='') v='—'; v=String(v); ensure(16);
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(MUTED[0],MUTED[1],MUTED[2]);
      doc.text(k.toUpperCase(), M, y);
      doc.setFontSize(10); doc.setTextColor(CHAR[0],CHAR[1],CHAR[2]);
      var lines=doc.splitTextToSize(v, W-M-M-140); doc.text(lines, M+140, y);
      y+=Math.max(14, lines.length*12);
    }
    function para(txt, size, color){
      ensure(20); doc.setFont('helvetica','normal'); doc.setFontSize(size||10);
      var c=color||[60,55,50]; doc.setTextColor(c[0],c[1],c[2]);
      var lines=doc.splitTextToSize(txt, W-M-M);
      lines.forEach(function(ln){ ensure(size?size+4:14); doc.text(ln, M, y); y+=(size?size+3:13); });
      y+=4;
    }
    function bullets(items, numbered){
      doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(55,50,46);
      items.forEach(function(it,i){
        var marker = numbered ? (i+1)+'.' : '•';
        var lines=doc.splitTextToSize(it, W-M-M-18);
        ensure(lines.length*12+4);
        doc.setTextColor(GOLD[0],GOLD[1],GOLD[2]); doc.text(marker, M+2, y);
        doc.setTextColor(55,50,46); doc.text(lines, M+18, y);
        y+=lines.length*12+3;
      });
      y+=2;
    }

    // ===== PAGE 1: SUMMARY =====
    brandHeader('EVENT REQUIREMENT SUMMARY');

    // File number chip
    doc.setFillColor(245,241,232); doc.roundedRect(M, y-16, 210, 30, 15,15,'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(MUTED[0],MUTED[1],MUTED[2]);
    doc.text('FILE NUMBER', M+16, y-4);
    doc.setFont('times','bold'); doc.setFontSize(15); doc.setTextColor(GOLD[0],GOLD[1],GOLD[2]);
    doc.text(String(rec.fileNumber||'—'), M+16, y+10);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(MUTED[0],MUTED[1],MUTED[2]);
    doc.text('Submitted: '+ new Date(rec.createdAt||Date.now()).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}), W-M, y, {align:'right'});
    if(rec.status){ doc.text('Status: '+rec.status, W-M, y+12, {align:'right'}); }
    y+=34;

    sectionTitle('Client Details');
    kv('Client Name', cap(rec.clientName)); kv('Mobile Number', rec.mobile);

    sectionTitle('Event Details');
    kv('Event Type', cap(rec.eventType) + (rec.eventTypeOther? ' ('+rec.eventTypeOther+')':''));
    kv('Date of Event', rec.eventDate); kv('Event Slot', cap(rec.eventSlot)); kv('Event Time', rec.eventTime);
    kv('Occasion', rec.occasion); kv('Guest Count / PAX', rec.pax); kv('Dietary Preference', cap(rec.dietary));
    kv('Event Location', cap(rec.location) + (rec.locationOther? ' ('+rec.locationOther+')':'')); kv('Venue Address', rec.venue);
    if(rec.services && rec.services.length) kv('Services Required', rec.services.map(cap).join(', '));
    if(rec.addons && rec.addons.length) kv('Add-on Resources', rec.addons.map(cap).join(', '));

    sectionTitle('Menu Selection');
    var menu=rec.menu||{}, cats=Object.keys(menu).filter(function(c){return menu[c]&&menu[c].length;});
    if(!cats.length){ para('No menu items selected.'); }
    else cats.forEach(function(c){
      ensure(30); doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(GOLD[0],GOLD[1],GOLD[2]);
      doc.text(cap(c).toUpperCase()+'  ('+menu[c].length+')', M, y); y+=13;
      doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(CHAR[0],CHAR[1],CHAR[2]);
      var lines=doc.splitTextToSize(menu[c].map(cap).join('   •   '), W-M-M-6);
      ensure(lines.length*12+6); doc.text(lines, M+6, y); y+=lines.length*12+8;
    });
    if(rec.customMenu){ y+=2; kv('Custom Menu Request', rec.customMenu); }

    sectionTitle('Additional Notes');
    para(rec.notes ? rec.notes : 'No additional notes provided.');

    sectionTitle('Discussion Round Preferences');
    kv('Preferred Date', rec.discDate); kv('Preferred Time', rec.discTime);

    footer();

    // ===== TERMS & CONDITIONS =====
    doc.addPage(); brandHeader('TERMS & CONDITIONS');
    para(TERMS.intro, 10);
    y+=13;  // blank line after the opening paragraph
    ensure(15); doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(CHAR[0],CHAR[1],CHAR[2]);
    doc.text(TERMS.highlightsTitle, M, y); y+=23; bullets(TERMS.highlights);  // extra blank line after header
    y+=8; ensure(18); doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(CHAR[0],CHAR[1],CHAR[2]);
    var leadLines=doc.splitTextToSize(TERMS.lead, W-M-M); doc.text(leadLines, M, y); y+=leadLines.length*12+8;
    TERMS.sections.forEach(function(sec){
      sectionTitle(sec.h);
      y+=8;  // extra blank line after every header
      if(sec.sub){ ensure(14); doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(CHAR[0],CHAR[1],CHAR[2]); doc.text(sec.sub, M, y); y+=13; }
      if(sec.items) bullets(sec.items, !!sec.sub);
      if(sec.sub2){ footer(); doc.addPage(); y=56;  // force "No refunds" section onto the next page
        ensure(16); doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(CHAR[0],CHAR[1],CHAR[2]); doc.text(sec.sub2, M, y); y+=13; }
      if(sec.items2) bullets(sec.items2, true);
      y+=5;
    });
    sectionTitle('Acceptance');
    y+=8;
    para(TERMS.acceptance, 10); y+=8;
    doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(CHAR[0],CHAR[1],CHAR[2]);
    ensure(78); doc.text('Warm regards,', M, y); y+=13; doc.text('Flenbo Foodworks Private Limited', M, y); y+=18;
    doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(55,50,46);
    doc.text('+91 93118 77987', M, y); y+=14;
    doc.text('customercare@flenbo.com', M, y); y+=14;
    doc.text('@gatherings.gourmet', M, y);

    footer();
    doc.save('Gourmet-Gatherings-'+(rec.fileNumber||'enquiry')+'.pdf');
  };
})();
