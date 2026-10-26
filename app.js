/* Cuestionario Taltalab · graba la voz en la propia página (MediaRecorder) y, si el navegador lo permite, la transcribe en directo. Sin servidor: todo se guarda en este dispositivo. */
(function(){
var MIC='<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>';
var $=function(s){return document.querySelector(s)};
var NB=Q.length?Q[Q.length-1].bn:1,N=Q.length,segs=$('#segs'),view=$('#view'),num=$('#qnum');
var st={a:{},c:{},d:{},i:0};
try{var s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&s.a){st=s;st.c=st.c||{};st.d=st.d||{}}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}}
var CAN_REC=!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder);
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
/* audio en IndexedDB */
var dbp=null;
function db(){if(dbp)return dbp;dbp=new Promise(function(res,rej){try{var r=indexedDB.open('tl-cuestionarios',1);r.onupgradeneeded=function(){r.result.createObjectStore('clips')};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}}catch(e){rej(e)}});return dbp}
function idb(mode,fn){return db().then(function(d){return new Promise(function(res,rej){var t=d.transaction('clips',mode),o=t.objectStore('clips'),r=fn(o);t.oncomplete=function(){res(r&&r.result)};t.onerror=function(){rej(t.error)}})})}
function ck(i,n){return KEY+':'+i+':'+n}
function putClip(i,n,blob){return idb('readwrite',function(o){return o.put(blob,ck(i,n))})}
function getClip(i,n){return idb('readonly',function(o){return o.get(ck(i,n))})}
function delClip(i,n){return idb('readwrite',function(o){return o.delete(ck(i,n))})}
function clipsOf(i){return (st.c[i]||[]).slice()}
function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML}
function mmss(s){s=Math.round(s||0);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function filled(i){return !!((st.a[i]&&st.a[i].trim())||clipsOf(i).length)}
function drawSegs(){segs.innerHTML='';for(var i=0;i<=N;i++){var b=document.createElement('button');b.type='button';b.setAttribute('aria-label',i<N?'Pregunta '+(i+1):'Enviar');if(i===st.i){b.className='cur';b.setAttribute('aria-current','step')}else if(i<N&&filled(i))b.className='ok';(function(k){b.onclick=function(){go(k)}})(i);segs.appendChild(b)}}
/* grabación */
var R=null;
function stopAll(){if(R){try{R.mr.state!=='inactive'&&R.mr.stop()}catch(e){}try{R.sr&&R.sr.stop()}catch(e){}}}
function go(i){stopAll();st.i=Math.max(0,Math.min(N,i));save();render();var t=$('#q');if(t&&t.getBoundingClientRect().top<0)t.scrollIntoView({behavior:'smooth'})}
function setUI(on){var b=$('#mic');if(!b)return;b.classList.toggle('rec',on);b.setAttribute('aria-pressed',on?'true':'false');$('#ml').textContent=on?'Parar':'Pulsa y habla';$('#wv').classList.toggle('on',on)}
function say(t){var x=$('#sx');if(x)x.textContent=t}
function start(i,ta){
 if(R){stopAll();return}
 say('Pidiendo permiso para el micrófono…');
 navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
  var mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/aac'].filter(function(m){try{return MediaRecorder.isTypeSupported(m)}catch(e){return false}})[0]||'';
  var mr;try{mr=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream)}catch(e){stream.getTracks().forEach(function(t){t.stop()});say('No he podido empezar a grabar. Escribe tu respuesta o prueba con Chrome.');return}
  var chunks=[],t0=Date.now(),timer;
  R={mr:mr,stream:stream,i:i,sr:null};
  mr.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};
  mr.onstop=function(){
   clearInterval(timer);stream.getTracks().forEach(function(t){t.stop()});
   var dur=(Date.now()-t0)/1000,blob=new Blob(chunks,{type:mr.mimeType||mime||'audio/webm'}),cur=R;R=null;setUI(false);
   if(!blob.size||dur<1){say('No se ha grabado nada. Pulsa otra vez.');return}
   var list=clipsOf(i),n=(list.length?Math.max.apply(null,list.map(function(c){return c.n})):0)+1;
   putClip(i,n,blob).then(function(){list.push({n:n,s:dur,t:blob.type});st.c[i]=list;save();drawSegs();if(st.i===i){say('Guardado. Puedes grabar otra vez para añadir más.');drawClips(i)}},function(){say('No he podido guardar el audio en este dispositivo. Escribe tu respuesta.')});
  };
  mr.start(1000);setUI(true);
  timer=setInterval(function(){say('Grabando · '+mmss((Date.now()-t0)/1000)+' · pulsa Parar cuando acabes')},500);
  /* transcripción en directo, si el navegador la ofrece */
  if(SR){try{var sr=new SR();sr.lang='es-ES';sr.continuous=true;sr.interimResults=true;var base=ta.value?ta.value.replace(/\s+$/,'')+' ':'',fin='';
   sr.onresult=function(ev){var tmp='';for(var r=ev.resultIndex;r<ev.results.length;r++){var x=ev.results[r][0].transcript;if(ev.results[r].isFinal)fin+=x+' ';else tmp+=x}ta.value=base+fin+tmp;st.a[i]=ta.value;save()};
   sr.onerror=function(){};sr.onend=function(){if(R&&R.sr===sr){try{sr.start()}catch(e){}}};
   R.sr=sr;sr.start()}catch(e){}}
 },function(err){
  var n=err&&err.name;
  if(n==='NotAllowedError'||n==='SecurityError')say('El micrófono está bloqueado. Pulsa el icono a la izquierda de la dirección web, permite el micrófono y vuelve a pulsar.');
  else if(n==='NotFoundError')say('No encuentro ningún micrófono en este dispositivo. Puedes escribir tu respuesta.');
  else say('No he podido usar el micrófono. Puedes escribir tu respuesta.');
 });
}
function drawClips(i){var box=$('#clips');if(!box)return;var list=clipsOf(i);if(!list.length){box.innerHTML='';return}
 box.innerHTML='<p class="clh">Tus audios de esta pregunta</p>'+list.map(function(c,k){return '<div class="clip"><span>Audio '+(k+1)+' · '+mmss(c.s)+'</span><audio controls preload="none" data-n="'+c.n+'"></audio><button type="button" class="del" data-n="'+c.n+'">Borrar</button></div>'}).join('');
 [].forEach.call(box.querySelectorAll('audio'),function(a){getClip(i,+a.getAttribute('data-n')).then(function(b){if(b)a.src=URL.createObjectURL(b)})});
 [].forEach.call(box.querySelectorAll('.del'),function(b){b.onclick=function(){var n=+b.getAttribute('data-n');delClip(i,n).then(function(){st.c[i]=clipsOf(i).filter(function(c){return c.n!==n});save();drawSegs();drawClips(i)})}});
}
function render(){drawSegs();var i=st.i;
 if(i<N){var q=Q[i];num.innerHTML=String(i+1).padStart(2,'0')+'<small>/ '+String(N).padStart(2,'0')+'</small>';
  view.innerHTML='<div class="card in"><span class="tag">Bloque '+q.bn+' de '+NB+' · '+esc(q.b)+'</span><h2 id="qt">'+esc(q.q)+'</h2>'+(q.h?'<p class="hint">'+esc(q.h)+'</p>':'')+
  '<div class="ans"><textarea id="ta" aria-labelledby="qt" placeholder="'+(CAN_REC?'Pulsa el micro y habla. Si prefieres, escribe aquí.':'Escribe aquí tu respuesta.')+'"></textarea><div class="abar">'+
  (CAN_REC?'<button type="button" class="mic" id="mic" aria-pressed="false"><span class="dot">'+MIC+'</span><span id="ml">Pulsa y habla</span></button>':'')+
  '<span class="st"><span class="wave" id="wv"><i></i><i></i><i></i><i></i><i></i></span> <span id="sx" aria-live="polite">'+(CAN_REC?'':'Este navegador no deja grabar. Ábrelo en Chrome o Safari, o escribe tu respuesta.')+'</span></span></div><div id="clips" class="clips"></div></div>'+
  '<div class="qnav"><button class="btn" id="pv" type="button"'+(i===0?' disabled':'')+'>Anterior</button><button class="btn pri" id="nx" type="button">'+(i===N-1?'Terminar':'Siguiente')+'</button></div></div>';
  var ta=$('#ta');ta.value=st.a[i]||'';ta.oninput=function(){st.a[i]=ta.value;save();drawSegs()};
  $('#pv').onclick=function(){go(i-1)};$('#nx').onclick=function(){go(i+1)};
  if(CAN_REC)$('#mic').onclick=function(){start(i,ta)};
  drawClips(i);
 }else{num.innerHTML='<small style="margin:0">Último paso</small>';var c=0,au=0,li='';
  for(var k=0;k<N;k++){var f=filled(k),na=clipsOf(k).length;au+=na;if(f)c++;li+='<li><span>'+String(k+1).padStart(2,'0')+'</span><button type="button" data-k="'+k+'">'+esc(Q[k].t)+'</button><em class="'+(f?'y':'')+'">'+(f?(na?na+' audio'+(na>1?'s':''):'Escrita'):'Sin responder')+'</em></li>'}
  var share=!!(navigator.canShare&&window.File);
  view.innerHTML='<div class="card in end"><span class="tag">'+c+' de '+N+' respondidas · '+au+' audio'+(au===1?'':'s')+'</span><h2>Gracias, '+esc(NAME)+'. Mándanoslo.</h2><p>'+(au?'Pulsa el botón y se preparan tus audios y lo que hayas escrito. Mándanoslo por WhatsApp o por correo a José o a Diego.':'Pulsa un botón y se prepara un mensaje con todas tus respuestas.')+'</p>'+
  '<div class="send">'+(au?(share?'<button class="btn pri" id="sh" type="button">Enviar audios y respuestas</button>':'')+'<button class="btn'+(share?'':' pri')+'" id="dl" type="button">Descargar todo</button>':'')+
  '<a class="btn'+(au?'':' pri')+'" id="wa" target="_blank" rel="noopener">'+(au?'Enviar solo el texto por WhatsApp':'Enviar por WhatsApp')+'</a><a class="btn" id="ml2">Enviar por correo</a></div><p class="msg" id="msg" aria-live="polite"></p>'+
  '<ul class="sum">'+li+'</ul>'+
  '<div class="call"><b>¿Prefieres contárnoslo en una llamada?</b><p>Escríbenos a José o a Diego y lo hablamos en media hora. Lo grabamos y no tienes que escribir nada.</p></div></div>';
  var txt=compose();$('#wa').href='https://wa.me/?text='+encodeURIComponent(txt);
  $('#ml2').href='mailto:'+(EMAIL||'')+'?subject='+encodeURIComponent('Cuestionario '+CLIENT+' · '+NAME)+'&body='+encodeURIComponent(txt);
  if($('#sh'))$('#sh').onclick=function(){msg('Preparando…');files().then(function(fs){if(navigator.canShare({files:fs}))return navigator.share({files:fs,title:'Cuestionario '+CLIENT+' · '+NAME}).then(function(){msg('Enviado. ¡Gracias!')});throw new Error('noshare')}).catch(function(e){if(e&&e.name==='AbortError'){msg('');return}msg('Este dispositivo no deja compartir los audios así. Usa «Descargar todo».')})};
  if($('#dl'))$('#dl').onclick=function(){msg('Preparando el archivo…');files().then(function(fs){if(!window.JSZip)throw new Error('zip');var z=new JSZip();fs.forEach(function(f){z.file(f.name,f)});return z.generateAsync({type:'blob'})}).then(function(b){var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='Cuestionario-'+NAME.replace(/\s+/g,'-')+'-'+CLIENT.replace(/\s+/g,'-')+'.zip';document.body.appendChild(a);a.click();a.remove();msg('Descargado. Mándanos ese archivo por WhatsApp o por correo.')}).catch(function(){msg('No he podido preparar el archivo. Prueba con «Enviar audios y respuestas» o escríbenos.')})};
  [].forEach.call(view.querySelectorAll('.sum button'),function(b){b.onclick=function(){go(+b.getAttribute('data-k'))}});
 }
}
function msg(t){var m=$('#msg');if(m)m.textContent=t}
function ext(t){return /mp4|aac|m4a/.test(t||'')?'m4a':/ogg/.test(t||'')?'ogg':'webm'}
function files(){var ps=[],out=[];for(var k=0;k<N;k++)(function(k){clipsOf(k).forEach(function(c,j){ps.push(getClip(k,c.n).then(function(b){if(b)out.push(new File([b],NAME.replace(/\s+/g,'-')+'-P'+String(k+1).padStart(2,'0')+'-audio'+(j+1)+'.'+ext(b.type),{type:b.type}))}))})})(k);
 return Promise.all(ps).then(function(){out.sort(function(a,b){return a.name<b.name?-1:1});out.unshift(new File([compose()],NAME.replace(/\s+/g,'-')+'-respuestas.txt',{type:'text/plain'}));return out})}
function compose(){var t='Cuestionario de '+CLIENT+' · '+NAME+'\n';for(var k=0;k<N;k++){var na=clipsOf(k).length;t+='\n'+(k+1)+'. '+Q[k].q+'\n'+(((st.a[k]||'').trim())||(na?'(respondida en audio)':'(sin responder)'))+(na&&(st.a[k]||'').trim()?'\n(+ '+na+' audio'+(na>1?'s':'')+')':'')+'\n'}return t}
/* aviso si no es Chrome */
(function(){var ua=navigator.userAgent,isChrome=(/Chrome\//.test(ua)||/CriOS\//.test(ua))&&!/Edg\/|OPR\/|SamsungBrowser|YaBrowser/.test(ua);if(isChrome)return;
 var d=document.createElement('div');d.className='nochrome';d.setAttribute('role','status');d.innerHTML='<span><b>Abre este cuestionario en Google Chrome</b> para poder responder hablando.</span><button type="button">Copiar enlace</button>';
 document.body.insertBefore(d,document.body.firstChild);d.querySelector('button').onclick=function(){var b=this;try{navigator.clipboard.writeText(location.href).then(function(){b.textContent='Copiado. Pégalo en Chrome'},function(){b.textContent=location.href})}catch(e){b.textContent=location.href}}})();
render();
})();
