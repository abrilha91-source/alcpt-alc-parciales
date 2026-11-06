'use strict';
/* ALCPT y ALC por parciales · v2.1 · Esc. Mil. Enfría.
   La app se publica VACÍA. Se importan en cada dispositivo (IndexedDB):
   1) banco_alcpt_alc_privado.json  2) formas_originales_alcpt_privado.json (opcional, para el Final). */
const VER='2.1';
const $=s=>document.querySelector(s),V=$('#v');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2400)};
const hoy=()=>new Date().toISOString().slice(0,10);
const L='ABCD';
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},SS=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
/* ---------- almacenamiento ---------- */
function idb(){return new Promise((ok,ko)=>{const r=indexedDB.open('alcpt_alc',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)})}
async function idbGet(k){const d=await idb();return new Promise((ok,ko)=>{const r=d.transaction('kv').objectStore('kv').get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)})}
async function idbSet(k,v){const d=await idb();return new Promise((ok,ko)=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>ok();t.onerror=()=>ko(t.error)})}
async function idbDel(k){const d=await idb();return new Promise(ok=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=()=>ok()})}
let BANK=null,ORIG=null;
const RES=()=>LS('alc_res',[]),setRES=a=>SS('alc_res',a);
/* ---------- esquemas ---------- */
const ESQ_DEF={programa:{nombre:'2 libros por semestre',parciales:2,pond:{examen:.6,portafolio:.3,participacion:.1,parciales:.6,final:.4,minima:6},final:'ALCPT',cursos:[]}};
const esqId=()=>{const e=LS('alc_esq',null);return BANK&&BANK.esquemas&&BANK.esquemas[e]?e:(BANK&&BANK.esquema_def)||'programa'};
const ESQ=()=>(BANK&&BANK.esquemas&&BANK.esquemas[esqId()])||ESQ_DEF.programa;
const cursos=()=>ESQ().cursos.length?ESQ().cursos:(BANK?BANK.semestres.map(s=>({id:'S'+s.n,n:s.n,nombre:s.nombre,libros:s.libros})):[]);
const curso=id=>cursos().find(c=>c.id===id)||cursos()[0];
const CFG=()=>Object.assign({},ESQ().pond,LS('alc_cfg_'+esqId(),{}));
/* semestres ALCPT que corresponden a un curso del esquema */
function semsDe(c){if(esqId()==='superioridad')return {A1:[1],A2:[2,3],A3:[4,5],A4:[6,7]}[c.id]||[c.n];return [c.n]}
/* ---------- navegación ---------- */
const TABS=[['inicio','Inicio'],['alc','ALC'],['alcpt','ALCPT'],['final','Final · formas originales'],['calif','Calificación'],['resultados','Resultados'],['banco','Banco']];
function nav(){const h=(location.hash||'#inicio').slice(1).split('/')[0];$('#nav').innerHTML=TABS.map(([k,t])=>`<a href="#${k}" class="${h===k?'on':''}">${t}</a>`).join('')}
window.addEventListener('hashchange',render);
function render(){nav();const h=(location.hash||'#inicio').slice(1).split('/')[0];
 if(EX&&h!=='examen'){if(!confirm('¿Salir del examen en curso? Se perderá.')){location.hash='#examen';return}EX=null;speechSynthesis&&speechSynthesis.cancel()}
 ({inicio:vInicio,alcpt:vALCPT,alc:vALC,final:vFinal,calif:vCalif,resultados:vRes,banco:vBanco,examen:vExamen}[h]||vInicio)();window.scrollTo(0,0)}
const sinBanco=()=>`<div class="card"><h1>Importa el banco</h1><p class="muted">Esta app se publica <b>vacía</b>. Para usarla, importa el archivo <b>banco_alcpt_alc_privado.json</b>. Se guarda solo en este dispositivo.</p><label class="btn xl">Importar banco (.json)<input type="file" class="imp" accept=".json,application/json" hidden></label></div>`;
function bindImp(){document.querySelectorAll('input.imp').forEach(i=>i.onchange=importar)}
function importar(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{let b;
 try{b=JSON.parse(String(r.result).replace(/^\uFEFF/,''))}catch(x){alert('El archivo no es JSON válido.');return}
 if(b&&b.tipo==='formas_originales_alcpt'&&Array.isArray(b.formas)){ORIG=b;try{await idbSet('orig',b)}catch(x){alert('No se pudo guardar: '+x.message)}toast(`Formas originales importadas: ${b.formas.length}`);render();return}
 if(!b||b.tipo!=='banco_alcpt_alc'||!Array.isArray(b.alcpt)||!Array.isArray(b.alc)){alert('Este archivo no es un banco ALCPT/ALC ni un archivo de formas originales.');return}
 BANK=b;try{await idbSet('bank',b)}catch(x){alert('No se pudo guardar en el dispositivo: '+x.message)}
 toast(`Banco v${b.version} importado: ${b.alcpt.length} ALCPT + ${b.alc.length} ALC`);render()};r.readAsText(f)}
/* ---------- utilidades ---------- */
function shuffle(a,seed){a=a.slice();let x=seed||Math.random()*1e9|0;const rnd=()=>{x=(x*1103515245+12345)&0x7fffffff;return x/0x7fffffff};for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function seg(name,opts,val){return `<div class="seg" data-k="${name}">${opts.map(([v,t])=>`<button type="button" data-v="${esc(v)}" class="${String(val)===String(v)?'on':''}">${esc(t)}</button>`).join('')}</div>`}
const parN=()=>ESQ().parciales||2;
function librosEval(f){const c=curso(f.curso);if(f.alcance==='libro')return [+f.libro];if(f.alcance==='parcial')return [c.libros[(+f.par||1)-1]].filter(Boolean);return c.libros}
function pool(f){
 if(f.fuente==='alc'){const bs=librosEval(f);return BANK.alc.filter(it=>bs.includes(it.libro)&&(!f.lec||it.leccion==+f.lec||(f.lec&&it.leccion==null&&f.comp))&&(!f.sec||it.sec===f.sec)&&(!f.tipo||it.tipo===f.tipo))}
 return BANK.alcpt.filter(it=>{
  if(f.alcance==='forma'){if(it.forma!==f.forma)return false}
  else{const c=curso(f.curso),ss=semsDe(c);if(!ss.includes(it.sem))return false;
   if(f.alcance==='parcial'){const p=parN()===3?(it.par3||it.par):it.par;if(f.acum?p>+f.par:p!=+f.par)return false}}
  if(f.sec&&it.sec!==f.sec)return false;if(f.tipo&&it.tipo!==f.tipo)return false;return true})}
function armar(f){let p=pool(f);if(!p.length)return [];const n=Math.min(+f.n||p.length,p.length);
 const Lp=shuffle(p.filter(i=>i.sec==='L')),Rp=shuffle(p.filter(i=>i.sec==='R'));
 let nl=Math.round(n*Lp.length/p.length);if(f.fuente==='alcpt'&&!f.sec){nl=Math.min(Lp.length,Math.round(n/2));if(n-nl>Rp.length)nl=n-Rp.length}
 let sel=Lp.slice(0,nl).concat(Rp.slice(0,n-nl));
 if(f.alcance==='forma'&&(!+f.n||+f.n>=p.length))sel=p.slice().sort((a,b)=>a.sec===b.sec?a.id.localeCompare(b.id):a.sec==='L'?-1:1);
 return sel.sort((a,b)=>a.sec===b.sec?0:a.sec==='L'?-1:1)}
/* ---------- voz ---------- */
let VOCES=[];function cargarVoces(){VOCES=(speechSynthesis.getVoices()||[]).filter(v=>/^en[-_]US/i.test(v.lang));if(!VOCES.length)VOCES=(speechSynthesis.getVoices()||[]).filter(v=>/^en/i.test(v.lang))}
if('speechSynthesis'in window){cargarVoces();speechSynthesis.onvoiceschanged=cargarVoces}
function hablar(txt,fin){if(!('speechSynthesis'in window)){alert('Este navegador no tiene voz. Pide al aplicador que lea el guion.');return}
 speechSynthesis.cancel();const lines=String(txt).replace(/_{2,}/g,' blank ').split('\n').filter(x=>x.trim());const vM=VOCES.find(v=>/male|david|alex|fred|daniel|guy/i.test(v.name)&&!/female/i.test(v.name))||VOCES[0],vW=VOCES.find(v=>/female|samantha|zira|victoria|jenny|aria|karen/i.test(v.name))||VOCES[1]||VOCES[0];
 lines.forEach((l,i)=>{let t=l,v=VOCES[0];const m=l.match(/^\s*([MW]):\s*(.*)$/);if(m){t=m[2];v=m[1]==='M'?vM:vW}const u=new SpeechSynthesisUtterance(t);u.lang='en-US';u.rate=+(localStorage.getItem('alc_rate')||.9);if(v)u.voice=v;if(i===lines.length-1&&fin)u.onend=fin;speechSynthesis.speak(u)})}
/* ---------- inicio ---------- */
function tablaCursos(){const E=ESQ();return `<div class="tw"><table><tr><th>Curso</th><th>Libros ALC</th>${parN()===3?'<th>P1</th><th>P2</th><th>P3</th>':'<th>Parcial 1</th><th>Parcial 2</th>'}<th>Puntaje de referencia</th></tr>${cursos().map(c=>`<tr><td>${esc(c.nombre)}${c.nota==='inferido'?' <span class="mini">(inferido)</span>':''}</td><td>${c.libros.join(', ')}</td>${Array.from({length:parN()},(_,i)=>`<td>Book ${c.libros[i]??'—'}</td>`).join('')}<td>${esc(c.ref||'—')}</td></tr>`).join('')}</table></div><p class="mini">${esc(E.fuente||'')}</p>`}
function selEsq(){const es=BANK.esquemas||{};return `<label class="f">Esquema de la materia</label><select id="esq">${Object.entries(es).map(([k,e])=>`<option value="${k}" ${k===esqId()?'selected':''}>${esc(e.nombre)}</option>`).join('')}</select>`}
function bindEsq(fn){const s=$('#esq');if(s)s.onchange=()=>{SS('alc_esq',s.value);F={};fn()}}
function vInicio(){if(!BANK){V.innerHTML=sinBanco();bindImp();return}
 const r=RES().slice(-5).reverse(),E=ESQ();
 V.innerHTML=`<div class="card"><h1>ALCPT y ALC por parciales</h1><p class="muted">Banco v${esc(BANK.version)} · ${BANK.alc.length} reactivos ALC (Books ${Math.min(...BANK.alc.map(i=>i.libro))}–${Math.max(...BANK.alc.map(i=>i.libro))}) · ${BANK.alcpt.length} reactivos ALCPT${ORIG?` · ${ORIG.formas.length} formas originales`:''}.</p>
 <a class="btn xl" href="#alc">ALC · quiz por parcial, libro o lección</a><a class="btn xl" href="#alcpt">ALCPT · por semestre, parcial o forma</a><a class="btn xl" href="#final">Final · formas originales del ALCPT</a><a class="btn xl sec" href="#calif">Calcular calificación del parcial y final</a></div>
 <div class="card"><h2>Cómo se organiza</h2>${selEsq()}<p class="muted">${E.parciales} parciales por ${esqId()==='superioridad'?'año':'semestre'}; cada parcial evalúa un libro del ALC. ${esqId()==='superioridad'?'Parciales 10 % c/u y final del semestre 70 %.':'Parcial = examen 60 % + portafolio 30 % + participación 10 %. Calificación final = parciales 60 % + ALCPT final 40 %.'}</p>${tablaCursos()}</div>
 <div class="card"><h2>Últimos resultados</h2>${r.length?tablaRes(r):'<p class="muted">Aún no hay resultados en este dispositivo.</p>'}</div>`;bindEsq(vInicio)}
/* ---------- selección ALC / ALCPT ---------- */
let F={};
function filtros(fuente){return F[fuente]||(F[fuente]={fuente,alcance:'parcial',curso:cursos()[0].id,par:'1',libro:'',lec:'',comp:true,forma:'A',sec:'',tipo:'',n:fuente==='alc'?'30':'50',modo:'examen',acum:false})}
function vSel(fuente){if(!BANK){V.innerHTML=sinBanco();bindImp();return}
 const f=filtros(fuente);if(!cursos().some(c=>c.id===f.curso))f.curso=cursos()[0].id;const c=curso(f.curso);
 const tipos=[...new Set((fuente==='alc'?BANK.alc:BANK.alcpt).map(i=>i.tipo))];
 const formas=[...new Set(BANK.alcpt.map(i=>i.forma))].sort();
 const alc=fuente==='alc'?[['parcial','Por parcial'],['semestral',esqId()==='superioridad'?'Anual (todos los libros)':'Semestral (ambos libros)'],['libro','Un libro']]:[['parcial','Por parcial'],['semestral',esqId()==='superioridad'?'Por año':'Semestral'],['forma','Por forma']];
 const cnt=pool(f).length;const allB=[...new Set(BANK.alc.map(i=>i.libro))].sort((a,b)=>a-b);
 const bs=fuente==='alc'?librosEval(f):[];
 V.innerHTML=`<div class="card"><h1>${fuente==='alc'?'ALC · quices por parcial':'ALCPT'}</h1>${selEsq()}
 <label class="f">Evaluar</label>${seg('alcance',alc,f.alcance)}
 ${f.alcance==='forma'?`<label class="f">Forma</label>${seg('forma',formas.map(x=>[x,x==='V'?'V (vocabulario ALC 19–30)':x]),f.forma)}<p class="mini">Formas A–H: 100 reactivos (50 auditiva + 50 lectura). Para las formas originales del ALCPT usa la pestaña «Final».</p>`:
 f.alcance==='libro'&&fuente==='alc'?`<label class="f">Libro</label><select id="libro">${allB.map(b=>`<option value="${b}" ${b==f.libro?'selected':''}>Book ${b}</option>`).join('')}</select>`:
 `<label class="f">Curso</label><select id="curso">${cursos().map(x=>`<option value="${x.id}" ${x.id===f.curso?'selected':''}>${esc(x.nombre)} · Books ${x.libros.join(', ')}</option>`).join('')}</select>
 ${f.alcance==='parcial'?`<label class="f">Parcial</label>${seg('par',Array.from({length:parN()},(_,i)=>[i+1,`Parcial ${i+1}`+(fuente==='alc'||true?` · Book ${c.libros[i]??'—'}`:'')]),f.par)}
 ${fuente==='alcpt'?`<label class="mini"><input type="checkbox" id="acum" ${f.acum?'checked':''}> Acumulativo (incluye los parciales anteriores)</label>`:''}`:''}`}
 ${fuente==='alc'&&bs.length===1?`<label class="f">Lección del Book ${bs[0]}</label>${seg('lec',[['','Todas'],['1','1'],['2','2'],['3','3'],['4','4']],f.lec)}${f.lec?`<label class="mini"><input type="checkbox" id="comp" ${f.comp?'checked':''}> Incluir reactivos complementarios del libro (sin lección asignada)</label>`:''}`:''}
 <div class="row"><div><label class="f">Sección</label><select id="sec"><option value="">Ambas</option><option value="L" ${f.sec==='L'?'selected':''}>Comprensión auditiva</option><option value="R" ${f.sec==='R'?'selected':''}>Lectura y estructura</option></select></div>
 <div><label class="f">Tipo</label><select id="tipo"><option value="">Todos</option>${tipos.map(t=>`<option ${f.tipo===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>
 <div><label class="f">Número de reactivos</label><input type="number" id="n" min="5" max="${cnt}" value="${esc(f.n)}"></div></div>
 <p class="muted">Disponibles con estos filtros: <b>${cnt}</b>.</p>
 <label class="f">Modo</label>${seg('modo',[['examen','Examen (calificación al final)'],['practica','Práctica (retroalimentación inmediata)']],f.modo)}
 <label class="f">Nombre del cadete (opcional, para el registro)</label><input type="text" id="nom" value="${esc(localStorage.getItem('alc_nom')||'')}" placeholder="Ej. Cad. García Rodríguez">
 <button class="btn xl" id="go" ${cnt?'':'disabled'}>Comenzar</button></div>
 ${fuente==='alc'&&bs.length?`<div class="card"><h2>Contenido</h2>${bs.map(b=>{const l=BANK.libros[b]||{};return `<p><span class="tag">Book ${b}</span> ${l.programa?l.programa.map(esc).join('<br>'):[1,2,3,4].map(i=>`L${i}: ${esc((l.lecciones||{})[i]||'')}`).join('<br>')}${l.tema?`<br><span class="mini">Complementarios: ${esc(l.tema)}</span>`:''}</p>`}).join('')}</div>`:''}`;
 bindEsq(()=>vSel(fuente));
 V.querySelectorAll('.seg').forEach(s=>s.onclick=e=>{const b=e.target.closest('button');if(!b)return;f[s.dataset.k]=b.dataset.v;if(s.dataset.k==='alcance'){if(b.dataset.v==='forma'){f.n='100'}else if(f.n==='100')f.n=fuente==='alc'?'30':'50';if(b.dataset.v==='libro'&&!f.libro)f.libro=String(curso(f.curso).libros[0])}if(s.dataset.k!=='lec'&&s.dataset.k!=='modo'&&s.dataset.k!=='par')f.lec=f.alcance==='libro'?f.lec:'';vSel(fuente)});
 const up=()=>{['curso','libro','sec','tipo','n'].forEach(k=>{const e=$('#'+k);if(e)f[k]=e.value});f.acum=$('#acum')?$('#acum').checked:false;f.comp=$('#comp')?$('#comp').checked:f.comp};
 ['#curso','#libro','#sec','#tipo','#acum','#comp'].forEach(s=>{const e=$(s);if(e)e.onchange=()=>{up();if(s==='#curso')f.lec='';vSel(fuente)}});
 $('#go').onclick=()=>{up();localStorage.setItem('alc_nom',$('#nom').value.trim());iniciar(fuente,f,$('#nom').value.trim())}}
const vALCPT=()=>vSel('alcpt'),vALC=()=>vSel('alc');
/* ---------- final con formas originales ---------- */
const CLAVES=()=>LS('alc_claves',{});
function itemsForma(fm){const cl=CLAVES()[fm.id]||{};return fm.items.map((it,j)=>{const k=it.k!=null?it.k:(cl[it.n+(it.bis?'b':'')]!=null?cl[it.n+(it.bis?'b':'')]:null);return Object.assign({},it,{id:'F'+fm.id+'-'+it.n+(it.bis?'bis':''),tipo:it.sec==='L'?'Auditiva (original)':'Lectura (original)',k,kcap:it.k==null&&k!=null,e:it.k!=null?'Clave marcada en el archivo de origen.':(k!=null?'Clave capturada en este dispositivo.':'Sin clave.')})})}
let FF={forma:'',parte:'',modo:'examen',rev:false,tabla:''};
function vFinal(){
 if(!ORIG){V.innerHTML=`<div class="card"><h1>Final · formas originales del ALCPT</h1><p class="muted">Aquí se aplican las <b>formas originales</b> del ALCPT que tienes en tus archivos, para el examen final o el extraordinario. No vienen en la app ni en el banco: se importan por separado en cada dispositivo.</p><label class="btn xl">Importar formas originales (formas_originales_alcpt_privado.json)<input type="file" class="imp" accept=".json,application/json" hidden></label><p class="mini">También puedes preparar tu propio archivo con el mismo formato (tipo «formas_originales_alcpt»).</p></div>`;bindImp();return}
 const fs=ORIG.formas.filter(f=>FF.rev||!f.revisar);if(!fs.some(f=>f.id===FF.forma))FF.forma=(fs.find(f=>f.claves>=60)||fs[0]||{}).id||'';
 const fm=ORIG.formas.find(f=>f.id===FF.forma);const its=fm?itemsForma(fm):[];const sel=its.filter(i=>!FF.parte||i.sec===FF.parte);
 const conK=sel.filter(i=>i.k!=null).length,sinAud=sel.filter(i=>i.sec==='L'&&!i.s).length;
 const conv=BANK&&BANK.conversion||{};
 V.innerHTML=`<div class="card"><h1>Final · formas originales del ALCPT</h1><p class="mini">${esc(ORIG.aviso||'')}</p>
 <div class="tw"><table><tr><th>Forma</th><th>Reactivos</th><th>Auditiva / Lectura</th><th>Con clave</th><th>Audio</th><th></th></tr>${ORIG.formas.map(f=>{const n=itemsForma(f).filter(i=>i.k!=null).length;return `<tr><td>${esc(f.titulo)}</td><td>${f.n}</td><td>${f.nL} / ${f.nR}</td><td>${n}${n>f.claves?` <span class="mini">(${n-f.claves} capturadas)</span>`:''}</td><td>${f.nL?(f.guion?'Voz (guion transcrito)':'Audio oficial'):'—'}</td><td>${f.revisar?'<span class="tag">revisar (OCR)</span>':''}</td></tr>`}).join('')}</table></div>
 <label class="mini"><input type="checkbox" id="rev" ${FF.rev?'checked':''}> Mostrar las formas en revisión (OCR)</label>
 <label class="f">Forma</label><select id="forma">${fs.map(f=>`<option value="${esc(f.id)}" ${f.id===FF.forma?'selected':''}>${esc(f.titulo)}</option>`).join('')}</select>
 ${fm?`<p class="mini">Archivo: ${esc(fm.archivo)} · ${esc(fm.origen)} · Clave: ${esc(fm.clave)}${fm.nota?'<br>'+esc(fm.nota):''}</p>
 <label class="f">Parte</label>${seg('parte',[['','Completa'],['L','Solo comprensión auditiva'],['R','Solo lectura']],FF.parte)}
 <p class="muted">${sel.length} reactivos · <b>${conK}</b> con clave${sel.length-conK?` · <span class="badt">${sel.length-conK} sin clave (no cuentan para la calificación)</span>`:''}${sinAud?` · ${sinAud} de auditiva usan el <b>audio oficial</b> (CD o archivo): el aplicador lo reproduce`:''}.</p>
 <label class="f">Tabla de conversión a calificación</label><select id="tabla"><option value="">Porcentaje (aciertos ÷ reactivos con clave × 10)</option>${Object.entries(conv).map(([k,t])=>`<option value="${k}" ${FF.tabla===k?'selected':''}>${esc(t.nombre)} · mínimo ${t.t[t.t.length-1][0]} pts</option>`).join('')}</select>
 <label class="f">Modo</label>${seg('modo',[['examen','Examen final / extraordinario'],['practica','Práctica']],FF.modo)}
 <label class="f">Nombre del cadete (opcional)</label><input type="text" id="nom" value="${esc(localStorage.getItem('alc_nom')||'')}">
 <button class="btn xl" id="go" ${conK?'':'disabled'}>Comenzar</button>${conK?'':'<p class="badt">Esta forma no tiene clave. Captúrala abajo para poder calificar.</p>'}`:'<p>No hay formas.</p>'}</div>
 ${fm?`<div class="card"><h2>Clave de la forma ${esc(fm.id)}</h2><p class="muted">Para los reactivos sin clave, escribe las respuestas oficiales en orden (por ejemplo <b>ABDC…</b>) o por número (<b>1A 2C 3D…</b>). Se guarda solo en este dispositivo. No cambia las claves que ya trae el archivo.</p>
 <textarea id="clv" rows="3" style="width:100%;font:1rem monospace;border:1px solid var(--b);border-radius:10px;padding:8px" placeholder="1A 2C 3D …">${esc(Object.entries(CLAVES()[fm.id]||{}).map(([n,k])=>n+L[k]).join(' '))}</textarea>
 <div class="row noprint"><button class="btn sec" id="gclv">Guardar clave</button><button class="btn sec" id="imprimir">Imprimir cuadernillo y hoja de clave</button></div></div>`:''}
 ${ORIG.no_incluidas&&ORIG.no_incluidas.length?`<div class="card"><h2>Archivos que no se pudieron incluir</h2>${ORIG.no_incluidas.map(x=>`<p class="mini"><b>${esc(x.archivo)}</b>: ${esc(x.motivo)}</p>`).join('')}</div>`:''}
 <div class="card"><label class="btn sec">Reemplazar formas originales<input type="file" class="imp" accept=".json" hidden></label><button class="btn peligro" id="qo">Quitar formas de este dispositivo</button></div>`;
 bindImp();
 $('#rev').onchange=e=>{FF.rev=e.target.checked;vFinal()};const sf=$('#forma');if(sf)sf.onchange=e=>{FF.forma=e.target.value;vFinal()};
 const tb=$('#tabla');if(tb)tb.onchange=e=>{FF.tabla=e.target.value};
 V.querySelectorAll('.seg').forEach(s=>s.onclick=e=>{const b=e.target.closest('button');if(!b)return;FF[s.dataset.k]=b.dataset.v;vFinal()});
 $('#qo').onclick=async()=>{if(confirm('¿Quitar las formas originales de este dispositivo?')){await idbDel('orig');ORIG=null;vFinal()}};
 if(!fm)return;
 $('#gclv').onclick=()=>{const t=$('#clv').value.toUpperCase().trim();const m={};const nums=fm.items.filter(i=>i.k==null).map(i=>i.n+(i.bis?'b':''));
  if(/^\s*\d/.test(t)){(t.match(/\d+B?\s*[-.:)]?\s*[ABCD]/g)||[]).forEach(x=>{const r=x.match(/(\d+B?)\s*[-.:)]?\s*([ABCD])/);m[r[1].toLowerCase()]=L.indexOf(r[2])})}
  else{const ls=t.replace(/[^ABCD]/g,'').split('');ls.forEach((x,j)=>{if(nums[j]!=null)m[nums[j]]=L.indexOf(x)})}
  const all=CLAVES();all[fm.id]=m;SS('alc_claves',all);toast(`Clave guardada: ${Object.keys(m).length} respuestas`);vFinal()};
 $('#imprimir').onclick=()=>imprimirForma(fm);
 const g=$('#go');if(g)g.onclick=()=>{localStorage.setItem('alc_nom',$('#nom').value.trim());
  EX={fuente:'final',c:{forma:fm.id,titulo:fm.titulo,parte:FF.parte,tabla:FF.tabla},modo:FF.modo,nom:$('#nom').value.trim(),its:sel,i:0,r:sel.map(()=>null),plays:sel.map(()=>0),ini:Date.now()};location.hash='#examen'}}
function imprimirForma(fm){const its=itemsForma(fm);const w=window.open('','_blank');if(!w){alert('Permite ventanas emergentes para imprimir.');return}
 w.document.write(`<html><head><meta charset="utf-8"><title>${esc(fm.titulo)}</title><style>body{font-family:'Noto Sans',sans-serif;font-size:12px;margin:18mm}h1{font-size:16px}.it{break-inside:avoid;margin:0 0 8px}.k{columns:5}</style></head><body><h1>${esc(fm.titulo)}</h1><p>Uso interno · confidencial</p>${its.map(i=>`<div class="it"><b>${i.n}${i.bis?' bis':''}.</b> ${esc(i.q||(i.sec==='L'&&!i.s?'(audio)':''))}<br>${i.o.map((o,j)=>`${'abcd'[j]}) ${esc(o)}`).join('<br>')}</div>`).join('')}<div style="page-break-before:always"></div><h1>Clave · ${esc(fm.titulo)}</h1><div class="k">${its.map(i=>`<div>${i.n}${i.bis?'b':''}. ${i.k!=null?L[i.k]:'—'}</div>`).join('')}</div></body></html>`);w.document.close();w.print()}
function convertir(pts,tabla){const t=BANK&&BANK.conversion&&BANK.conversion[tabla];if(!t)return null;for(const [p,c] of t.t)if(pts>=p)return c;return null}
/* ---------- examen ---------- */
let EX=null;
function iniciar(fuente,f,nom){const its=armar(f);if(!its.length){alert('No hay reactivos con esos filtros.');return}
 const c=curso(f.curso);EX={fuente,c:{alcance:f.alcance,curso:f.curso,cursoNom:c.nombre,par:f.alcance==='parcial'?f.par:'',acum:f.acum,forma:f.alcance==='forma'?f.forma:'',libro:f.alcance==='libro'?f.libro:'',lec:f.lec,libros:librosEval(f)},modo:f.modo,nom,its,i:0,r:its.map(()=>null),plays:its.map(()=>0),ini:Date.now()};location.hash='#examen'}
function evalTxt(e){const c=e.c;if(e.fuente==='final')return `Final · ${c.titulo}${c.parte?(c.parte==='L'?' (auditiva)':' (lectura)'):''}`;
 if(c.forma)return `Forma ${c.forma}`;if(c.alcance==='libro')return `Book ${c.libro}${c.lec?' · L'+c.lec:''}`;
 return (c.par?`Parcial ${c.par}${c.acum?' acum.':''}`:(esqId()==='superioridad'?'Anual':'Semestral'))+(e.fuente==='alc'&&c.libros?` · Book ${c.libros.join(', ')}`:'')+(c.lec?' · L'+c.lec:'')}
function titulo(e){return `${e.fuente==='alc'?'ALC':'ALCPT'} · `+(e.c.forma||e.fuente==='final'||e.c.alcance==='libro'?'':esc(e.c.cursoNom||'')+' · ')+evalTxt(e)}
function vExamen(){if(!EX){location.hash='#inicio';return}const e=EX,it=e.its[e.i],ans=e.r[e.i],prac=e.modo==='practica',done=prac&&ans!==null&&it.k!=null;
 const parte=it.sec==='L'?'Parte I · Comprensión auditiva':'Parte II · Lectura y estructura';const ofi=it.sec==='L'&&!it.s;
 V.innerHTML=`<div class="card"><div class="hud"><span>${titulo(e)}</span><span>${e.i+1} / ${e.its.length}</span></div><div class="pbar"><i style="width:${100*(e.i+1)/e.its.length}%"></i></div>
 <span class="tag">${parte}</span><span class="tag">${esc(it.tipo)}</span>${it.libro?`<span class="tag">Book ${it.libro}${it.leccion?' · L'+it.leccion:''}</span>`:''}${e.fuente==='final'?`<span class="tag">Reactivo ${it.n}${it.bis?' bis':''}</span>`:''}${it.k==null?'<span class="tag" style="background:#FBE3E0;color:#b3261e">sin clave</span>':''}
 ${it.sec==='L'&&it.s?`<div class="noprint"><button class="btn" id="play">▶ Escuchar${!prac?` (${2-e.plays[e.i]} restantes)`:''}</button></div>${done?`<div class="txt">${esc(it.s)}</div>`:''}`:ofi?`<div class="txt">🔊 <b>Audio oficial:</b> el aplicador reproduce la pista del reactivo ${it.n||e.i+1}${it.bis?' bis':''}.</div>`:it.s?`<div class="txt">${esc(it.s)}</div>`:''}
 ${it.q?`<div class="q">${esc(it.q)}</div>`:''}
 ${it.o.map((o,j)=>`<button class="op ${ans===j?'sel':''} ${done&&j===it.k?'ok':''} ${done&&ans===j&&j!==it.k?'no':''}" data-j="${j}" ${done?'disabled':''}><b>${L[j]})</b>${esc(o)}</button>`).join('')}
 ${done?`<div class="fb ${ans===it.k?'ok':'no'}"><b>${ans===it.k?'Correcto':'Incorrecto · respuesta: '+L[it.k]}</b><br>${esc(it.e)}</div>`:''}
 <div class="row" style="margin-top:10px"><button class="btn sec" id="prev" ${e.i?'':'disabled'}>Anterior</button>${e.i<e.its.length-1?`<button class="btn" id="next">Siguiente</button>`:`<button class="btn" id="fin">Terminar y calificar</button>`}</div>
 <p class="mini">Respondidas: ${e.r.filter(x=>x!==null).length} de ${e.its.length}. <a href="#" id="abort">Cancelar</a></p></div>`;
 V.querySelectorAll('.op').forEach(b=>b.onclick=()=>{e.r[e.i]=+b.dataset.j;vExamen()});
 const p=$('#play');if(p)p.onclick=()=>{if(!prac&&e.plays[e.i]>=2){toast('Ya no quedan reproducciones');return}e.plays[e.i]++;hablar(it.s);if(!prac)p.textContent=`▶ Escuchar (${2-e.plays[e.i]} restantes)`};
 $('#prev').onclick=()=>{e.i--;vExamen()};const n=$('#next');if(n)n.onclick=()=>{e.i++;vExamen()};
 const f=$('#fin');if(f)f.onclick=()=>{const pend=e.r.filter(x=>x===null).length;if(pend&&!confirm(`Faltan ${pend} sin responder (cuentan como error). ¿Terminar?`))return;calificar()};
 $('#abort').onclick=ev=>{ev.preventDefault();if(confirm('¿Cancelar este examen?')){const fu=e.fuente;EX=null;speechSynthesis&&speechSynthesis.cancel();location.hash='#'+(fu==='final'?'final':fu)}}}
function calificar(){const e=EX,cfg=CFG();let ok=0;const por={};const its=e.its.filter(i=>i.k!=null),idx=e.its.map((it,j)=>j).filter(j=>e.its[j].k!=null);
 idx.forEach(j=>{const it=e.its[j],b=e.r[j]===it.k;ok+=b;const k=it.tipo;por[k]=por[k]||[0,0];por[k][0]+=b;por[k][1]++});
 const sec={L:[0,0],R:[0,0]};idx.forEach(j=>{const it=e.its[j];sec[it.sec][0]+=e.r[j]===it.k;sec[it.sec][1]++});
 const N=its.length||1,pct=Math.round(1000*ok/N)/10;let cal=Math.round(pct)/10,conv='';
 if(e.fuente==='final'&&e.c.tabla){const cc=convertir(ok,e.c.tabla);if(cc!=null){cal=cc;conv=`Conversión: ${BANK.conversion[e.c.tabla].nombre}`}else{conv=`${ok} puntos: debajo del mínimo de la tabla (${BANK.conversion[e.c.tabla].nombre}). No acreditado.`;cal=Math.min(5,cal)}}
 const res={fecha:new Date().toISOString(),nom:e.nom,fuente:e.fuente,esq:esqId(),curso:e.c.cursoNom||'',eval:evalTxt(e),sem:e.c.curso||'',par:e.c.par||'',forma:e.c.forma||'',modo:e.modo,n:its.length,sinClave:e.its.length-its.length,ok,pct,cal,L:sec.L,R:sec.R,min:Math.round((Date.now()-e.ini)/60000)};
 const all=RES();all.push(res);setRES(all);
 const r=e.r,lst=e.its;const titu=titulo(e);EX=null;history.replaceState(null,'','#resultados');nav();
 V.innerHTML=`<div class="card"><h1>Resultado</h1><p class="muted">${titu}${res.nom?' · '+esc(res.nom):''}</p>
 <div class="row"><div><div class="big">${ok}/${its.length}</div><div class="muted">aciertos${res.sinClave?` (${res.sinClave} sin clave no cuentan)`:''}</div></div><div><div class="big">${pct}</div><div class="muted">porcentaje</div></div><div><div class="big ${cal>=cfg.minima?'okt':'badt'}">${cal.toFixed(1)}</div><div class="muted">calificación (0–10) · ${cal>=cfg.minima?'Aprobado':'No aprobado'} (mínima ${cfg.minima})</div></div></div>${conv?`<p class="mini">${esc(conv)}</p>`:''}
 <h3>Por sección</h3><p>${['L','R'].filter(s=>sec[s][1]).map(s=>`<span class="tag">${s==='L'?'Comprensión auditiva':'Lectura y estructura'}: ${sec[s][0]}/${sec[s][1]}</span>`).join('')}</p>
 <h3>Por tipo</h3><p>${Object.entries(por).map(([k,v])=>`<span class="tag">${esc(k)}: ${v[0]}/${v[1]}</span>`).join('')}</p>
 <div class="row noprint"><button class="btn" onclick="print()">Imprimir</button><a class="btn sec" href="#calif">Ir a la calificación</a></div></div>
 <div class="card"><h2>Revisión de errores</h2>${lst.map((it,j)=>it.k==null||r[j]===it.k?'':`<div style="border-bottom:1px solid var(--b);padding:8px 0"><b>${it.n?it.n:j+1}.</b> ${it.s?`<div class="txt">${esc(it.s)}</div>`:''}<div><b>${esc(it.q)}</b></div><div class="badt">Respuesta: ${r[j]===null?'(sin responder)':L[r[j]]+') '+esc(it.o[r[j]])}</div><div class="okt">Correcta: ${L[it.k]}) ${esc(it.o[it.k])}</div><div class="mini">${esc(it.e)}</div></div>`).join('')||'<p>¡Sin errores!</p>'}</div>`;
 SS('alc_ultimo',res)}
/* ---------- calificación ---------- */
function vCalif(){if(!BANK){V.innerHTML=sinBanco();bindImp();return}const cfg=CFG(),u=LS('alc_ultimo',null),d=LS('alc_calc_'+esqId(),{}),np=parN(),sup=esqId()==='superioridad';
 const conv=BANK.conversion||{};
 V.innerHTML=`<div class="card">${selEsq()}</div><div class="card"><h1>Calificación del parcial</h1><p class="muted">Examen ${cfg.examen*100}% · portafolio de evidencias ${cfg.portafolio*100}% · participación ${cfg.participacion*100}% (escala 0–10).</p>
 <div class="row"><div><label class="f">Examen</label><input type="number" step="0.1" min="0" max="10" id="ex" value="${d.ex??(u&&u.fuente==='alc'?u.cal:'')}"></div><div><label class="f">Portafolio</label><input type="number" step="0.1" min="0" max="10" id="po" value="${d.po??''}"></div><div><label class="f">Participación</label><input type="number" step="0.1" min="0" max="10" id="pa" value="${d.pa??''}"></div></div>
 <p>Calificación del parcial: <b id="cp" class="big" style="font-size:1.6rem">—</b></p>${u?`<p class="mini">Último examen en este dispositivo: ${esc(u.eval)} · ${u.cal.toFixed(1)}</p>`:''}</div>
 <div class="card"><h1>Calificación final</h1><p class="muted">${sup?`Parciales ${cfg.parciales*100}% (10 % c/u) + final del semestre ${cfg.final*100}%.`:`Promedio de los ${np} parciales ${cfg.parciales*100}% + examen final ALCPT ${cfg.final*100}%.`} Mínima ${cfg.minima}.</p>
 <div class="row">${Array.from({length:np},(_,i)=>`<div><label class="f">Parcial ${i+1}</label><input type="number" step="0.1" id="p${i+1}" value="${d['p'+(i+1)]??''}"></div>`).join('')}
 <div><label class="f">${sup?'Final del semestre (0–10)':'ALCPT final (puntos)'}</label><input type="number" step="0.1" id="af" value="${d.af??''}"></div></div>
 ${sup?'':`<label class="f">Pasar los puntos ALCPT a calificación con</label><select id="tb"><option value="">Puntos de 0–100 ÷ 10</option>${Object.entries(conv).map(([k,t])=>`<option value="${k}" ${d.tb===k?'selected':''}>${esc(t.nombre)}</option>`).join('')}</select>`}
 <p>Promedio de parciales: <b id="pp">—</b> · ${sup?'':'ALCPT final: <b id="afc">—</b> · '}Calificación final: <b id="cf" class="big" style="font-size:1.6rem">—</b></p>
 <p class="mini">Si el examen final no se acredita, el cadete presenta el extraordinario con otra versión del ALCPT (pestaña «Final»); si lo aprueba, la calificación que se asienta es 6.0.</p></div>
 <div class="card"><h2>Ponderaciones (${esc(ESQ().nombre)})</h2><div class="row">${['examen','portafolio','participacion','parciales','final','minima'].map(k=>`<div><label class="f">${{examen:'Examen',portafolio:'Portafolio',participacion:'Participación',parciales:'Parciales',final:sup?'Final del semestre':'ALCPT final',minima:'Mínima aprobatoria'}[k]}</label><input type="number" step="0.05" data-cfg="${k}" value="${cfg[k]}"></div>`).join('')}</div></div>`;
 bindEsq(vCalif);
 const n=id=>{const e=$('#'+id);if(!e)return null;const v=parseFloat(e.value);return isNaN(v)?null:v};
 const calc=()=>{const c=CFG();const s={};['ex','po','pa','af','tb',...Array.from({length:np},(_,i)=>'p'+(i+1))].forEach(k=>{const e=$('#'+k);if(e)s[k]=e.value});SS('alc_calc_'+esqId(),s);
  const ex=n('ex'),po=n('po'),pa=n('pa');$('#cp').textContent=ex!==null&&po!==null&&pa!==null?(Math.round(10*(ex*c.examen+po*c.portafolio+pa*c.participacion))/10).toFixed(1):'—';
  const ps=Array.from({length:np},(_,i)=>n('p'+(i+1))).filter(x=>x!==null);const pr=ps.length?ps.reduce((a,b)=>a+b,0)/ps.length:null;$('#pp').textContent=pr===null?'—':pr.toFixed(1);
  let af=n('af');if(!sup&&af!==null){const tb=$('#tb').value;const cv=tb?convertir(af,tb):null;af=tb?(cv??Math.min(5,af/10)):af/10;$('#afc').textContent=af.toFixed(1)+(tb&&cv==null?' (no acreditado)':'')}
  const cf=pr!==null&&af!==null&&ps.length===np?Math.round(10*(pr*c.parciales+af*c.final))/10:null;const e=$('#cf');
  e.textContent=cf===null?'—':cf.toFixed(1)+(cf>=c.minima&&af>=c.minima?' · Aprobado':' · No aprobado'+(af<c.minima?' (final no acreditado → extraordinario)':''));e.className='big '+(cf===null?'':cf>=c.minima&&af>=c.minima?'okt':'badt')};
 V.querySelectorAll('input[id],select#tb').forEach(i=>i.oninput=i.onchange=calc);
 V.querySelectorAll('[data-cfg]').forEach(i=>i.onchange=()=>{const o=LS('alc_cfg_'+esqId(),{});o[i.dataset.cfg]=parseFloat(i.value);SS('alc_cfg_'+esqId(),o);vCalif()});calc()}
/* ---------- resultados ---------- */
function tablaRes(a){const m=CFG().minima;return `<div class="tw"><table><tr><th>Fecha</th><th>Cadete</th><th>Prueba</th><th>Curso</th><th>Evaluación</th><th>Modo</th><th>Aciertos</th><th>%</th><th>Cal.</th></tr>${a.map(r=>`<tr><td>${r.fecha.slice(0,10)}</td><td>${esc(r.nom||'—')}</td><td>${r.fuente==='final'?'FINAL':r.fuente.toUpperCase()}</td><td>${esc(r.curso||r.sem||'—')}</td><td>${esc(r.eval)}</td><td>${r.modo==='examen'?'Examen':'Práctica'}</td><td>${r.ok}/${r.n}</td><td>${r.pct}</td><td class="${r.cal>=m?'okt':'badt'}">${r.cal.toFixed(1)}</td></tr>`).join('')}</table></div>`}
function vRes(){const a=RES().slice().reverse();
 V.innerHTML=`<div class="card"><h1>Resultados</h1><p class="muted">Guardados solo en este dispositivo.</p>${a.length?tablaRes(a):'<p>Aún no hay resultados.</p>'}
 <div class="row noprint"><button class="btn" id="csv" ${a.length?'':'disabled'}>Exportar CSV</button><button class="btn sec" onclick="print()">Imprimir</button><button class="btn peligro" id="del" ${a.length?'':'disabled'}>Borrar resultados</button></div></div>
 ${a.length?`<div class="card"><h2>Promedios (solo exámenes)</h2>${resumen(a)}</div>`:''}`;
 $('#csv').onclick=()=>{const h=['Fecha','Cadete','Prueba','Esquema','Curso','Parcial','Forma','Evaluación','Modo','Reactivos calificados','Sin clave','Aciertos','Porcentaje','Calificación','Auditiva','Lectura','Minutos'];
  const rows=RES().map(r=>[r.fecha,r.nom,r.fuente.toUpperCase(),r.esq||'',r.curso||r.sem,r.par,r.forma,r.eval,r.modo,r.n,r.sinClave||0,r.ok,r.pct,r.cal,r.L?r.L.join('/'):'',r.R?r.R.join('/'):'',r.min]);
  const csv='\uFEFF'+[h,...rows].map(x=>x.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const l=document.createElement('a');l.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));l.download='resultados_alcpt_alc_'+hoy()+'.csv';l.click()};
 $('#del').onclick=()=>{if(confirm('¿Borrar todos los resultados de este dispositivo?')){setRES([]);vRes()}}}
function resumen(a){const g={};a.filter(r=>r.modo==='examen').forEach(r=>{const k=`${r.fuente.toUpperCase()}|${r.curso||r.sem||'—'}|${r.eval}`;(g[k]=g[k]||[]).push(r.cal)});
 const ks=Object.keys(g).sort();return ks.length?`<div class="tw"><table><tr><th>Prueba</th><th>Curso</th><th>Evaluación</th><th>Exámenes</th><th>Promedio</th></tr>${ks.map(k=>{const [f,s,e]=k.split('|'),v=g[k];return `<tr><td>${f}</td><td>${esc(s)}</td><td>${esc(e)}</td><td>${v.length}</td><td>${(v.reduce((x,y)=>x+y,0)/v.length).toFixed(1)}</td></tr>`}).join('')}</table></div>`:'<p class="muted">Sin exámenes todavía.</p>'}
/* ---------- banco ---------- */
function vBanco(){const cnt=(src,f)=>pool(Object.assign({fuente:src,sec:'',tipo:''},f)).length;
 V.innerHTML=(BANK?`<div class="card"><h1>Banco</h1><p>Versión <b>${esc(BANK.version)}</b> (${esc(BANK.fecha)}) · ${BANK.alc.length} ALC · ${BANK.alcpt.length} ALCPT.</p>${selEsq()}
 <h3>ALC por curso y parcial</h3><div class="tw"><table><tr><th>Curso</th>${Array.from({length:parN()},(_,i)=>`<th>P${i+1}</th>`).join('')}<th>Total</th></tr>${cursos().map(c=>`<tr><td>${esc(c.nombre)}</td>${Array.from({length:parN()},(_,i)=>`<td>${cnt('alc',{alcance:'parcial',curso:c.id,par:i+1})}</td>`).join('')}<td>${cnt('alc',{alcance:'semestral',curso:c.id})}</td></tr>`).join('')}</table></div>
 <h3>ALC por libro</h3><p>${[...new Set(BANK.alc.map(i=>i.libro))].sort((a,b)=>a-b).map(b=>`<span class="tag">Book ${b}: ${BANK.alc.filter(i=>i.libro===b).length}</span>`).join('')}</p>
 <h3>ALCPT por curso y parcial</h3><div class="tw"><table><tr><th>Curso</th>${Array.from({length:parN()},(_,i)=>`<th>P${i+1}</th>`).join('')}<th>Total</th></tr>${cursos().map(c=>`<tr><td>${esc(c.nombre)}</td>${Array.from({length:parN()},(_,i)=>`<td>${cnt('alcpt',{alcance:'parcial',curso:c.id,par:i+1})}</td>`).join('')}<td>${cnt('alcpt',{alcance:'semestral',curso:c.id})}</td></tr>`).join('')}</table></div>
 <p class="mini">ALCPT por forma: ${[...new Set(BANK.alcpt.map(i=>i.forma))].sort().map(x=>`${x}: ${BANK.alcpt.filter(i=>i.forma===x).length}`).join(' · ')}</p>
 <label class="btn">Reemplazar banco<input type="file" class="imp" accept=".json,application/json" hidden></label><button class="btn peligro" id="qb">Quitar banco de este dispositivo</button></div>`:sinBanco())+
 `<div class="card"><h2>Formas originales</h2><p class="muted">${ORIG?`${ORIG.formas.length} formas importadas (${ORIG.formas.reduce((a,f)=>a+f.n,0)} reactivos).`:'No importadas.'} Se usan en la pestaña «Final».</p><label class="btn sec">Importar formas originales<input type="file" class="imp" accept=".json" hidden></label></div>
 <div class="card"><h2>Voz</h2><p class="muted">La comprensión auditiva usa la voz en inglés del dispositivo. En examen se puede escuchar cada audio 2 veces.</p><label class="f">Velocidad</label><select id="rate">${[[.8,'Lenta'],[.9,'Normal'],[1,'Rápida']].map(([v,t])=>`<option value="${v}" ${+(localStorage.getItem('alc_rate')||.9)===v?'selected':''}>${t}</option>`).join('')}</select><button class="btn sec" id="prueba">Probar voz</button></div>
 <p class="mini">ALCPT y ALC por parciales v${VER} · Esc. Mil. Enfría. · No afiliada al DLIELC. El banco y las formas son confidenciales y no se publican.</p>`;
 bindImp();bindEsq(vBanco);const q=$('#qb');if(q)q.onclick=async()=>{if(confirm('¿Quitar el banco de este dispositivo? Tus resultados se conservan.')){await idbDel('bank');BANK=null;vBanco()}};
 $('#rate').onchange=e=>localStorage.setItem('alc_rate',e.target.value);$('#prueba').onclick=()=>hablar('M: Good morning, Cadet. Where is the clinic?\nW: It is next to the main gate, sir.')}
/* ---------- arranque ---------- */
render();
if(window.indexedDB)Promise.all([idbGet('bank'),idbGet('orig')]).then(([b,o])=>{if(b&&b.alcpt)BANK=b;if(o&&o.formas)ORIG=o;if(!EX)render()}).catch(()=>{});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
