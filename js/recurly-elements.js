/* single-instance recurly elements */
(function(){
  let elements=null,fields={};
  function mount(){
    if(!window.recurly) return null;
    if(elements) return elements;
    elements = window.recurly.Elements();
    const style={fontSize:'16px',color:'#E9ECF2',placeholder:{color:'rgba(234,236,239,.55)'}};
    fields.number = elements.CardNumberElement({style});
    fields.month  = elements.CardMonthElement({style});
    fields.year   = elements.CardYearElement({style});
    fields.cvv    = elements.CardCvvElement({style});
    fields.postal = elements.CardPostalCodeElement({style});
    fields.number.attach('#re-number');
    fields.month.attach('#re-month');
    fields.year.attach('#re-year');
    fields.cvv.attach('#re-cvv');
    fields.postal.attach('#re-postal');
    return elements;
  }
  function unmount(){try{fields.number?.detach()}catch{}try{fields.month?.detach()}catch{}try{fields.year?.detach()}catch{}try{fields.cvv?.detach()}catch{}try{fields.postal?.detach()}catch{}fields={};elements=null;}
  function tokenize(meta){return new Promise((res,rej)=>{if(!elements)return rej(new Error('Payment form not ready'));window.recurly.token(elements,meta||{},(e,t)=>{if(e){const d=e.fields?Object.entries(e.fields).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):v}`).join('; '):'';return rej(new Error(d?`${e.message} — ${d}`:e.message))}res(t)})})}
  window.RecurlyUI={mount,unmount,tokenize};
})();
