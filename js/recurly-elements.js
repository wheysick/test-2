(function () {
  if (!window.recurly) {
    console.warn('[Recurly] missing library.');
    return;
  }
  let elements = null;
  let fields = {};
  function mount() {
    if (elements) return elements;
    elements = window.recurly.Elements();
    const style = { fontSize: '16px', color: '#eaecef', placeholder: { color: 'rgba(234,236,239,.55)' } };
    fields.number = elements.CardNumberElement({ style });
    fields.month  = elements.CardMonthElement({ style });
    fields.year   = elements.CardYearElement({ style });
    fields.cvv    = elements.CardCvvElement({ style });
    fields.postal = elements.CardPostalCodeElement({ style });
    [['#re-number',fields.number],['#re-month',fields.month],['#re-year',fields.year],['#re-cvv',fields.cvv],['#re-postal',fields.postal]]
      .forEach(([sel,el])=>{const host=document.querySelector(sel);if(host)el.attach(host);});
    return elements;
  }
  function unmount(){if(!elements)return;Object.values(fields).forEach(el=>el&&el.detach&&el.detach());elements.destroy();elements=null;fields={};}
  function tokenize(meta={}){
    return new Promise((res,rej)=>{
      if(!elements)return rej(new Error('Elements not mounted'));
      window.recurly.token(elements,meta,(err,tok)=>{
        if(err){const det=err.fields?Object.entries(err.fields).map(([k,v])=>`${k}: ${v}`).join('\n'):'';err.message=det?`${err.message}\n${det}`:err.message;return rej(err);}
        res(tok);
      });
    });
  }
  window.__recurlyMount=mount;window.__recurlyUnmount=unmount;window.__recurlyTokenize=tokenize;
})();
