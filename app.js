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
/* medidor real: la onda se mueve con lo que entra por el micro y la página avisa si no entra nada */
var HEARD=.015,ZERO=.0005,SILENT=.003,LOW=.02,WARN=3.5;
(function(){var c=document.createElement('style');c.textContent='.mic.rec{background:#B3261E}.wave.live i{animation:none;transition:transform .08s linear;background:#B3261E}.abar #sx.on{color:#B3261E;font-weight:600}.mw{margin:0 12px 12px 18px;padding:12px 14px;border-radius:10px;background:#FBE9E7;border:1px solid #B3261E;color:#7A1A14;font-size:15px;line-height:1.4}.mw[hidden]{display:none}.mw b{display:block;font-size:17px;margin-bottom:2px}.mw button{text-decoration:underline;font:inherit;color:inherit;padding:0 2px}.clip em.sil{flex-basis:100%;font-style:normal;font-weight:600;color:#B3261E;font-size:14px}.sum em.sil{color:#B3261E}.tonly{margin-top:10px;font-size:14px;color:var(--mute)}.mw.end{margin:16px 0 0}';document.head.appendChild(c)})();
function warn(h){var w=$('#mw');if(!w)return;if(h){w.innerHTML=h;w.hidden=false}else{w.hidden=true;w.innerHTML=''}}
var NOHEAR='<b>No te oigo.</b> No está entrando sonido por el micrófono, así que esto no se está grabando. Comprueba que no esté silenciado y que sea el micro correcto. Pulsa Parar y prueba otra vez, o escribe tu respuesta.';
function meterNew(){var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{var c=new AC();if(c.state==='suspended'&&c.resume)c.resume();return{c:c,peak:0,n:0,last:0,live:0}}catch(e){return null}}
function bars(p){var w=$('#wv');if(!w)return;w.classList.add('live');var b=w.children,v=Math.min(1,Math.sqrt(p)*1.4),f=[.6,.85,1,.75,.55];for(var k=0;k<b.length;k++)b[k].style.transform='scaleY('+Math.max(.08,v*f[k])+')'}
function meterStart(m,stream){if(!m)return;try{var a=m.c.createAnalyser(),g=m.c.createGain();a.fftSize=2048;g.gain.value=0;m.c.createMediaStreamSource(stream).connect(a);a.connect(g);g.connect(m.c.destination);var d=new Float32Array(a.fftSize);m.tm=setInterval(function(){if(m.c.state!=='running')return;a.getFloatTimeDomainData(d);var p=0;for(var k=0;k<d.length;k++){var v=Math.abs(d[k]);if(v>p)p=v}m.n++;if(p>m.peak)m.peak=p;var now=Date.now();if(p>=HEARD)m.last=now;if(p>=ZERO)m.live=now;bars(p)},80)}catch(e){m.err=true}}
function meterStop(m){if(!m)return;clearInterval(m.tm);try{m.c.close()}catch(e){}}
function recTick(t0){if(!R)return;var el=(Date.now()-t0)/1000,t=mmss(el),m=R.m,now=Date.now();
 if(!m||m.err||m.n<5){say('● Grabando · '+t+' · pulsa Parar cuando acabes');return}
 var mudo=!m.last&&el>=WARN||(m.last&&now-m.live>WARN*1000);
 if(mudo){warn(NOHEAR);if(R.sr){var q=R.sr;R.sr=null;try{q.abort()}catch(e){}}say('● Grabando · '+t+' · no te oigo');return}
 warn(null);
 if(!m.last)say('● Grabando · '+t+' · habla ahora');
 else say('● Grabando · '+t+' · '+(now-m.last>8000?'hace rato que no te oigo':'te oigo')+' · pulsa Parar cuando acabes')}
/* volumen máximo de un audio ya grabado; null si el navegador no puede leerlo */
function blobPeak(b){return new Promise(function(res){try{var O=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!O||!b||!b.arrayBuffer)return res(null);b.arrayBuffer().then(function(buf){new O(1,1,44100).decodeAudioData(buf,function(ab){var d=ab.getChannelData(0),p=0;for(var k=0;k<d.length;k++){var v=Math.abs(d[k]);if(v>p)p=v}res(p)},function(){res(null)})},function(){res(null)})}catch(e){res(null)}})}
function scanEnd(){var box=$('#silb');if(!box)return;var bad=[],chain=Promise.resolve();for(var k=0;k<N;k++)(function(k){clipsOf(k).forEach(function(c){chain=chain.then(function(){return getClip(k,c.n)}).then(blobPeak).then(function(p){if(p!==null&&p<SILENT&&bad.indexOf(k)<0)bad.push(k)})})})(k);
 chain.then(function(){if(!bad.length||!box.isConnected)return;box.hidden=false;box.innerHTML='<b>Cuidado: hay audios sin sonido.</b> '+(bad.length>1?'En estas preguntas no se oye nada: ':'En esta pregunta no se oye nada: ')+bad.map(function(k){return '<button type="button" data-k="'+k+'">'+(k+1)+'</button>'}).join(', ')+'. '+(bad.length>1?'Vuelve a grabarlas':'Vuelve a grabarla')+' antes de enviar.';[].forEach.call(box.querySelectorAll('button'),function(b){b.onclick=function(){go(+b.getAttribute('data-k'))}});bad.forEach(function(k){var e=view.querySelector('.sum button[data-k="'+k+'"]');if(e&&e.nextSibling){e.nextSibling.textContent='Sin sonido';e.nextSibling.className='sil'}})}).catch(function(){})}
function stopAll(){if(R){try{R.mr.state!=='inactive'&&R.mr.stop()}catch(e){}try{R.sr&&R.sr.stop()}catch(e){}}}
function go(i){stopAll();st.i=Math.max(0,Math.min(N,i));save();render();var t=$('#q');if(t&&t.getBoundingClientRect().top<0)t.scrollIntoView({behavior:'smooth'})}
function setUI(on){var b=$('#mic');if(!b)return;var sx=$('#sx');if(sx)sx.classList.toggle('on',on);b.classList.toggle('rec',on);b.setAttribute('aria-pressed',on?'true':'false');$('#ml').textContent=on?'Parar':'Pulsa y habla';$('#wv').classList.toggle('on',on)}
function say(t){var x=$('#sx');if(x)x.textContent=t}
function start(i,ta){
 if(R){stopAll();return}
 var M=meterNew(),antes=(st.a[i]||'').length;warn(null);say('Pidiendo permiso para el micrófono…');
 navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
  var mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/aac'].filter(function(m){try{return MediaRecorder.isTypeSupported(m)}catch(e){return false}})[0]||'';
  var mr;try{mr=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream)}catch(e){stream.getTracks().forEach(function(t){t.stop()});meterStop(M);say('No he podido empezar a grabar. Escribe tu respuesta o prueba con Chrome.');return}
  var chunks=[],t0=Date.now(),timer;
  R={mr:mr,stream:stream,i:i,sr:null,m:M};
  mr.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};
  mr.onstop=function(){
   clearInterval(timer);stream.getTracks().forEach(function(t){t.stop()});
   var dur=(Date.now()-t0)/1000,blob=new Blob(chunks,{type:mr.mimeType||mime||'audio/webm'}),cur=R;R=null;setUI(false);meterStop(M);warn(null);
   if(!blob.size||dur<1){say('No se ha grabado nada. Pulsa otra vez.');return}
   say('Comprobando el audio…');
   blobPeak(blob).then(function(pk){
    if(pk!==null&&pk<SILENT){say('No estás grabando.');var hay=(st.a[i]||'').length>antes;warn('<b>'+(st.i===i?'Esta grabación':'La grabación de la pregunta '+(i+1))+' ha quedado en silencio.</b> No se oye nada, así que no la hemos guardado.'+(hay?' Lo que se ha escrito en la casilla sí está guardado.':' Comprueba el micrófono y vuelve a grabar, o escribe tu respuesta.'));return}
    var list=clipsOf(i),n=(list.length?Math.max.apply(null,list.map(function(c){return c.n})):0)+1;
    putClip(i,n,blob).then(function(){list.push({n:n,s:dur,t:blob.type});st.c[i]=list;save();drawSegs();if(st.i===i){say(pk!==null&&pk<LOW?'Guardado, pero se oye muy bajo. Escúchalo antes de seguir.':'Guardado. Ya no estás grabando. Puedes grabar otra vez para añadir más.');drawClips(i)}},function(){say('No he podido guardar el audio en este dispositivo. Escribe tu respuesta.')});
   });
  };
  mr.start(1000);setUI(true);
  meterStart(M,stream);timer=setInterval(function(){recTick(t0)},250);
  /* transcripción en directo, si el navegador la ofrece */
  if(SR){try{var sr=new SR();sr.lang='es-ES';sr.continuous=true;sr.interimResults=true;var base=ta.value?ta.value.replace(/\s+$/,'')+' ':'',fin='';
   sr.onresult=function(ev){var tmp='';for(var r=ev.resultIndex;r<ev.results.length;r++){var x=ev.results[r][0].transcript;if(ev.results[r].isFinal)fin+=x+' ';else tmp+=x}ta.value=base+fin+tmp;st.a[i]=ta.value;save()};
   sr.onerror=function(){};sr.onend=function(){if(R&&R.sr===sr){try{sr.start()}catch(e){}}};
   R.sr=sr;sr.start()}catch(e){}}
 },function(err){
  meterStop(M);var n=err&&err.name;
  if(n==='NotAllowedError'||n==='SecurityError')say('El micrófono está bloqueado. Pulsa el icono a la izquierda de la dirección web, permite el micrófono y vuelve a pulsar.');
  else if(n==='NotFoundError')say('No encuentro ningún micrófono en este dispositivo. Puedes escribir tu respuesta.');
  else say('No he podido usar el micrófono. Puedes escribir tu respuesta.');
 });
}
function drawClips(i){var box=$('#clips');if(!box)return;var list=clipsOf(i);if(!list.length){box.innerHTML='';return}
 box.innerHTML='<p class="clh">Tus audios de esta pregunta</p>'+list.map(function(c,k){return '<div class="clip"><span>Audio '+(k+1)+' · '+mmss(c.s)+'</span><audio controls preload="none" data-n="'+c.n+'"></audio><button type="button" class="del" data-n="'+c.n+'">Borrar</button></div>'}).join('');
 [].forEach.call(box.querySelectorAll('audio'),function(a){getClip(i,+a.getAttribute('data-n')).then(function(b){if(!b)return;a.src=URL.createObjectURL(b);blobPeak(b).then(function(p){if(p!==null&&p<SILENT&&a.parentNode&&!a.parentNode.querySelector('.sil')){var e=document.createElement('em');e.className='sil';e.textContent='En silencio: no se oye nada. Bórralo y vuelve a grabar.';a.parentNode.appendChild(e)}})})});
 [].forEach.call(box.querySelectorAll('.del'),function(b){b.onclick=function(){var n=+b.getAttribute('data-n');delClip(i,n).then(function(){st.c[i]=clipsOf(i).filter(function(c){return c.n!==n});save();drawSegs();drawClips(i)})}});
}
function render(){drawSegs();var i=st.i;
 if(i<N){var q=Q[i];num.innerHTML=String(i+1).padStart(2,'0')+'<small>/ '+String(N).padStart(2,'0')+'</small>';
  view.innerHTML='<div class="card in"><span class="tag">Bloque '+q.bn+' de '+NB+' · '+esc(q.b)+'</span><h2 id="qt">'+esc(q.q)+'</h2>'+(q.h?'<p class="hint">'+esc(q.h)+'</p>':'')+
  '<div class="ans"><textarea id="ta" aria-labelledby="qt" placeholder="'+(CAN_REC?'Pulsa el micro y habla. Si prefieres, escribe aquí.':'Escribe aquí tu respuesta.')+'"></textarea><div class="abar">'+
  (CAN_REC?'<button type="button" class="mic" id="mic" aria-pressed="false"><span class="dot">'+MIC+'</span><span id="ml">Pulsa y habla</span></button>':'')+
  '<span class="st"><span class="wave" id="wv"><i></i><i></i><i></i><i></i><i></i></span> <span id="sx" aria-live="polite">'+(CAN_REC?'No estás grabando.':'Este navegador no deja grabar. Ábrelo en Chrome o Safari, o escribe tu respuesta.')+'</span></span></div><div id="mw" class="mw" role="alert" hidden></div><div id="clips" class="clips"></div></div>'+
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
  '<a class="btn'+(au?'':' pri')+'" id="wa" target="_blank" rel="noopener">'+(au?'Enviar solo el texto por WhatsApp':'Enviar por WhatsApp')+'</a><a class="btn" id="ml2">'+(au?'Enviar solo el texto por correo':'Enviar por correo')+'</a></div>'+(au?'<p class="tonly">Tus audios solo salen con «Enviar audios y respuestas» o «Descargar todo». WhatsApp y correo llevan solo lo escrito.</p>':'')+'<p class="msg" id="msg" aria-live="polite"></p><div id="silb" class="mw end" role="alert" hidden></div>'+
  '<ul class="sum">'+li+'</ul>'+
  '<div class="call"><b>¿Prefieres contárnoslo en una llamada?</b><p>Escríbenos a José o a Diego y lo hablamos en media hora. Lo grabamos y no tienes que escribir nada.</p></div></div>';
  scanEnd();var txt=(au?'OJO: este mensaje solo lleva lo escrito. Los audios se envían aparte con «Descargar todo».\n\n':'')+compose();$('#wa').href='https://wa.me/?text='+encodeURIComponent(txt);
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
