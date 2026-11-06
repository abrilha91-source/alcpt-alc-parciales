'use strict';
/* ALCPT y ALC por parciales · v2.0 · Esc. Mil. Enfría.
   La app se publica VACÍA: el banco (banco_alcpt_alc_privado.json) se importa en cada dispositivo y se guarda en IndexedDB. */
const VER='2.0';
const $=s=>document.querySelector(s),V=$('#v');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2200)};
const hoy=()=>new Date().toISOString().slice(0,10);
const L='ABCD';
/* ---------- almacenamiento ---------- */
function idb(){return new Promise((ok,ko)=>{const r=indexedDB.open('alcpt_alc',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)})}
async function idbGet(k){const d=await idb();return new Promise((ok,ko)=>{const r=d.transaction('kv').objectStore('kv').get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)})}
async function idbSet(k,v){const d=await idb();return new Promise((ok,ko)=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>ok();t.onerror=()=>ko(t.error)})}
async function idbDel(k){const d=await idb();return new Promise(ok=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=()=>ok()})}
let BANK=null;
const RES=()=>JSON.parse(localStorage.getItem('alc_res')||'[]');
const setRES=a=>localStorage.setItem('alc_res',JSON.stringify(a));
const CFG=()=>Object.assign({examen:.6,portafolio:.3,participacion:.1,parciales:.6,alcpt_final:.4,minima:6},BANK&&BANK.ponderacion||{},JSON.parse(localStorage.getItem('alc_cfg')||'{}'));
/* ---------- navegación ---------- */
const TABS=[['inicio','Inicio'],['alcpt','ALCPT'],['alc','ALC por parciales'],['calif','Calificación'],['resultados','Resultados'],['banco','Banco']];
function nav(){const h=(location.hash||'#inicio').slice(1).split('/')[0];$('#nav').innerHTML=TABS.map(([k,t])=>`<a href="#${k}" class="${h===k?'on':''}">${t}</a>`).join('')}
window.addEventListener('hashchange',render);
function render(){nav();const h=(location.hash||'#inicio').slice(1).split('/')[0];
 if(EX&&h!=='examen'){if(!confirm('¿Salir del examen en curso? Se perderá.')){location.hash='#examen';return}EX=null}
 ({inicio:vInicio,alcpt:vALCPT,alc:vALC,calif:vCalif,resultados:vRes,banco:vBanco,examen:vExamen}[h]||vInicio)();window.scrollTo(0,0)}
const sinBanco=()=>`<div class="card"><h1>Importa el banco</h1><p class="muted">Esta app se publica <b>vacía</b>. Para usarla, importa el archivo <b>banco_alcpt_alc_privado.json</b>. Se guarda solo en este dispositivo.</p><label class="btn xl">Importar banco (.json)<input type="file" id="imp" accept=".json,application/json" hidden></label></div>`;
function bindImp(){const i=$('#imp');if(i)i.onchange=importBank}
function importBank(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{let b;
 try{b=JSON.parse(String(r.result).replace(/^\uFEFF/,''))}catch(x){alert('El archivo no es JSON válido.');return}
 if(!b||b.tipo!=='banco_alcpt_alc'||!Array.isArray(b.alcpt)||!Array.isArray(b.alc)){alert('Este archivo no es un banco ALCPT/ALC válido.');return}
 BANK=b;try{await idbSet('bank',b)}catch(x){alert('No se pudo guardar en el dispositivo: '+x.message)}
 toast(`Banco v${b.version} importado: ${b.alcpt.length} ALCPT + ${b.alc.length} ALC`);render()};r.readAsText(f)}
/* ---------- utilidades de banco ---------- */
const semInfo=n=>BANK.semestres.find(s=>s.n==n);
const parTxt=(p,s)=>{if(!p)return 'Semestral';const si=s&&semInfo(s);if(p==3)return 'Parcial 3 (integrador)';return `Parcial ${p}`+(si?` · Libro ${si.libros[p-1]}`:'')};
function shuffle(a,seed){a=a.slice();let x=seed||Math.random()*1e9|0;const rnd=()=>{x=(x*1103515245+12345)&0x7fffffff;return x/0x7fffffff};for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function pool(f){const src=f.fuente==='alc'?BANK.alc:BANK.alcpt;return src.filter(it=>{
  if(f.forma&&it.forma!==f.forma)return false;
  if(f.sem&&it.sem!=f.sem)return false;
  if(f.par){if(f.fuente==='alc'){if(!it.par.includes(+f.par))return false}else{if(f.acum?it.par>f.par:it.par!=f.par)return false}}
  if(f.sec&&it.sec!==f.sec)return false;
  if(f.tipo&&it.tipo!==f.tipo)return false;return true})}
function armar(f){let p=pool(f);if(!p.length)return [];const n=Math.min(+f.n||p.length,p.length);
 const Lp=shuffle(p.filter(i=>i.sec==='L')),Rp=shuffle(p.filter(i=>i.sec==='R'));
 let nl=Math.round(n*Lp.length/p.length);if(f.fuente==='alcpt'&&!f.sec){nl=Math.min(Lp.length,Math.round(n/2));if(n-nl>Rp.length)nl=n-Rp.length}
 let sel=Lp.slice(0,nl).concat(Rp.slice(0,n-nl));
 if(f.forma&&!+f.n)sel=p.slice().sort((a,b)=>a.sec===b.sec?a.id.localeCompare(b.id):a.sec==='L'?-1:1);
 return sel.sort((a,b)=>a.sec===b.sec?0:a.sec==='L'?-1:1)}
/* ---------- voz ---------- */
let VOCES=[];function cargarVoces(){VOCES=(speechSynthesis.getVoices()||[]).filter(v=>/^en[-_]US/i.test(v.lang));if(!VOCES.length)VOCES=(speechSynthesis.getVoices()||[]).filter(v=>/^en/i.test(v.lang))}
if('speechSynthesis'in window){cargarVoces();speechSynthesis.onvoiceschanged=cargarVoces}
function hablar(txt,fin){if(!('speechSynthesis'in window)){alert('Este navegador no tiene voz. Pide al aplicador que lea el guion.');return}
 speechSynthesis.cancel();const lines=String(txt).split('\n');const vM=VOCES.find(v=>/male|david|alex|fred|daniel|guy/i.test(v.name)&&!/female/i.test(v.name))||VOCES[0],vW=VOCES.find(v=>/female|samantha|zira|victoria|jenny|aria|karen/i.test(v.name))||VOCES[1]||VOCES[0];
 lines.forEach((l,i)=>{let t=l,v=VOCES[0];const m=l.match(/^([MW]):\s*(.*)$/);if(m){t=m[2];v=m[1]==='M'?vM:vW}const u=new SpeechSynthesisUtterance(t);u.lang='en-US';u.rate=+(localStorage.getItem('alc_rate')||.9);if(v)u.voice=v;if(i===lines.length-1&&fin)u.onend=fin;speechSynthesis.speak(u)})}
/* ---------- vistas ---------- */
function vInicio(){if(!BANK){V.innerHTML=sinBanco();bindImp();return}
 const r=RES().slice(-5).reverse();
 V.innerHTML=`<div class="card"><h1>ALCPT y ALC por parciales</h1><p class="muted">Banco v${esc(BANK.version)} · ${BANK.alcpt.length} reactivos ALCPT · ${BANK.alc.length} reactivos ALC (libros 1–14).</p>
 <a class="btn xl" href="#alcpt">ALCPT · por forma, semestre o parcial</a><a class="btn xl" href="#alc">ALC · por semestre y parcial</a><a class="btn xl sec" href="#calif">Calcular calificación del parcial y final</a></div>
 <div class="card"><h2>Últimos resultados</h2>${r.length?tablaRes(r):'<p class="muted">Aún no hay resultados en este dispositivo.</p>'}</div>
 <div class="card"><h2>Cómo se organiza</h2><p class="muted">Cada semestre trabaja dos libros del ALC. Parcial 1 = primer libro; Parcial 2 = segundo libro; Parcial 3 = integrador de ambos. El ALCPT también se divide por semestre (según el nivel del reactivo) y por parcial, y se puede evaluar por semestre completo.</p>
 <div class="tw"><table><tr><th>Sem.</th><th>Año</th><th>Libros ALC</th></tr>${BANK.semestres.map(s=>`<tr><td>${s.n}</td><td>${esc(s.nombre)}</td><td>${s.libros.join(' y ')}</td></tr>`).join('')}</table></div></div>`}
let F={};
function filtros(fuente){const f=F[fuente]||(F[fuente]={fuente,alcance:fuente==='alc'?'parcial':'parcial',sem:'',par:'1',forma:'',sec:'',tipo:'',n:fuente==='alc'?'30':'50',modo:'examen',acum:false});return f}
function seg(name,opts,val){return `<div class="seg" data-k="${name}">${opts.map(([v,t])=>`<button type="button" data-v="${esc(v)}" class="${String(val)===String(v)?'on':''}">${esc(t)}</button>`).join('')}</div>`}
function vSel(fuente){if(!BANK){V.innerHTML=sinBanco();bindImp();return}
 const f=filtros(fuente);if(!f.sem)f.sem=fuente==='alc'?'1':'1';
 const tipos=[...new Set((fuente==='alc'?BANK.alc:BANK.alcpt).map(i=>i.tipo))];
 const alc=[['semestral','Semestral'],['parcial','Por parcial']].concat(fuente==='alcpt'?[['forma','Por forma (A–H)']]:[]);
 const cnt=pool(cond(f)).length;
 V.innerHTML=`<div class="card"><h1>${fuente==='alc'?'ALC por parciales':'ALCPT'}</h1>
 <label class="f">Evaluar</label>${seg('alcance',alc,f.alcance)}
 ${f.alcance==='forma'?`<label class="f">Forma</label>${seg('forma',[...'ABCDEFGH'].map(x=>[x,x]),f.forma||'A')}<p class="mini">Una forma completa = 100 reactivos (50 de comprensión auditiva y 50 de lectura), como el ALCPT.</p>`:
 `<label class="f">Semestre</label><select id="sem">${BANK.semestres.map(s=>`<option value="${s.n}" ${s.n==f.sem?'selected':''}>${s.n} · ${esc(s.nombre)} · Libros ${s.libros.join(' y ')}</option>`).join('')}</select>
 ${f.alcance==='parcial'?`<label class="f">Parcial</label>${seg('par',[1,2,3].map(p=>[p,parTxt(p,f.sem)]),f.par)}
 ${fuente==='alcpt'?`<label class="mini"><input type="checkbox" id="acum" ${f.acum?'checked':''}> Acumulativo (incluye los parciales anteriores del semestre)</label>`:''}`:''}`}
 <div class="row"><div><label class="f">Sección</label><select id="sec"><option value="">Ambas</option><option value="L" ${f.sec==='L'?'selected':''}>Comprensión auditiva</option><option value="R" ${f.sec==='R'?'selected':''}>Lectura y estructura</option></select></div>
 <div><label class="f">Tipo</label><select id="tipo"><option value="">Todos</option>${tipos.map(t=>`<option ${f.tipo===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>
 <div><label class="f">Número de reactivos</label><input type="number" id="n" min="5" max="${cnt}" value="${esc(f.n)}"></div></div>
 <p class="muted">Disponibles con estos filtros: <b>${cnt}</b>${f.alcance==='forma'?' (deja el número vacío o en 100 para la forma completa)':''}.</p>
 <label class="f">Modo</label>${seg('modo',[['examen','Examen (calificación al final)'],['practica','Práctica (retroalimentación inmediata)']],f.modo)}
 <label class="f">Nombre del cadete (opcional, para el registro)</label><input type="text" id="nom" value="${esc(localStorage.getItem('alc_nom')||'')}" placeholder="Ej. Cad. García Rodríguez">
 <button class="btn xl" id="go" ${cnt?'':'disabled'}>Comenzar</button></div>
 ${fuente==='alc'?`<div class="card"><h2>Temas del semestre ${f.sem}</h2>${semInfo(f.sem).libros.map(b=>`<p><span class="tag">Libro ${b}</span> ${esc(BANK.libros[b]||'')}</p>`).join('')}</div>`:''}`;
 V.querySelectorAll('.seg').forEach(s=>s.onclick=e=>{const b=e.target.closest('button');if(!b)return;f[s.dataset.k]=b.dataset.v;if(s.dataset.k==='alcance'){if(b.dataset.v==='forma'){f.forma=f.forma||'A';f.n='100'}else if(f.n==='100')f.n=fuente==='alc'?'30':'50'}vSel(fuente)});
 const up=()=>{f.sem=$('#sem')?$('#sem').value:f.sem;f.sec=$('#sec').value;f.tipo=$('#tipo').value;f.n=$('#n').value;f.acum=$('#acum')?$('#acum').checked:false};
 ['#sem','#sec','#tipo','#acum'].forEach(s=>{const e=$(s);if(e)e.onchange=()=>{up();vSel(fuente)}});
 $('#go').onclick=()=>{up();localStorage.setItem('alc_nom',$('#nom').value.trim());iniciar(fuente,f,$('#nom').value.trim())}}
function cond(f){const c={fuente:f.fuente,sec:f.sec,tipo:f.tipo,n:f.n};if(f.alcance==='forma')c.forma=f.forma||'A';else{c.sem=f.sem;if(f.alcance==='parcial'){c.par=f.par;c.acum=f.acum}}return c}
const vALCPT=()=>vSel('alcpt'),vALC=()=>vSel('alc');
/* ---------- examen ---------- */
let EX=null;
function iniciar(fuente,f,nom){const c=cond(f);const its=armar(c);if(!its.length){alert('No hay reactivos con esos filtros.');return}
 EX={fuente,c,modo:f.modo,nom,its,i:0,r:its.map(()=>null),plays:its.map(()=>0),ini:Date.now(),alcance:f.alcance};location.hash='#examen'}
function titulo(e){const c=e.c;return `${e.fuente==='alc'?'ALC':'ALCPT'} · `+(c.forma?`Forma ${c.forma}`:`Semestre ${c.sem} · ${c.par?parTxt(+c.par,c.sem)+(c.acum?' (acumulativo)':''):'Semestral'}`)}
function vExamen(){if(!EX){location.hash='#inicio';return}const e=EX,it=e.its[e.i],ans=e.r[e.i],prac=e.modo==='practica',done=prac&&ans!==null;
 const parte=it.sec==='L'?'Parte I · Comprensión auditiva':'Parte II · Lectura y estructura';
 V.innerHTML=`<div class="card"><div class="hud"><span>${esc(titulo(e))}</span><span>${e.i+1} / ${e.its.length}</span></div><div class="pbar"><i style="width:${100*(e.i+1)/e.its.length}%"></i></div>
 <span class="tag">${parte}</span><span class="tag">${esc(it.tipo)}</span>${it.libro?`<span class="tag">Libro ${it.libro}</span>`:''}
 ${it.sec==='L'&&it.s?`<div class="noprint"><button class="btn" id="play">▶ Escuchar${!prac?` (${2-e.plays[e.i]} restantes)`:''}</button></div>${done?`<div class="txt">${esc(it.s)}</div>`:''}`:it.s?`<div class="txt">${esc(it.s)}</div>`:''}
 <div class="q">${esc(it.q)}</div>
 ${it.o.map((o,j)=>`<button class="op ${ans===j?'sel':''} ${done&&j===it.k?'ok':''} ${done&&ans===j&&j!==it.k?'no':''}" data-j="${j}" ${done?'disabled':''}><b>${L[j]})</b>${esc(o)}</button>`).join('')}
 ${done?`<div class="fb ${ans===it.k?'ok':'no'}"><b>${ans===it.k?'Correcto':'Incorrecto · respuesta: '+L[it.k]}</b><br>${esc(it.e)}</div>`:''}
 <div class="row" style="margin-top:10px"><button class="btn sec" id="prev" ${e.i?'':'disabled'}>Anterior</button>${e.i<e.its.length-1?`<button class="btn" id="next">Siguiente</button>`:`<button class="btn" id="fin">Terminar y calificar</button>`}</div>
 <p class="mini">Respondidas: ${e.r.filter(x=>x!==null).length} de ${e.its.length}. <a href="#" id="abort">Cancelar</a></p></div>`;
 V.querySelectorAll('.op').forEach(b=>b.onclick=()=>{e.r[e.i]=+b.dataset.j;vExamen()});
 const p=$('#play');if(p)p.onclick=()=>{if(!prac&&e.plays[e.i]>=2){toast('Ya no quedan reproducciones');return}e.plays[e.i]++;hablar(it.s);if(!prac)p.textContent=`▶ Escuchar (${2-e.plays[e.i]} restantes)`};
 $('#prev').onclick=()=>{e.i--;vExamen()};const n=$('#next');if(n)n.onclick=()=>{e.i++;vExamen()};
 const f=$('#fin');if(f)f.onclick=()=>{const pend=e.r.filter(x=>x===null).length;if(pend&&!confirm(`Faltan ${pend} sin responder (cuentan como error). ¿Terminar?`))return;calificar()};
 $('#abort').onclick=ev=>{ev.preventDefault();if(confirm('¿Cancelar este examen?')){EX=null;location.hash=e.fuente==='alc'?'#alc':'#alcpt'}}}
function calificar(){const e=EX,cfg=CFG();let ok=0;const por={};
 e.its.forEach((it,j)=>{const b=e.r[j]===it.k;ok+=b;const k=it.tipo;por[k]=por[k]||[0,0];por[k][0]+=b;por[k][1]++});
 const sec={L:[0,0],R:[0,0]};e.its.forEach((it,j)=>{sec[it.sec][0]+=e.r[j]===it.k;sec[it.sec][1]++});
 const pct=Math.round(1000*ok/e.its.length)/10,cal=Math.round(pct)/10;
 const res={fecha:new Date().toISOString(),nom:e.nom,fuente:e.fuente,eval:e.c.forma?'Forma '+e.c.forma:(e.c.par?'Parcial '+e.c.par+(e.c.acum?' acum.':''):'Semestral'),sem:e.c.sem||'',par:e.c.par||'',forma:e.c.forma||'',modo:e.modo,n:e.its.length,ok,pct,cal,L:sec.L,R:sec.R,min:Math.round((Date.now()-e.ini)/60000)};
 const all=RES();all.push(res);setRES(all);
 const its=e.its,r=e.r;EX=null;history.replaceState(null,'','#resultados');nav();
 V.innerHTML=`<div class="card"><h1>Resultado</h1><p class="muted">${esc(titulo({fuente:res.fuente,c:{forma:res.forma,sem:res.sem,par:res.par,acum:/acum/.test(res.eval)}}))}${res.nom?' · '+esc(res.nom):''}</p>
 <div class="row"><div><div class="big">${ok}/${its.length}</div><div class="muted">aciertos</div></div><div><div class="big">${pct}</div><div class="muted">puntos (0–100)</div></div><div><div class="big ${cal>=cfg.minima?'okt':'badt'}">${cal.toFixed(1)}</div><div class="muted">calificación (0–10) · ${cal>=cfg.minima?'Aprobado':'No aprobado'} (mínima ${cfg.minima})</div></div></div>
 <h3>Por sección</h3><p>${['L','R'].filter(s=>sec[s][1]).map(s=>`<span class="tag">${s==='L'?'Comprensión auditiva':'Lectura y estructura'}: ${sec[s][0]}/${sec[s][1]}</span>`).join('')}</p>
 <h3>Por tipo</h3><p>${Object.entries(por).map(([k,v])=>`<span class="tag">${esc(k)}: ${v[0]}/${v[1]}</span>`).join('')}</p>
 <div class="row noprint"><button class="btn" onclick="print()">Imprimir</button>${res.par&&res.fuente==='alc'?`<a class="btn sec" href="#calif">Usar en la calificación del parcial</a>`:''}</div></div>
 <div class="card"><h2>Revisión de errores</h2>${its.map((it,j)=>r[j]===it.k?'':`<div style="border-bottom:1px solid var(--b);padding:8px 0"><b>${j+1}.</b> ${it.s?`<div class="txt">${esc(it.s)}</div>`:''}<div><b>${esc(it.q)}</b></div><div class="badt">Tu respuesta: ${r[j]===null?'(sin responder)':L[r[j]]+') '+esc(it.o[r[j]])}</div><div class="okt">Correcta: ${L[it.k]}) ${esc(it.o[it.k])}</div><div class="mini">${esc(it.e)}</div></div>`).join('')||'<p>¡Sin errores!</p>'}</div>`;
 localStorage.setItem('alc_ultimo',JSON.stringify(res))}
/* ---------- calificación ---------- */
function vCalif(){const cfg=CFG(),u=JSON.parse(localStorage.getItem('alc_ultimo')||'null'),d=JSON.parse(localStorage.getItem('alc_calc')||'{}');
 V.innerHTML=`<div class="card"><h1>Calificación del parcial</h1><p class="muted">Examen ${cfg.examen*100}% · portafolio de evidencias ${cfg.portafolio*100}% · participación ${cfg.participacion*100}% (escala 0–10).</p>
 <div class="row"><div><label class="f">Examen</label><input type="number" step="0.1" min="0" max="10" id="ex" value="${d.ex??(u?u.cal:'')}"></div><div><label class="f">Portafolio</label><input type="number" step="0.1" min="0" max="10" id="po" value="${d.po??''}"></div><div><label class="f">Participación</label><input type="number" step="0.1" min="0" max="10" id="pa" value="${d.pa??''}"></div></div>
 <p>Calificación del parcial: <b id="cp" class="big" style="font-size:1.6rem">—</b></p>${u?`<p class="mini">Último examen en este dispositivo: ${esc(u.eval)} · ${u.cal.toFixed(1)}</p>`:''}</div>
 <div class="card"><h1>Calificación final</h1><p class="muted">Promedio de parciales ${cfg.parciales*100}% + examen final ALCPT ${cfg.alcpt_final*100}% (el ALCPT de 0–100 se pasa a 0–10).</p>
 <div class="row"><div><label class="f">Parcial 1</label><input type="number" step="0.1" id="p1" value="${d.p1??''}"></div><div><label class="f">Parcial 2</label><input type="number" step="0.1" id="p2" value="${d.p2??''}"></div><div><label class="f">Parcial 3</label><input type="number" step="0.1" id="p3" value="${d.p3??''}"></div><div><label class="f">ALCPT final (0–100)</label><input type="number" id="af" value="${d.af??''}"></div></div>
 <p>Promedio de parciales: <b id="pp">—</b> · Calificación final: <b id="cf" class="big" style="font-size:1.6rem">—</b></p></div>
 <div class="card"><h2>Ponderaciones</h2><p class="mini">Tomadas del banco (informe de la materia). Ajústalas solo si cambia el criterio.</p><div class="row">${['examen','portafolio','participacion','parciales','alcpt_final','minima'].map(k=>`<div><label class="f">${{examen:'Examen',portafolio:'Portafolio',participacion:'Participación',parciales:'Parciales',alcpt_final:'ALCPT final',minima:'Mínima aprobatoria'}[k]}</label><input type="number" step="0.05" data-cfg="${k}" value="${cfg[k]}"></div>`).join('')}</div></div>`;
 const n=id=>{const v=parseFloat($('#'+id).value);return isNaN(v)?null:v};
 const calc=()=>{const c=CFG();const s={};['ex','po','pa','p1','p2','p3','af'].forEach(k=>s[k]=$('#'+k).value);localStorage.setItem('alc_calc',JSON.stringify(s));
  const ex=n('ex'),po=n('po'),pa=n('pa');$('#cp').textContent=ex!==null&&po!==null&&pa!==null?(Math.round(10*(ex*c.examen+po*c.portafolio+pa*c.participacion))/10).toFixed(1):'—';
  const ps=['p1','p2','p3'].map(n).filter(x=>x!==null);const pr=ps.length?ps.reduce((a,b)=>a+b,0)/ps.length:null;$('#pp').textContent=pr===null?'—':pr.toFixed(1);
  const af=n('af');const cf=pr!==null&&af!==null&&ps.length===3?Math.round(10*(pr*c.parciales+af/10*c.alcpt_final))/10:null;const e=$('#cf');e.textContent=cf===null?'—':cf.toFixed(1)+(cf>=c.minima?' · Aprobado':' · No aprobado');e.className='big '+(cf===null?'':cf>=c.minima?'okt':'badt')};
 V.querySelectorAll('input[id]').forEach(i=>i.oninput=calc);
 V.querySelectorAll('[data-cfg]').forEach(i=>i.onchange=()=>{const o=JSON.parse(localStorage.getItem('alc_cfg')||'{}');o[i.dataset.cfg]=parseFloat(i.value);localStorage.setItem('alc_cfg',JSON.stringify(o));vCalif()});calc()}
/* ---------- resultados ---------- */
function tablaRes(a){return `<div class="tw"><table><tr><th>Fecha</th><th>Cadete</th><th>Prueba</th><th>Sem.</th><th>Evaluación</th><th>Modo</th><th>Aciertos</th><th>Puntos</th><th>Cal.</th></tr>${a.map(r=>`<tr><td>${r.fecha.slice(0,10)}</td><td>${esc(r.nom||'—')}</td><td>${r.fuente.toUpperCase()}</td><td>${r.sem||'—'}</td><td>${esc(r.eval)}</td><td>${r.modo==='examen'?'Examen':'Práctica'}</td><td>${r.ok}/${r.n}</td><td>${r.pct}</td><td class="${r.cal>=CFG().minima?'okt':'badt'}">${r.cal.toFixed(1)}</td></tr>`).join('')}</table></div>`}
function vRes(){const a=RES().slice().reverse();
 V.innerHTML=`<div class="card"><h1>Resultados</h1><p class="muted">Guardados solo en este dispositivo.</p>${a.length?tablaRes(a):'<p>Aún no hay resultados.</p>'}
 <div class="row noprint"><button class="btn" id="csv" ${a.length?'':'disabled'}>Exportar CSV</button><button class="btn sec" onclick="print()">Imprimir</button><button class="btn peligro" id="del" ${a.length?'':'disabled'}>Borrar resultados</button></div></div>
 ${a.length?`<div class="card"><h2>Promedios por semestre y parcial (solo exámenes)</h2>${resumen(a)}</div>`:''}`;
 $('#csv').onclick=()=>{const h=['Fecha','Cadete','Prueba','Semestre','Parcial','Forma','Evaluación','Modo','Reactivos','Aciertos','Puntos','Calificación','Auditiva','Lectura','Minutos'];
  const rows=RES().map(r=>[r.fecha,r.nom,r.fuente.toUpperCase(),r.sem,r.par,r.forma,r.eval,r.modo,r.n,r.ok,r.pct,r.cal,r.L?r.L.join('/'):'',r.R?r.R.join('/'):'',r.min]);
  const csv='\uFEFF'+[h,...rows].map(x=>x.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const l=document.createElement('a');l.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));l.download='resultados_alcpt_alc_'+hoy()+'.csv';l.click()};
 $('#del').onclick=()=>{if(confirm('¿Borrar todos los resultados de este dispositivo?')){setRES([]);vRes()}}}
function resumen(a){const g={};a.filter(r=>r.modo==='examen').forEach(r=>{const k=`${r.fuente.toUpperCase()}|${r.sem||'—'}|${r.eval}`;(g[k]=g[k]||[]).push(r.cal)});
 const ks=Object.keys(g).sort();return ks.length?`<div class="tw"><table><tr><th>Prueba</th><th>Sem.</th><th>Evaluación</th><th>Exámenes</th><th>Promedio</th></tr>${ks.map(k=>{const [f,s,e]=k.split('|'),v=g[k];return `<tr><td>${f}</td><td>${s}</td><td>${esc(e)}</td><td>${v.length}</td><td>${(v.reduce((x,y)=>x+y,0)/v.length).toFixed(1)}</td></tr>`}).join('')}</table></div>`:'<p class="muted">Sin exámenes todavía.</p>'}
/* ---------- banco ---------- */
function vBanco(){V.innerHTML=(BANK?`<div class="card"><h1>Banco</h1><p>Versión <b>${esc(BANK.version)}</b> (${esc(BANK.fecha)}) · ${BANK.alcpt.length} ALCPT · ${BANK.alc.length} ALC.</p>
 <h3>ALCPT por semestre y parcial</h3>${tablaConteo('alcpt')}<h3>ALC por semestre y parcial</h3>${tablaConteo('alc')}
 <label class="btn">Reemplazar banco<input type="file" id="imp" accept=".json,application/json" hidden></label><button class="btn peligro" id="qb">Quitar banco de este dispositivo</button></div>`:sinBanco())+
 `<div class="card"><h2>Voz</h2><p class="muted">La comprensión auditiva usa la voz en inglés del dispositivo. En examen se puede escuchar cada audio 2 veces.</p><label class="f">Velocidad</label><select id="rate">${[[.8,'Lenta'],[.9,'Normal'],[1,'Rápida']].map(([v,t])=>`<option value="${v}" ${+(localStorage.getItem('alc_rate')||.9)===v?'selected':''}>${t}</option>`).join('')}</select><button class="btn sec" id="prueba">Probar voz</button></div>
 <p class="mini">ALCPT y ALC por parciales v${VER} · Esc. Mil. Enfría. · No afiliada al DLIELC. Reactivos originales; el banco es confidencial y no se publica.</p>`;
 bindImp();const q=$('#qb');if(q)q.onclick=async()=>{if(confirm('¿Quitar el banco de este dispositivo? Tus resultados se conservan.')){await idbDel('bank');BANK=null;vBanco()}};
 $('#rate').onchange=e=>localStorage.setItem('alc_rate',e.target.value);$('#prueba').onclick=()=>hablar('M: Good morning, Cadet. Where is the clinic?\nW: It is next to the main gate, sir.')}
function tablaConteo(src){const a=BANK[src];const c={};a.forEach(i=>{(src==='alc'?i.par:[i.par]).forEach(p=>{const k=i.sem+'|'+p;c[k]=(c[k]||0)+1})});
 return `<div class="tw"><table><tr><th>Sem.</th><th>Parcial 1</th><th>Parcial 2</th><th>Parcial 3</th><th>Semestre</th></tr>${BANK.semestres.map(s=>`<tr><td>${s.n}</td>${[1,2,3].map(p=>`<td>${c[s.n+'|'+p]||0}</td>`).join('')}<td>${a.filter(i=>i.sem==s.n).length}</td></tr>`).join('')}</table></div>`}
/* ---------- arranque ---------- */
render();
if(window.indexedDB)idbGet('bank').then(b=>{if(b&&b.alcpt){BANK=b;if(!EX)render()}}).catch(()=>{});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
