'use strict';
/* ALCPT y ALC por parciales · v2.6
   La app se publica VACÍA. Se importan en cada dispositivo (IndexedDB):
   1) banco_alcpt_alc_privado.json  2) formas del Final (PDF original o JSON/CSV) y sus audios (MP3/M4A), que se cargan cuando estén disponibles. */
const VER='2.6';
const $=s=>document.querySelector(s),V=$('#v');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2400)};
const fechaL=d=>{const x=new Date(d);return isNaN(x)?String(d).slice(0,10):`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const hoy=()=>fechaL(new Date());
const L='ABCD';
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},SS=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
/* ---------- almacenamiento ---------- */
function idb(){return new Promise((ok,ko)=>{const r=indexedDB.open('alcpt_alc',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)})}
async function idbGet(k){const d=await idb();return new Promise((ok,ko)=>{const r=d.transaction('kv').objectStore('kv').get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)})}
async function idbSet(k,v){const d=await idb();return new Promise((ok,ko)=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>ok();t.onerror=()=>ko(t.error)})}
async function idbDel(k){const d=await idb();return new Promise(ok=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=()=>ok()})}
let BANK=null;
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
const TABS=[['inicio','Inicio'],['alc','ALC · Parcial 1 y 2'],['alcpt','ALCPT'],['final','Examen final'],['calif','Calificación'],['resultados','Resultados'],['banco','Banco']];
function nav(){const h=(location.hash||'#inicio').slice(1).split('/')[0];$('#nav').innerHTML=TABS.map(([k,t])=>`<a href="#${k}" class="${h===k?'on':''}">${t}</a>`).join('')}
window.addEventListener('hashchange',render);
function render(){nav();const h=(location.hash||'#inicio').slice(1).split('/')[0];
 if(EX&&h!=='examen'){if(!confirm('¿Salir del examen en curso? Se perderá.')){location.hash='#examen';return}EX=null;if(AUD)AUD.pause();if(PISTA){PISTA.el.pause();PISTA=null}speechSynthesis&&speechSynthesis.cancel()}
 ({inicio:vInicio,alcpt:vALCPT,alc:vALC,final:vFinal,calif:vCalif,resultados:vRes,banco:vBanco,examen:vExamen}[h]||vInicio)();window.scrollTo(0,0);animar()}
let ANIM=0;function animar(){V.classList.remove('enter');void V.offsetWidth;V.classList.add('enter');clearTimeout(ANIM);ANIM=setTimeout(()=>V.classList.remove('enter'),700);const a=$('#nav a.on');if(a&&a.scrollIntoView)a.scrollIntoView({block:'nearest',inline:'center'})}
let LISTO=false;
const sinBanco=()=>LISTO?`<div class="card hero"><h1>¡Bienvenida! 👋</h1><p class="muted">Para empezar, carga el banco de reactivos. Solo se hace una vez por dispositivo: se guarda aquí y nada se publica.</p></div>
<div class="card"><label class="drop" id="drop"><span class="ico">📂</span><b style="font-size:1.1rem">Importar banco de reactivos</b><span class="muted">Toca para elegir <b>banco_alcpt_alc_privado.json</b> o arrástralo aquí</span><span class="btn">Elegir archivo</span><input type="file" class="imp" accept=".json,application/json" hidden></label>
<ol class="pasos"><li>Importa el banco (.json) que recibiste.</li><li>Practica o evalúa ALC (Parcial 1 y 2) y ALCPT.</li><li>Para el examen final, sube las formas originales del ALCPT en PDF y sus audios MP3 en «Examen final».</li></ol></div>`:`<div class="card"><p class="muted">Cargando…</p></div>`;
function bindImp(){document.querySelectorAll('input.imp').forEach(i=>i.onchange=importar);const d=$('#drop');if(d){['dragenter','dragover'].forEach(t=>d.addEventListener(t,e=>{e.preventDefault();d.classList.add('over')}));['dragleave','drop'].forEach(t=>d.addEventListener(t,e=>{e.preventDefault();d.classList.remove('over')}));d.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f)importarArchivo(f)})}}
function importar(e){const f=e.target.files[0];if(f)importarArchivo(f);e.target.value=''}
function importarArchivo(f){const r=new FileReader();r.onload=async()=>{let b;
 try{b=JSON.parse(String(r.result).replace(/^\uFEFF/,''))}catch(x){alert('El archivo no es JSON válido.');return}
 if(!b||b.tipo!=='banco_alcpt_alc'||!Array.isArray(b.alcpt)||!Array.isArray(b.alc)){alert('Este archivo no es un banco ALCPT/ALC. Las formas del Final se cargan en la pestaña «Final».');return}
 BANK=b;try{await idbSet('bank',b)}catch(x){alert('No se pudo guardar en el dispositivo: '+x.message)}
 toast(`Banco v${b.version} importado: ${b.alcpt.length} ALCPT + ${b.alc.length} ALC`);location.hash='#inicio';render();celebrar(90)};r.readAsText(f)}
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
function selEsq(){const es=BANK.esquemas||{};if(Object.keys(es).length<2)return `<p class="mini">${esc((es[esqId()]||{}).nombre||'')}</p>`;return `<label class="f">Esquema de la materia</label><select id="esq">${Object.entries(es).map(([k,e])=>`<option value="${k}" ${k===esqId()?'selected':''}>${esc(e.nombre)}</option>`).join('')}</select>`}
function bindEsq(fn){const s=$('#esq');if(s)s.onchange=()=>{SS('alc_esq',s.value);F={};fn()}}
function vInicio(){if(!BANK){V.innerHTML=sinBanco();bindImp();return}
 const r=RES().slice(-5).reverse(),E=ESQ();
 const ex=RES().filter(x=>x.modo==='examen'),prom=ex.length?(ex.reduce((a,x)=>a+x.cal,0)/ex.length).toFixed(1):'—';
 V.innerHTML=`<div class="card hero"><h1>Hola 👋 ¿Qué evaluamos hoy?</h1><p class="muted">ALCPT y ALC por parciales · banco v${esc(BANK.version)}</p>
 <div class="stats"><div class="stat"><b>${BANK.alc.length}</b>ALC (Books ${Math.min(...BANK.alc.map(i=>i.libro))}–${Math.max(...BANK.alc.map(i=>i.libro))})</div><div class="stat"><b>${BANK.alcpt.length}</b>ALCPT</div><div class="stat"><b>${FORMAS.length}</b>formas del final</div><div class="stat"><b>${prom}</b>promedio</div></div></div>
 <div class="tiles"><a class="tile t1" href="#alc/p1"><i>📘</i>ALC · Parcial 1<small>Evaluación del primer libro</small></a><a class="tile t2" href="#alc/p2"><i>📗</i>ALC · Parcial 2<small>Evaluación del segundo libro</small></a><a class="tile t3" href="#alcpt"><i>🎧</i>ALCPT<small>Por semestre, parcial o forma</small></a><a class="tile t4" href="#final"><i>🏁</i>Examen final<small>Formas PDF y audios MP3</small></a><a class="tile t5" href="#calif"><i>🧮</i>Calificación<small>Parcial y final</small></a><a class="tile t6" href="#alc"><i>📚</i>Más ALC<small>Semestral, libro o lección</small></a></div>
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
 V.innerHTML=`<div class="card"><h1>${fuente==='alc'?'ALC · Evaluación Parcial 1 y 2':'ALCPT'}</h1>${selEsq()}
 <label class="f">Evaluar</label>${seg('alcance',alc,f.alcance)}
 ${f.alcance==='forma'?`<label class="f">Forma</label>${seg('forma',formas.map(x=>[x,x==='V'?'V (vocabulario ALC 19–30)':x]),f.forma)}<p class="mini">Formas A–H: 100 reactivos (50 auditiva + 50 lectura). Para el examen final con formas y audios cargados usa la pestaña «Final ALCPT».</p>`:
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
 <label class="f">Nombre del estudiante (opcional, para el registro)</label><input type="text" id="nom" value="${esc(localStorage.getItem('alc_nom')||'')}" placeholder="Ej. García Rodríguez">
 <button class="btn xl" id="go" ${cnt?'':'disabled'}>Comenzar</button></div>
 ${fuente==='alc'&&bs.length?`<div class="card"><h2>Contenido</h2>${bs.map(b=>{const l=BANK.libros[b]||{};return `<p><span class="tag">Book ${b}</span> ${l.programa?l.programa.map(esc).join('<br>'):[1,2,3,4].map(i=>`L${i}: ${esc((l.lecciones||{})[i]||'')}`).join('<br>')}${l.tema?`<br><span class="mini">Complementarios: ${esc(l.tema)}</span>`:''}</p>`}).join('')}</div>`:''}`;
 bindEsq(()=>vSel(fuente));
 V.querySelectorAll('.seg').forEach(s=>s.onclick=e=>{const b=e.target.closest('button');if(!b)return;f[s.dataset.k]=b.dataset.v;if(s.dataset.k==='alcance'){if(b.dataset.v==='forma'){f.n='100'}else if(f.n==='100')f.n=fuente==='alc'?'30':'50';if(b.dataset.v==='libro'&&!f.libro)f.libro=String(curso(f.curso).libros[0])}if(s.dataset.k!=='lec'&&s.dataset.k!=='modo'&&s.dataset.k!=='par')f.lec=f.alcance==='libro'?f.lec:'';vSel(fuente)});
 const up=()=>{['curso','libro','sec','tipo','n'].forEach(k=>{const e=$('#'+k);if(e)f[k]=e.value});f.acum=$('#acum')?$('#acum').checked:false;f.comp=$('#comp')?$('#comp').checked:f.comp};
 ['#curso','#libro','#sec','#tipo','#acum','#comp'].forEach(s=>{const e=$(s);if(e)e.onchange=()=>{up();if(s==='#curso')f.lec='';vSel(fuente)}});
 $('#go').onclick=()=>{up();localStorage.setItem('alc_nom',$('#nom').value.trim());iniciar(fuente,f,$('#nom').value.trim())}}
const vALCPT=()=>vSel('alcpt');
function vALC(){const m=(location.hash.split('/')[1]||'').match(/^p([12])$/);if(m&&BANK){const f=filtros('alc');f.alcance='parcial';f.par=m[1];history.replaceState(null,'','#alc')}vSel('alc')}
/* ---------- final: formas y audios que se cargan después ---------- */
/* Formato JSON: {"tipo":"formas_alcpt","formas":[{"id":"F1","titulo":"…","items":[{"n":1,"sec":"L","s":"guion opcional","q":"pregunta","o":["a","b","c","d"],"k":"B"}]}]}
   Formato CSV (encabezado): forma,titulo,n,seccion,guion,pregunta,a,b,c,d,clave   (seccion = L o R; clave = A–D) */
let FORMAS=[];
const fKey=(fid,n)=>'aud|'+fid+'|'+(n==null?'forma':n);
async function guardarFormas(){await idbSet('formas',FORMAS)}
function normItem(it,j){const o=(it.o||[it.a,it.b,it.c,it.d]).map(x=>String(x??'').trim()).filter(x=>x!=='');let k=it.k;if(typeof k==='string')k=k.trim()?L.indexOf(k.trim().toUpperCase()[0]):null;if(!(k>=0&&k<o.length))k=null;
 const sec=/^(l|aud|list)/i.test(String(it.sec||it.seccion||''))?'L':'R';return {n:+it.n||j+1,sec,s:String(it.s||it.guion||'').replace(/\\n/g,'\n'),q:String(it.q||it.pregunta||''),o,k}}
function parseCSV(t){const rows=[];let r=[],c='',q=false;t=t.replace(/^\uFEFF/,'');const sep=(t.split('\n')[0].match(/;/g)||[]).length>(t.split('\n')[0].match(/,/g)||[]).length?';':',';
 for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}else if(ch==='"')q=true;else if(ch===sep){r.push(c);c=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;r.push(c);c='';if(r.some(x=>x.trim()))rows.push(r);r=[]}else c+=ch}
 r.push(c);if(r.some(x=>x.trim()))rows.push(r);return rows}
function formasDeCSV(t,nombre){const rows=parseCSV(t);if(rows.length<2)throw new Error('El CSV está vacío.');const h=rows[0].map(x=>x.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''));
 const ix=k=>h.indexOf(k);if(ix('pregunta')<0&&ix('a')<0)throw new Error('Faltan columnas. Usa: forma,titulo,n,seccion,guion,pregunta,a,b,c,d,clave');
 const by={};rows.slice(1).forEach(r=>{const g=k=>ix(k)>=0?(r[ix(k)]||'').trim():'';const id=g('forma')||nombre.replace(/\.[^.]+$/,'');(by[id]=by[id]||{id,titulo:g('titulo')||('Forma '+id),items:[]}).items.push({n:g('n'),sec:g('seccion'),s:g('guion'),q:g('pregunta'),a:g('a'),b:g('b'),c:g('c'),d:g('d'),k:g('clave')})});return Object.values(by)}
function agregarFormas(lst){let n=0;lst.forEach(f=>{const id=String(f.id||f.titulo||('F'+(FORMAS.length+1))).trim();const items=(f.items||[]).map(normItem).filter(i=>i.o.length>=2);if(!items.length)return;
 const nf={id,titulo:f.titulo||('Forma '+id),fuente:f.fuente||'',items,fecha:hoy()};const i=FORMAS.findIndex(x=>x.id===id);if(i>=0)FORMAS[i]=nf;else FORMAS.push(nf);n++});return n}
function importarForma(e){const fl=[...e.target.files];if(!fl.length)return;let tot=0,errs=[];
 Promise.all(fl.map(f=>f.text().then(t=>{try{if(/\.csv$/i.test(f.name)||!/^\s*[\[{]/.test(t)){tot+=agregarFormas(formasDeCSV(t,f.name))}else{const j=JSON.parse(t.replace(/^\uFEFF/,''));
   if(j.tipo==='formas_originales_alcpt')throw new Error('este archivo (formas recopiladas no confiables) no se carga en la app');
   tot+=agregarFormas(Array.isArray(j)?j:(j.formas||[j]))}}catch(x){errs.push(f.name+': '+x.message)}}))).then(async()=>{await guardarFormas();if(errs.length)alert(errs.join('\n'));if(tot)toast(`Formas cargadas: ${tot}`);vFinal()})}
async function adjuntarAudio(fid,n,file){if(!file)return;if(!/^audio\//.test(file.type)&&!/\.(mp3|m4a|aac|wav|ogg)$/i.test(file.name)){alert('Elige un archivo de audio (mp3 o m4a).');return}
 await idbSet(fKey(fid,n),{name:file.name,type:file.type||'audio/mpeg',blob:file});const f=FORMAS.find(x=>x.id===fid);if(f){f.aud=f.aud||{};f.aud[n==null?'forma':n]=file.name;await guardarFormas()}}
function nombreANum(nm){const m=nm.replace(/\.[^.]+$/,'').match(/(\d{1,3})(?!.*\d)/);return m?+m[1]:null}
async function audioURL(fid,n){const r=await idbGet(fKey(fid,n));return r?URL.createObjectURL(r.blob):null}
let FF={forma:'',parte:'',modo:'examen',tabla:''};
function vFinal(){const conv=BANK&&BANK.conversion||{};
 if(!FORMAS.some(f=>f.id===FF.forma))FF.forma=(FORMAS[0]||{}).id||'';const fm=FORMAS.find(f=>f.id===FF.forma);
 const sel=fm?fm.items.filter(i=>!FF.parte||i.sec===FF.parte):[];const conK=sel.filter(i=>i.k!=null).length;const aud=fm&&fm.aud||{};
 const esPDF=fm&&fm.tipo==='pdf',conKF=fm?fm.items.filter(i=>i.k!=null).length:0,hp=fm?HOJAS().filter(h=>h.fid===fm.id):[];
 const nL=sel.filter(i=>i.sec==='L').length,conA=sel.filter(i=>i.sec==='L'&&aud[i.n]).length;
 V.innerHTML=`<div class="card"><h1>Examen final ALCPT</h1><p class="muted">Agrega aquí las formas originales del ALCPT (PDF) y sus audios (MP3) para el examen final o el extraordinario. La clave es opcional. Todo se guarda <b>solo en este dispositivo</b>; nada se publica.</p>
 <h2>Agregar forma original (PDF)</h2><p class="mini">El PDF de la forma se guarda en este dispositivo y se ve dentro de la app. Después adjunta el audio MP3 y, si la tienes, captura la clave.</p>
 <div class="row"><div><label class="f">Nombre de la forma</label><input type="text" id="ptit" placeholder="p. ej. ALCPT Forma 125"></div><div><label class="f">Reactivos</label><input type="number" id="pn" value="100" min="1" max="300"></div><div><label class="f">De ellos, comprensión auditiva</label><input type="number" id="pnl" value="50" min="0" max="300"></div></div>
 <label class="btn">Elegir PDF de la forma<input type="file" id="ppdf" accept="application/pdf,.pdf" hidden></label><span class="mini" id="ppdfn"></span> <button class="btn" id="pgua">Guardar forma PDF</button>
 <h2>O cargar forma como datos (opcional)</h2><label class="btn sec">Cargar forma (JSON o CSV)<input type="file" id="impf" accept=".json,.csv,application/json,text/csv" multiple hidden></label><button class="btn sec" id="plant">Descargar plantilla CSV</button>
 <p class="mini">CSV: <code>forma,titulo,n,seccion,guion,pregunta,a,b,c,d,clave</code> · sección L (auditiva) o R (lectura) · clave A–D. Un archivo puede traer varias formas.</p>
 ${FORMAS.length?`<div class="tw"><table><tr><th>Forma</th><th>Tipo</th><th>Reactivos</th><th>Auditiva / Lectura</th><th>Con clave</th><th>Audios</th></tr>${FORMAS.map(f=>{const a=f.aud||{};const L1=f.items.filter(i=>i.sec==='L');return `<tr><td>${esc(f.titulo)}</td><td>${f.tipo==='pdf'?'PDF':'datos'}</td><td>${f.items.length}</td><td>${L1.length} / ${f.items.length-L1.length}</td><td>${f.items.filter(i=>i.k!=null).length}</td><td>${a.forma?'pista completa':''}${a.forma&&Object.keys(a).length>1?' + ':''}${Object.keys(a).filter(x=>x!=='forma').length?Object.keys(a).filter(x=>x!=='forma').length+' por reactivo':''}${!Object.keys(a).length?'—':''}</td></tr>`}).join('')}</table></div>`:'<p class="muted">Aún no hay formas cargadas.</p>'}</div>
 ${fm?`<div class="card"><h2>Aplicar</h2><label class="f">Forma</label><select id="forma">${FORMAS.map(f=>`<option value="${esc(f.id)}" ${f.id===FF.forma?'selected':''}>${esc(f.titulo)}</option>`).join('')}</select>
 <label class="f">Parte</label>${seg('parte',[['','Completa'],['L','Solo comprensión auditiva'],['R','Solo lectura']],FF.parte)}
 <p class="muted">${sel.length} reactivos · <b>${conK}</b> con clave${sel.length-conK?` · <span class="badt">${sel.length-conK} sin clave (no cuentan)</span>`:''}${nL?` · auditiva: ${conA} con audio propio${aud.forma?', pista completa cargada':''}`:''}.</p>
 <label class="f">Tabla de conversión a calificación</label><select id="tabla"><option value="">Porcentaje (aciertos ÷ reactivos con clave × 10)</option>${Object.entries(conv).map(([k,t])=>`<option value="${k}" ${FF.tabla===k?'selected':''}>${esc(t.nombre)} · mínimo ${t.t[t.t.length-1][0]} pts</option>`).join('')}</select>
 <label class="f">Modo</label>${seg('modo',[['examen','Examen final / extraordinario'],['practica','Práctica']],FF.modo)}
 <label class="f">Nombre del estudiante (opcional)</label><input type="text" id="nom" value="${esc(localStorage.getItem('alc_nom')||'')}">
 ${esPDF?`<button class="btn xl" id="go">Comenzar con hoja de respuestas</button>${conK?'':'<p class="mini">Sin clave: las hojas se guardan pendientes y se califican al capturar la clave.</p>'}`:`<button class="btn xl" id="go" ${conK?'':'disabled'}>Comenzar</button>${conK?'':'<p class="badt">La forma no tiene clave: vuelve a cargarla con la columna «clave».</p>'}`}</div>
 ${esPDF?`<div class="card"><h2>PDF de la forma</h2><p class="mini">${esc(fm.pdf||'')} · ${fm.items.length} reactivos (${fm.nL||0} auditiva)</p><button class="btn sec" id="verpdf">Ver PDF</button><label class="btn sec">Reemplazar PDF<input type="file" id="reppdf" accept="application/pdf,.pdf" hidden></label><div id="pdfbox"></div></div>
 <div class="card"><h2>Clave (opcional)</h2><p class="mini">Escribe las letras en orden (<code>ABDC CABD…</code>; usa <code>-</code> si falta alguna) o con número (<code>1 A, 2 C…</code>). También puedes cargar un CSV con columnas <code>n,clave</code>.</p><textarea id="clv" rows="4" spellcheck="false" style="width:100%;font:1rem monospace">${conKF?claveTxt(fm):''}</textarea><div><button class="btn" id="gclv">Guardar clave</button><label class="btn sec">Clave desde CSV<input type="file" id="clvcsv" accept=".csv,text/csv,.txt" hidden></label>${conKF?'<button class="btn sec" id="bclv">Borrar clave</button>':''}</div><p class="mini">${conKF}/${fm.items.length} reactivos con clave.</p></div>`:''}
 ${hp.length?`<div class="card"><h2>Hojas pendientes de calificar</h2><p class="mini">Se califican con la tabla de conversión elegida arriba.</p><div class="tw"><table><tr><th>Fecha</th><th>Estudiante</th><th>Contestados</th><th></th></tr>${hp.map(h=>`<tr><td>${fechaL(h.fecha)}</td><td>${esc(h.nom||'—')}</td><td>${h.r.filter(x=>x!==null).length}/${h.r.length}</td><td><button class="btn sm" data-h="${h.id}" ${conKF?'':'disabled'}>Calificar</button><button class="btn sm sec" data-hq="${h.id}">Quitar</button></td></tr>`).join('')}</table></div></div>`:''}
 <div class="card"><h2>Audios de la forma</h2><p class="muted">MP3 (o m4a). Puedes cargar una <b>pista completa</b> de la parte auditiva y/o un audio <b>por reactivo</b>. Si eliges varios archivos a la vez, se asignan por el último número del nombre (p. ej. <i>item_07.mp3</i> → reactivo 7). En examen cada audio por reactivo se escucha hasta 2 veces.</p>
 <label class="btn">Pista completa${aud.forma?' (reemplazar)':''}<input type="file" id="audf" accept="audio/*,.mp3,.m4a" hidden></label><label class="btn sec">Audios por reactivo<input type="file" id="audn" accept="audio/*,.mp3,.m4a" multiple hidden></label>${aud.forma?`<audio controls preload="none" id="pf" style="width:100%;margin-top:6px"></audio>`:''}
 <div class="tw"><table><tr><th>Reactivo</th><th>Pregunta</th><th>Audio</th><th></th></tr>${fm.items.filter(i=>i.sec==='L').map(i=>`<tr><td>${i.n}</td><td>${esc((i.q||i.s||(esPDF?'(en el PDF)':'')).slice(0,60))}</td><td>${aud[i.n]?esc(aud[i.n]):(i.s?'voz (guion)':'—')}</td><td><label class="btn sm sec">${aud[i.n]?'Cambiar':'Adjuntar'}<input type="file" class="audi" data-n="${i.n}" accept="audio/*,.mp3,.m4a" hidden></label>${aud[i.n]?`<button class="btn sm sec qa" data-n="${i.n}">Quitar</button>`:''}</td></tr>`).join('')||'<tr><td colspan="4">La forma no tiene reactivos de auditiva.</td></tr>'}</table></div></div>
 <div class="card noprint">${esPDF?'':'<button class="btn sec" id="imprimir">Imprimir cuadernillo y clave</button>'}<button class="btn peligro" id="qf">Quitar esta forma${esPDF?', su PDF':''} y sus audios</button></div>`:''}`;
 $('#impf').onchange=importarForma;$('#ppdf').onchange=e=>{$('#ppdfn').textContent=(e.target.files[0]||{}).name||''};$('#pgua').onclick=guardarFormaPDF;
 $('#plant').onclick=()=>{const csv='\uFEFFforma,titulo,n,seccion,guion,pregunta,a,b,c,d,clave\r\nF1,Forma de ejemplo,1,L,"M: Where is the clinic?\\nW: Next to the main gate.",Where is the clinic?,Behind the gym,Next to the main gate,In the barracks,At the airport,B\r\nF1,Forma de ejemplo,2,R,,She ___ a nurse.,is,are,am,be,A\r\n';const l=document.createElement('a');l.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));l.download='plantilla_forma_alcpt.csv';l.click()};
 if(!fm)return;
 $('#forma').onchange=e=>{FF.forma=e.target.value;vFinal()};$('#tabla').onchange=e=>{FF.tabla=e.target.value};
 V.querySelectorAll('.seg').forEach(s=>s.onclick=e=>{const b=e.target.closest('button');if(!b)return;FF[s.dataset.k]=b.dataset.v;vFinal()});
 if(aud.forma)audioURL(fm.id,null).then(u=>{const p=$('#pf');if(p&&u)p.src=u});
 $('#audf').onchange=async e=>{await adjuntarAudio(fm.id,null,e.target.files[0]);toast('Pista completa guardada');vFinal()};
 $('#audn').onchange=async e=>{const fl=[...e.target.files];const nums=fm.items.filter(i=>i.sec==='L').map(i=>i.n);let ok=0,no=[];for(const f of fl){const n=nombreANum(f.name);if(n!=null&&nums.includes(n)){await adjuntarAudio(fm.id,n,f);ok++}else no.push(f.name)}toast(`Audios asignados: ${ok}`);if(no.length)alert('Sin reactivo de auditiva que coincida:\n'+no.join('\n'));vFinal()};
 V.querySelectorAll('input.audi').forEach(i=>i.onchange=async e=>{await adjuntarAudio(fm.id,+i.dataset.n,e.target.files[0]);toast('Audio guardado');vFinal()});
 V.querySelectorAll('.qa').forEach(b=>b.onclick=async()=>{await idbDel(fKey(fm.id,+b.dataset.n));delete fm.aud[b.dataset.n];await guardarFormas();vFinal()});
 if($('#imprimir'))$('#imprimir').onclick=()=>imprimirForma(fm);
 if(esPDF){$('#verpdf').onclick=()=>verPDF(fm.id,$('#pdfbox'));
  $('#reppdf').onchange=async e=>{const f=e.target.files[0];if(!f)return;await idbSet(pKey(fm.id),{name:f.name,type:'application/pdf',blob:f});fm.pdf=f.name;await guardarFormas();toast('PDF reemplazado');vFinal()};
  const setK=async k=>{fm.items.forEach((i,j)=>i.k=k[j]);await guardarFormas();toast(`Clave guardada: ${k.filter(x=>x!=null).length} reactivos`);vFinal()};
  $('#gclv').onclick=()=>{const k=parseClave($('#clv').value,fm.items.length);if(!k.some(x=>x!=null)){alert('No se reconoció ninguna letra A–D.');return}setK(k)};
  $('#clvcsv').onchange=async e=>{const f=e.target.files[0];if(!f)return;const rows=parseCSV(await f.text());const k=Array(fm.items.length).fill(null);rows.forEach(r=>{const n=parseInt(r[0]),c=String(r[r.length-1]||'').trim().toUpperCase()[0];if(n>=1&&n<=k.length&&L.includes(c||'#'))k[n-1]=L.indexOf(c)});if(!k.some(x=>x!=null)){alert('El CSV no trae columnas n,clave reconocibles.');return}setK(k)};
  if($('#bclv'))$('#bclv').onclick=()=>{if(confirm('¿Borrar la clave de esta forma?'))setK(Array(fm.items.length).fill(null))}}
 V.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>calificarHoja(HOJAS().find(h=>h.id===b.dataset.h)));
 V.querySelectorAll('[data-hq]').forEach(b=>b.onclick=()=>{if(confirm('¿Quitar esta hoja pendiente?')){setHOJAS(HOJAS().filter(h=>h.id!==b.dataset.hq));vFinal()}});
 $('#qf').onclick=async()=>{if(!confirm('¿Quitar esta forma y sus audios de este dispositivo?'))return;for(const k of Object.keys(fm.aud||{}))await idbDel(fKey(fm.id,k==='forma'?null:k));if(fm.tipo==='pdf')await idbDel(pKey(fm.id));FORMAS=FORMAS.filter(f=>f!==fm);await guardarFormas();vFinal()};
 $('#go').onclick=()=>{localStorage.setItem('alc_nom',$('#nom').value.trim());
  if(esPDF){iniciarHoja(fm,$('#nom').value.trim());return}
  const its=sel.map(i=>Object.assign({},i,{id:'F'+fm.id+'-'+i.n,tipo:i.sec==='L'?'Comprensión auditiva':'Lectura y estructura',e:'',aud:!!aud[i.n]}));
  EX={fuente:'final',c:{forma:fm.id,fid:fm.id,titulo:fm.titulo,parte:FF.parte,tabla:FF.tabla,pista:!!aud.forma},modo:FF.modo,nom:$('#nom').value.trim(),its,i:0,r:its.map(()=>null),plays:its.map(()=>0),ini:Date.now()};location.hash='#examen'}}
function imprimirForma(fm){const its=fm.items;const w=window.open('','_blank');if(!w){alert('Permite ventanas emergentes para imprimir.');return}
 w.document.write(`<html><head><meta charset="utf-8"><title>${esc(fm.titulo)}</title><style>body{font-family:'Noto Sans',sans-serif;font-size:12px;margin:18mm}h1{font-size:16px}h2{font-size:14px}.it{break-inside:avoid;margin:0 0 8px}.k{columns:5}</style></head><body><h1>${esc(fm.titulo)}</h1><p>Uso interno · confidencial</p>${['L','R'].filter(s=>its.some(i=>i.sec===s)).map(s=>`<h2>${s==='L'?'Parte I · Comprensión auditiva':'Parte II · Lectura y estructura'}</h2>`+its.filter(i=>i.sec===s).map(i=>`<div class="it"><b>${i.n}.</b> ${esc(i.q)}<br>${i.o.map((o,j)=>`${'abcd'[j]}) ${esc(o)}`).join('<br>')}</div>`).join('')).join('')}<div style="page-break-before:always"></div><h1>Clave · ${esc(fm.titulo)}</h1><div class="k">${its.map(i=>`<div>${i.n}. ${i.k!=null?L[i.k]:'—'}</div>`).join('')}</div>${its.some(i=>i.s)?`<div style="page-break-before:always"></div><h1>Guiones de auditiva</h1>${its.filter(i=>i.s).map(i=>`<div class="it"><b>${i.n}.</b> ${esc(i.s).replace(/\n/g,'<br>')}</div>`).join('')}`:''}</body></html>`);w.document.close();w.print()}
/* ---------- formas originales en PDF + audio MP3 (v2.4) ---------- */
const pKey=fid=>'pdf|'+fid;
const HOJAS=()=>LS('alc_hojas',[]),setHOJAS=a=>SS('alc_hojas',a);
function itemsPDF(n,nL,clave){return Array.from({length:n},(_,j)=>({n:j+1,sec:j<nL?'L':'R',s:'',q:'',o:['','','',''],k:clave&&clave[j]!=null?clave[j]:null}))}
/* clave en texto: "ABCD…" o "1 A, 2 B …" o una letra por renglón */
function parseClave(t,n){t=String(t||'').toUpperCase();const k=Array(n).fill(null);
 if(/\d/.test(t)){const re=/(\d{1,3})\s*[\.\)\-:=]?\s*([A-D])/g;let m;while((m=re.exec(t))){const i=+m[1]-1;if(i>=0&&i<n)k[i]=L.indexOf(m[2])}}
 else{const ls=t.replace(/[^A-D\-_?]/g,'');[...ls].slice(0,n).forEach((c,i)=>{k[i]=c in{A:1,B:1,C:1,D:1}?L.indexOf(c):null})}return k}
const claveTxt=fm=>fm.items.map(i=>i.k==null?'-':L[i.k]).join('').replace(/(.{10})/g,'$1 ').trim();
async function guardarFormaPDF(){const t=$('#ptit').value.trim(),n=Math.max(1,Math.min(300,+$('#pn').value||100)),nL=Math.max(0,Math.min(n,+$('#pnl').value||0)),f=$('#ppdf').files[0];
 if(!f){alert('Elige el PDF de la forma.');return}if(!/pdf/i.test(f.type)&&!/\.pdf$/i.test(f.name)){alert('El archivo debe ser PDF.');return}
 const id=(t||f.name.replace(/\.[^.]+$/,'')).replace(/[|]/g,'-').slice(0,60);const prev=FORMAS.find(x=>x.id===id);
 if(prev&&!confirm(`Ya existe la forma «${id}». ¿Reemplazar su PDF y número de reactivos? (los audios se conservan)`))return;
 try{await idbSet(pKey(id),{name:f.name,type:'application/pdf',blob:f})}catch(x){alert('No se pudo guardar el PDF en el dispositivo: '+x.message);return}
 const clave=prev?prev.items.map(i=>i.k):null;const nf={id,titulo:t||('Forma '+id),tipo:'pdf',pdf:f.name,nL,items:itemsPDF(n,nL,clave),aud:prev?prev.aud:{},fecha:hoy()};
 if(prev)FORMAS[FORMAS.indexOf(prev)]=nf;else FORMAS.push(nf);await guardarFormas();if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});FF.forma=id;toast('Forma PDF guardada');vFinal()}
/* visor PDF dentro de la app (pdf.js local; si falla, visor del navegador) */
let PDFJS=null;
async function pdfjs(){if(PDFJS)return PDFJS;const m=await import('./pdfjs/pdf.min.mjs');m.GlobalWorkerOptions.workerSrc=new URL('pdfjs/pdf.worker.min.mjs',location.href).href;return PDFJS=m}
async function verPDF(fid,box){box.innerHTML='<p class="muted">Abriendo PDF…</p>';const r=await idbGet(pKey(fid));if(!r){box.innerHTML='<p class="badt">No hay PDF guardado para esta forma.</p>';return}
 let z=+(localStorage.getItem('alc_pdfz')||1);
 box.innerHTML=`<div class="pdfbar"><button type="button" class="btn sm sec" data-z="-">−</button><span class="mini pz">${Math.round(z*100)}%</span><button type="button" class="btn sm sec" data-z="+">+</button><span class="mini pp"></span><a class="btn sm sec" target="_blank" id="pdfab">Abrir aparte</a></div><div class="pdfv"></div>`;
 const u=URL.createObjectURL(r.blob);box.querySelector('#pdfab').href=u;const v=box.querySelector('.pdfv');
 try{const P=await pdfjs();const doc=await P.getDocument({data:new Uint8Array(await r.blob.arrayBuffer()),standardFontDataUrl:new URL('pdfjs/standard_fonts/',location.href).href}).promise;
  const draw=async()=>{v.innerHTML='';box.querySelector('.pz').textContent=Math.round(z*100)+'%';box.querySelector('.pp').textContent=` · ${doc.numPages} pág.`;const W=Math.max(280,v.clientWidth-4);
   for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p);const vp0=pg.getViewport({scale:1});const sc=W/vp0.width*z,dpr=Math.min(2,window.devicePixelRatio||1);const vp=pg.getViewport({scale:sc*dpr});
    const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;c.style.width=(vp.width/dpr)+'px';c.dataset.p=p;v.appendChild(c);await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;if(!document.body.contains(v))return}};
  box.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{z=Math.max(.5,Math.min(3,z+(b.dataset.z==='+'?.25:-.25)));localStorage.setItem('alc_pdfz',z);draw()});await draw();box.dataset.ok='1'}
 catch(x){console.warn(x);v.innerHTML=`<iframe src="${u}" title="PDF" style="width:100%;height:70vh;border:0"></iframe><p class="mini">Visor del navegador (pdf.js no disponible: ${esc(x.message)}).</p>`}}
/* hoja de respuestas */
function iniciarHoja(fm,nom){const its=fm.items.filter(i=>!FF.parte||i.sec===FF.parte).map(i=>Object.assign({},i,{id:'F'+fm.id+'-'+i.n,tipo:i.sec==='L'?'Comprensión auditiva':'Lectura y estructura',e:'',q:`Reactivo ${i.n} (ver PDF)`}));
 EX={fuente:'final',hoja:true,c:{forma:fm.id,fid:fm.id,titulo:fm.titulo,parte:FF.parte,tabla:FF.tabla,pista:!!(fm.aud||{}).forma,pdf:true},modo:FF.modo,nom,its,i:0,r:its.map(()=>null),plays:its.map(()=>0),ini:Date.now()};location.hash='#examen'}
function vHoja(){const e=EX,fm=FORMAS.find(f=>f.id===e.c.fid)||{aud:{}},aud=fm.aud||{},prac=e.modo==='practica';const nr=e.r.filter(x=>x!==null).length;
 V.innerHTML=`<div class="card"><div class="hud"><span>${titulo(e)}</span><span id="cnt">${nr}/${e.its.length} contestados</span></div><div class="pbar"><i id="hbar" style="width:${100*nr/e.its.length}%"></i></div>${e.nom?`<p class="mini">${esc(e.nom)}</p>`:''}
 ${aud.forma?`<h3>Audio de la forma</h3><audio controls preload="auto" id="pista" style="width:100%"></audio>`:''}
 <details class="pdfd" open><summary><b>Forma (PDF)</b></summary><div id="pdfbox"></div></details></div>
 <div class="card"><h2>Hoja de respuestas</h2><p class="mini">Toca la letra de cada reactivo. ${prac?'En práctica ves si acertaste al momento.':'Al terminar, entrega la hoja.'}</p><div class="hoja">${e.its.map((it,j)=>`${j===0||e.its[j-1].sec!==it.sec?`<div class="hsec">${it.sec==='L'?'Parte I · Comprensión auditiva':'Parte II · Lectura y estructura'}</div>`:''}<div class="hr" data-j="${j}"><b>${it.n}</b>${L.split('').map((c,x)=>`<button type="button" data-x="${x}" class="${e.r[j]===x?'sel':''}${prac&&e.r[j]!==null&&it.k!=null?(x===it.k?' ok':(e.r[j]===x?' no':'')):''}">${c}</button>`).join('')}${it.sec==='L'&&aud[it.n]?`<button type="button" class="pa" data-n="${it.n}" title="Audio">▶</button>`:''}</div>`).join('')}</div>
 <button class="btn xl" id="ent">Entregar hoja</button></div>`;
 if(aud.forma)audioURL(e.c.fid,null).then(u=>{const p=$('#pista');if(p&&u){p.src=u;PISTA={el:p}}});
 verPDF(e.c.fid,$('#pdfbox'));
 V.querySelectorAll('.hr').forEach(r=>r.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;const j=+r.dataset.j;
  if(b.classList.contains('pa')){if(!prac&&e.plays[j]>=2){toast('Este audio ya se escuchó 2 veces');return}e.plays[j]++;tocar(e.c.fid,+b.dataset.n);return}
  const it=e.its[j];if(prac&&e.r[j]!==null&&it.k!=null)return;const x=+b.dataset.x;e.r[j]=e.r[j]===x&&!prac?null:x;
  r.querySelectorAll('button[data-x]').forEach(y=>{const yx=+y.dataset.x;y.className=(e.r[j]===yx?'sel':'')+(prac&&e.r[j]!==null&&it.k!=null?(yx===it.k?' ok':(e.r[j]===yx?' no':'')):'')});
  $('#cnt').textContent=`${e.r.filter(z=>z!==null).length}/${e.its.length} contestados`;const pb=$('#hbar');if(pb)pb.style.width=(100*e.r.filter(z=>z!==null).length/e.its.length)+'%';if(prac&&it.k!=null&&e.r[j]!==null){if(e.r[j]===it.k)celebrar(22,b);else vibrar()}});
 $('#ent').onclick=()=>{const sin=e.r.filter(x=>x===null).length;if(sin&&!confirm(`Hay ${sin} reactivos sin contestar. ¿Entregar de todos modos?`))return;entregarHoja()}}
function entregarHoja(){const e=EX;const conK=e.its.filter(i=>i.k!=null).length;
 if(conK){calificar();return}
 const h={id:Date.now().toString(36),fecha:new Date().toISOString(),nom:e.nom,fid:e.c.fid,titulo:e.c.titulo,parte:e.c.parte,tabla:e.c.tabla,modo:e.modo,ns:e.its.map(i=>i.n),r:e.r,min:Math.round((Date.now()-e.ini)/60000)};
 const a=HOJAS();a.push(h);setHOJAS(a);EX=null;if(AUD)AUD.pause();if(PISTA){PISTA.el.pause();PISTA=null}history.replaceState(null,'','#final/ok');nav();
 V.innerHTML=`<div class="card"><h1>Hoja guardada</h1><p class="muted">${esc(h.titulo)}${h.nom?' · '+esc(h.nom):''} · ${h.r.filter(x=>x!==null).length}/${h.r.length} contestados.</p><p>La forma aún no tiene clave. La hoja queda <b>pendiente</b> en este dispositivo; cuando captures la clave en «Examen final» podrás calificarla con la tabla de conversión.</p><a class="btn" href="#final">Volver a Examen final</a></div>`}
function calificarHoja(h){const fm=FORMAS.find(f=>f.id===h.fid);if(!fm){alert('La forma de esta hoja ya no está en el dispositivo.');return}
 const its=h.ns.map(n=>fm.items.find(i=>i.n===n)).filter(Boolean).map(i=>Object.assign({},i,{id:'F'+fm.id+'-'+i.n,tipo:i.sec==='L'?'Comprensión auditiva':'Lectura y estructura',e:'',q:`Reactivo ${i.n} (ver PDF)`}));
 if(!its.some(i=>i.k!=null)){alert('Primero captura la clave de la forma.');return}
 EX={fuente:'final',hoja:true,c:{forma:fm.id,fid:fm.id,titulo:fm.titulo,parte:h.parte,tabla:FF.tabla||h.tabla,pdf:true},modo:h.modo,nom:h.nom,its,i:0,r:h.r,plays:[],ini:Date.parse(h.fecha)-h.min*60000};
 setHOJAS(HOJAS().filter(x=>x.id!==h.id));calificar()}
function convertir(pts,tabla){const t=BANK&&BANK.conversion&&BANK.conversion[tabla];if(!t)return null;for(const [p,c] of t.t)if(pts>=p)return c;return null}
/* ---------- examen ---------- */
let EX=null,PISTA=null,AUD=null;
async function tocar(fid,n){if(AUD){AUD.pause();URL.revokeObjectURL(AUD.src)}const u=await audioURL(fid,n);if(!u){toast('No se encontró el audio');return}AUD=new Audio(u);AUD.play().catch(()=>toast('Toca de nuevo para reproducir'))}
function iniciar(fuente,f,nom){const its=armar(f);if(!its.length){alert('No hay reactivos con esos filtros.');return}
 const c=curso(f.curso);EX={fuente,c:{alcance:f.alcance,curso:f.curso,cursoNom:c.nombre,par:f.alcance==='parcial'?f.par:'',acum:f.acum,forma:f.alcance==='forma'?f.forma:'',libro:f.alcance==='libro'?f.libro:'',lec:f.lec,libros:librosEval(f)},modo:f.modo,nom,its,i:0,r:its.map(()=>null),plays:its.map(()=>0),ini:Date.now()};location.hash='#examen'}
function evalTxt(e){const c=e.c;if(e.fuente==='final')return `Final · ${c.titulo}${c.parte?(c.parte==='L'?' (auditiva)':' (lectura)'):''}`;
 if(c.forma)return `Forma ${c.forma}`;if(c.alcance==='libro')return `Book ${c.libro}${c.lec?' · L'+c.lec:''}`;
 return (c.par?`Parcial ${c.par}${c.acum?' acum.':''}`:(esqId()==='superioridad'?'Anual':'Semestral'))+(e.fuente==='alc'&&c.libros?` · Book ${c.libros.join(', ')}`:'')+(c.lec?' · L'+c.lec:'')}
function titulo(e){return `${e.fuente==='alc'?'ALC':'ALCPT'} · `+(e.c.forma||e.fuente==='final'||e.c.alcance==='libro'?'':esc(e.c.cursoNom||'')+' · ')+evalTxt(e)}
function vExamen(){if(!EX){location.hash='#inicio';return}if(EX.hoja){vHoja();return}const e=EX,it=e.its[e.i],ans=e.r[e.i],prac=e.modo==='practica',done=prac&&ans!==null&&it.k!=null;
 const parte=it.sec==='L'?'Parte I · Comprensión auditiva':'Parte II · Lectura y estructura';const ofi=it.sec==='L'&&!it.s&&!it.aud;
 V.innerHTML=`<div class="card"><div class="hud"><span>${titulo(e)}</span><span>${e.i+1} / ${e.its.length}</span></div><div class="pbar"><i style="width:${100*(e.i+1)/e.its.length}%"></i></div>
 <span class="tag">${parte}</span><span class="tag">${esc(it.tipo)}</span>${it.libro?`<span class="tag">Book ${it.libro}${it.leccion?' · L'+it.leccion:''}</span>`:''}${e.fuente==='final'?`<span class="tag">Reactivo ${it.n}${it.bis?' bis':''}</span>`:''}${it.k==null?'<span class="tag" style="background:#FBE3E0;color:#b3261e">sin clave</span>':''}
 ${e.fuente==='final'&&e.c.pista&&it.sec==='L'?`<div class="txt">🔊 <b>Pista completa</b> (el aplicador la controla)<audio controls preload="auto" id="pista" style="width:100%;margin-top:6px"></audio></div>`:''}${it.sec==='L'&&(it.s||it.aud)?`<div class="noprint"><button class="btn" id="play">▶ Escuchar${!prac?` (${2-e.plays[e.i]} restantes)`:''}</button></div>${done?`<div class="txt">${esc(it.s)}</div>`:''}`:ofi?`<div class="txt">🔊 <b>Audio:</b> ${e.c.pista?'reproduce la pista completa':'el aplicador reproduce el audio'} del reactivo ${it.n||e.i+1}.</div>`:it.s?`<div class="txt">${esc(it.s)}</div>`:''}
 ${it.q?`<div class="q">${esc(it.q)}</div>`:''}
 ${it.o.map((o,j)=>`<button class="op ${ans===j?'sel':''} ${done&&j===it.k?'ok':''} ${done&&ans===j&&j!==it.k?'no':''}" data-j="${j}" ${done?'disabled':''}><b>${L[j]})</b>${esc(o)}</button>`).join('')}
 ${done?`<div class="fb ${ans===it.k?'ok':'no'}"><b>${ans===it.k?'Correcto':'Incorrecto · respuesta: '+L[it.k]}</b><br>${esc(it.e)}</div>`:''}
 <div class="row" style="margin-top:10px"><button class="btn sec" id="prev" ${e.i?'':'disabled'}>Anterior</button>${e.i<e.its.length-1?`<button class="btn" id="next">Siguiente</button>`:`<button class="btn" id="fin">Terminar y calificar</button>`}</div>
 <p class="mini">Respondidas: ${e.r.filter(x=>x!==null).length} de ${e.its.length}. <a href="#" id="abort">Cancelar</a></p></div>`;
 V.querySelectorAll('.op').forEach(b=>b.onclick=()=>{e.r[e.i]=+b.dataset.j;vExamen();if(prac&&it.k!=null){if(e.r[e.i]===it.k){celebrar(28,b)}else vibrar()}});
 const ps=$('#pista');if(ps){if(PISTA&&PISTA.fid===e.c.fid){ps.replaceWith(PISTA.el);PISTA.el.id='pista'}else audioURL(e.c.fid,null).then(u=>{if(u){ps.src=u;PISTA={fid:e.c.fid,el:ps}}})}
 const p=$('#play');if(p)p.onclick=()=>{if(!prac&&e.plays[e.i]>=2){toast('Ya no quedan reproducciones');return}e.plays[e.i]++;if(it.aud)tocar(e.c.fid,it.n);else hablar(it.s);if(!prac)p.textContent=`▶ Escuchar (${2-e.plays[e.i]} restantes)`};
 $('#prev').onclick=()=>{e.i--;vExamen()};const n=$('#next');if(n)n.onclick=()=>{e.i++;vExamen()};
 const f=$('#fin');if(f)f.onclick=()=>{const pend=e.r.filter(x=>x===null).length;if(pend&&!confirm(`Faltan ${pend} sin responder (cuentan como error). ¿Terminar?`))return;calificar()};
 $('#abort').onclick=ev=>{ev.preventDefault();if(confirm('¿Cancelar este examen?')){const fu=e.fuente;EX=null;if(AUD)AUD.pause();if(PISTA)PISTA.el.pause();PISTA=null;speechSynthesis&&speechSynthesis.cancel();location.hash='#'+(fu==='final'?'final':fu)}}}
function calificar(){const e=EX,cfg=CFG();let ok=0;const por={};const its=e.its.filter(i=>i.k!=null),idx=e.its.map((it,j)=>j).filter(j=>e.its[j].k!=null);
 idx.forEach(j=>{const it=e.its[j],b=e.r[j]===it.k;ok+=b;const k=it.tipo;por[k]=por[k]||[0,0];por[k][0]+=b;por[k][1]++});
 const sec={L:[0,0],R:[0,0]};idx.forEach(j=>{const it=e.its[j];sec[it.sec][0]+=e.r[j]===it.k;sec[it.sec][1]++});
 const N=its.length||1,pct=Math.round(1000*ok/N)/10;let cal=Math.round(pct)/10,conv='';
 if(e.fuente==='final'&&e.c.tabla){const cc=convertir(ok,e.c.tabla);if(cc!=null){cal=cc;conv=`Conversión: ${BANK.conversion[e.c.tabla].nombre}`}else{conv=`${ok} puntos: debajo del mínimo de la tabla (${BANK.conversion[e.c.tabla].nombre}). No acreditado.`;cal=Math.min(5,cal)}}
 const res={fecha:new Date().toISOString(),nom:e.nom,fuente:e.fuente,esq:esqId(),curso:e.c.cursoNom||'',eval:evalTxt(e),sem:e.c.curso||'',par:e.c.par||'',forma:e.c.forma||'',modo:e.modo,n:its.length,sinClave:e.its.length-its.length,ok,pct,cal,L:sec.L,R:sec.R,min:Math.round((Date.now()-e.ini)/60000)};
 const all=RES();all.push(res);setRES(all);
 const r=e.r,lst=e.its;const titu=titulo(e);EX=null;if(AUD)AUD.pause();if(PISTA){PISTA.el.pause();PISTA=null}history.replaceState(null,'','#resultados');nav();
 V.innerHTML=`<div class="card"><h1>Resultado</h1><p class="muted">${titu}${res.nom?' · '+esc(res.nom):''}</p>
 <div class="row"><div><div class="big">${ok}/${its.length}</div><div class="muted">aciertos${res.sinClave?` (${res.sinClave} sin clave no cuentan)`:''}</div></div><div><div class="big">${pct}</div><div class="muted">porcentaje</div></div><div><div class="big ${cal>=cfg.minima?'okt':'badt'}">${cal.toFixed(1)}</div><div class="muted">calificación (0–10) · ${cal>=cfg.minima?'Aprobado':'No aprobado'} (mínima ${cfg.minima})</div></div></div>${conv?`<p class="mini">${esc(conv)}</p>`:''}<div class="medidor ${cal>=cfg.minima?'ok':'no'}"><i data-w="${Math.max(2,Math.min(100,cal*10))}"></i></div><p class="festejo">${cal>=cfg.minima?(cal>=9?'🏆 ¡Excelente trabajo!':'🎉 ¡Aprobado! Bien hecho.'):'💪 Sigue practicando: revisa los errores abajo.'}</p>
 <h3>Por sección</h3><p>${['L','R'].filter(s=>sec[s][1]).map(s=>`<span class="tag">${s==='L'?'Comprensión auditiva':'Lectura y estructura'}: ${sec[s][0]}/${sec[s][1]}</span>`).join('')}</p>
 <h3>Por tipo</h3><p>${Object.entries(por).map(([k,v])=>`<span class="tag">${esc(k)}: ${v[0]}/${v[1]}</span>`).join('')}</p>
 <div class="row noprint"><button class="btn" onclick="print()">Imprimir</button><a class="btn sec" href="#calif">Ir a la calificación</a></div></div>
 <div class="card"><h2>Revisión de errores</h2>${lst.map((it,j)=>it.k==null||r[j]===it.k?'':`<div style="border-bottom:1px solid var(--b);padding:8px 0"><b>${it.n?it.n:j+1}.</b> ${it.s?`<div class="txt">${esc(it.s)}</div>`:''}<div><b>${esc(it.q)}</b></div><div class="badt">Respuesta: ${r[j]===null?'(sin responder)':L[r[j]]+') '+esc(it.o[r[j]])}</div><div class="okt">Correcta: ${L[it.k]}) ${esc(it.o[it.k])}</div><div class="mini">${esc(it.e)}</div></div>`).join('')||'<p>¡Sin errores!</p>'}</div>`;
 SS('alc_ultimo',res);animar();requestAnimationFrame(()=>setTimeout(()=>{const m=V.querySelector('.medidor i');if(m)m.style.width=m.dataset.w+'%'},60));if(cal>=cfg.minima)setTimeout(()=>celebrar(cal>=9?220:140),250)}
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
 <p class="mini">Si el examen final no se acredita, se presenta el extraordinario con otra versión del ALCPT (pestaña «Final»); si lo aprueba, la calificación que se asienta es 6.0.</p></div>
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
function tablaRes(a){const m=CFG().minima;return `<div class="tw"><table><tr><th>Fecha</th><th>Estudiante</th><th>Prueba</th><th>Curso</th><th>Evaluación</th><th>Modo</th><th>Aciertos</th><th>%</th><th>Cal.</th></tr>${a.map(r=>`<tr><td>${fechaL(r.fecha)}</td><td>${esc(r.nom||'—')}</td><td>${r.fuente==='final'?'FINAL':r.fuente.toUpperCase()}</td><td>${esc(r.curso||r.sem||'—')}</td><td>${esc(r.eval)}</td><td>${r.modo==='examen'?'Examen':'Práctica'}</td><td>${r.ok}/${r.n}</td><td>${r.pct}</td><td class="${r.cal>=m?'okt':'badt'}">${r.cal.toFixed(1)}</td></tr>`).join('')}</table></div>`}
function vRes(){const a=RES().slice().reverse();
 V.innerHTML=`<div class="card"><h1>Resultados</h1><p class="muted">Guardados solo en este dispositivo.</p>${a.length?tablaRes(a):'<p>Aún no hay resultados.</p>'}
 <div class="row noprint"><button class="btn" id="csv" ${a.length?'':'disabled'}>Exportar CSV</button><button class="btn sec" onclick="print()">Imprimir</button><button class="btn peligro" id="del" ${a.length?'':'disabled'}>Borrar resultados</button></div></div>
 ${a.length?`<div class="card"><h2>Promedios (solo exámenes)</h2>${resumen(a)}</div>`:''}`;
 $('#csv').onclick=()=>{const h=['Fecha','Estudiante','Prueba','Esquema','Curso','Parcial','Forma','Evaluación','Modo','Reactivos calificados','Sin clave','Aciertos','Porcentaje','Calificación','Auditiva','Lectura','Minutos'];
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
 `<div class="card"><h2>Examen final</h2><p class="muted">${FORMAS.length?`${FORMAS.length} formas cargadas (${FORMAS.reduce((a,f)=>a+f.items.length,0)} reactivos).`:'Sin formas cargadas.'} Se cargan y administran en «Examen final».</p></div>
 <div class="card"><h2>Voz</h2><p class="muted">La comprensión auditiva usa la voz en inglés del dispositivo. En examen se puede escuchar cada audio 2 veces.</p><label class="f">Velocidad</label><select id="rate">${[[.8,'Lenta'],[.9,'Normal'],[1,'Rápida']].map(([v,t])=>`<option value="${v}" ${+(localStorage.getItem('alc_rate')||.9)===v?'selected':''}>${t}</option>`).join('')}</select><button class="btn sec" id="prueba">Probar voz</button></div>
 <p class="mini">ALCPT y ALC por parciales v${VER} · No afiliada al DLIELC. El banco, las formas y los audios son confidenciales y no se publican.</p>`;
 bindImp();bindEsq(vBanco);const q=$('#qb');if(q)q.onclick=async()=>{if(confirm('¿Quitar el banco de este dispositivo? Tus resultados se conservan.')){await idbDel('bank');BANK=null;vBanco()}};
 $('#rate').onchange=e=>localStorage.setItem('alc_rate',e.target.value);$('#prueba').onclick=()=>hablar('M: Good morning. Where is the clinic?\nW: It is next to the main gate.')}
/* ---------- efectos y tema ---------- */
const MOV=()=>!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
function vibrar(){try{navigator.vibrate&&navigator.vibrate(60)}catch(e){}}
function celebrar(n,el){if(!MOV())return;let c=$('#confeti');if(!c){c=document.createElement('canvas');c.id='confeti';document.body.appendChild(c)}const x=c.getContext('2d'),W=c.width=innerWidth*(devicePixelRatio||1),H=c.height=innerHeight*(devicePixelRatio||1),d=devicePixelRatio||1;c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';
 let ox=W/2,oy=H*.35;if(el&&el.getBoundingClientRect){const r=el.getBoundingClientRect();ox=(r.left+r.width/2)*d;oy=(r.top+r.height/2)*d}
 const col=['#6366f1','#a855f7','#ec4899','#06b6d4','#f59e0b','#10b981'],P=Array.from({length:n},()=>{const a=Math.random()*Math.PI*2,v=(el?4:7+Math.random()*7)*d*(.5+Math.random());return {x:ox,y:oy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(el?3:6)*d,r:(3+Math.random()*4)*d,c:col[n*Math.random()%col.length|0],t:Math.random()*6,s:Math.random()<.5}});
 let f=0;const step=()=>{x.clearRect(0,0,W,H);f++;P.forEach(p=>{p.vy+=.25*d;p.vx*=.985;p.x+=p.vx;p.y+=p.vy;p.t+=.2;x.globalAlpha=Math.max(0,1-f/(el?45:110));x.fillStyle=p.c;x.save();x.translate(p.x,p.y);x.rotate(p.t);if(p.s)x.fillRect(-p.r,-p.r/2,p.r*2,p.r);else{x.beginPath();x.arc(0,0,p.r/1.4,0,7);x.fill()}x.restore()});if(f<(el?45:110))requestAnimationFrame(step);else x.clearRect(0,0,W,H)};requestAnimationFrame(step)}
function tema(t){if(t)localStorage.setItem('alc_tema',t);const v=localStorage.getItem('alc_tema')||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=v;const b=$('#tema');if(b){b.textContent=v==='dark'?'☀️':'🌙';b.title=v==='dark'?'Modo claro':'Modo oscuro'}const m=document.querySelector('meta[name=theme-color]');if(m)m.content=v==='dark'?'#0d0f1c':'#6366f1'}
tema();$('#tema').onclick=()=>tema(document.documentElement.dataset.theme==='dark'?'light':'dark');
/* ---------- arranque ---------- */
render();
if(window.indexedDB)Promise.all([idbGet('bank'),idbGet('formas')]).then(([b,f])=>{if(b&&b.alcpt)BANK=b;if(Array.isArray(f))FORMAS=f;LISTO=true;if(!EX)render()}).then(()=>idbDel('orig')).catch(()=>{LISTO=true;render()});else LISTO=true;
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
