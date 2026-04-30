  /* ── Lightbox evidencia ──────────────────────────────────── */
(function initEvLightbox_() {
  const lb      = document.getElementById('ev-lightbox');
  const lbImg   = document.getElementById('ev-lightbox-img');
  const lbClose = document.getElementById('ev-lightbox-close');
  if (!lb || !lbImg) return;

  window.openEvLightbox_ = function(src) {
    lbImg.src = src;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  window.closeEvLightbox_ = function() {
    lb.classList.remove('open');
    lbImg.src = '';
    document.body.style.overflow = '';
  };

  lb.addEventListener('click', closeEvLightbox_);
  lbClose.addEventListener('click', function(e) {
    e.stopPropagation();
    closeEvLightbox_();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && lb.classList.contains('open')) closeEvLightbox_();
  });
})();
  
/* ================== CONFIGURACIÓN PRINCIPAL ================== */
const API_BASE = 'https://script.google.com/macros/s/AKfycbxrDWVwRyjKheTVrijr8cPSVLd_iMZUb1qCuLB1c6PkJQktHc9Mhp2bduGqHK2sTW6PJg/exec';
const BUILDERBOT_ENDPOINT = 'https://app.builderbot.cloud/api/v2/ff37a123-12b0-4fdc-9866-f3e2daf389fb/messages';
const BUILDERBOT_API_KEY  = 'bb-7f9ef630-5cfc-4ba4-9258-5e7cecbb4f65';

/* ================== SONIDOS ================== */
const SOUNDS = {
  question: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Pay_fail_ls2aif.mp3',
  info: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Default_notification_pkp4wr.mp3',
  success: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Pay_success_t5aawh.mp3',
  error: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Low_battery_d5qua1.mp3',
  warning: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Low_battery_d5qua1.mp3',
  login: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Siri_star_g1owy4.mp3',
  logout: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Siri_End_kelv02.mp3',
  back: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Keyboard_Enter_b9k2dc.mp3'
};
function playSoundOnce(url){
  try{
    const a = new Audio(url);
    a.preload = 'auto';
    a.play().catch(()=>{});
  }catch(e){}
}
if (window.Swal && typeof Swal.fire === 'function'){
  const __fire = Swal.fire.bind(Swal);
  Swal.fire = function(options = {}, ...rest){
    try{
      const icon = options.icon || options.type;
      if (icon && SOUNDS[icon]) playSoundOnce(SOUNDS[icon]);
    }catch(e){}
    return __fire(options, ...rest);
  }
}

/* ================== LOADER ================== */
const loader = document.getElementById('loader');
let loadingCount = 0;
let loaderTimer = null;
// NUEVO: bandera para suprimir el loader global en flujos específicos
let suppressLoader = false;

function startLoading(){
  if (suppressLoader) return;        // si está activa, no mostrar loader global
  loadingCount++;
  if (loadingCount === 1){
    loaderTimer = setTimeout(()=>{ loader.classList.remove('hidden'); loaderTimer = null; }, 120);
  }
}
function stopLoading(){
  if (suppressLoader) return;        // si está activa, ignorar cierres
  if (loadingCount === 0) return;
  loadingCount--;
  if (loadingCount === 0){
    if (loaderTimer){ clearTimeout(loaderTimer); loaderTimer = null; }
    loader.classList.add('hidden');
  }
}

/* ================== API HELPERS ================== */
async function apiGet(action, params = {}){
  startLoading();
  try{
    const url = new URL(API_BASE);
    url.search = new URLSearchParams({ action, ...params }).toString();
    const r = await fetch(url.toString(), { method: 'GET' });
    const j = await r.json();
    if(!j.ok) throw new Error(j.error || 'Error');
    return j.data;
  } finally { stopLoading(); }
}
async function apiPost(action, body = {}){
  startLoading();
  try{
    const url = API_BASE + '?action=' + encodeURIComponent(action);
    const r = await fetch(url, {
      method:'POST',
      headers: { 'Content-Type':'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if(!j.ok) throw new Error(j.error || 'Error');
    return j.data;
  } finally { stopLoading(); }
}

/* ================== BUILDERBOT ================== */
function normalizeContratistaNumber(raw){
  let num = String(raw || '').replace(/\D/g,'');
  if(!num) return '';
  // Si tiene 10 dígitos y no comienza con 57, agregamos prefijo.
  if(num.length === 10 && !num.startsWith('57')){
    num = '57' + num;
  }
  // Formato válido esperado: 12 dígitos iniciando en 57
  if(!(num.length === 12 && num.startsWith('57'))){
    return '';
  }
  return num;
}

function sendBuilderbotMessage(destino, mensaje, mediaUrl){
  const numberField = String(destino || '').trim();
  if(!numberField){
    console.warn('Destino vacío, no se envía BuilderBot');
    return;
  }

  const payload = {
    messages: { content: mensaje },
    number: numberField,       // Puede ser número normalizado o ID de grupo
    checkIfExists: false
  };

  // NUEVO: adjuntar mediaUrl solo si se envía
  if (mediaUrl) {
    payload.messages.mediaUrl = String(mediaUrl).trim();
  }

  fetch(BUILDERBOT_ENDPOINT, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'x-api-builderbot':BUILDERBOT_API_KEY
    },
    body: JSON.stringify(payload)
  }).catch(err => console.warn('Error enviando BuilderBot', err));
}

/* ================== ESTADO GLOBAL ================== */
let currentUser = null;

/* ================== VISTAS ================== */
function showView(id){
  for(const el of document.querySelectorAll('.view')) el.classList.remove('active');
  const v = document.getElementById(id);
  if(v) v.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ================== LOGIN ================== */
const btnLogin = document.getElementById('btn-login');
const loginCedula = document.getElementById('login-cedula');
  
/* ================== BOTÓN OCULTAR - MOSTRAR ================== */
  const toggleCedulaBtn = document.getElementById('toggle-cedula');
toggleCedulaBtn.addEventListener('click', ()=>{
  const oculto = loginCedula.type === 'password';
  loginCedula.type = oculto ? 'text' : 'password';
  const nuevoIcono = oculto
    ? 'https://res.cloudinary.com/dqqeavica/image/upload/v1764084782/Ocultar_lgdxpd.png'
    : 'https://res.cloudinary.com/dqqeavica/image/upload/v1764084782/Mostrar_yymceh.png';
  const accion = oculto ? 'Ocultar' : 'Mostrar';
  toggleCedulaBtn.setAttribute('aria-label', accion + ' cédula');
  toggleCedulaBtn.innerHTML = '<img src="'+nuevoIcono+'" alt="'+accion+'">';
});

btnLogin.addEventListener('click', async () => {
  const cedula = (loginCedula.value || '').trim();
  if (cedula === '') {
    Swal.fire({ icon:'warning', title:'¿Deseas iniciar Sesión?', text:'Ingresa tu Contraseña.' });
    return;
  }
  if (!/^\d{6,10}$/.test(cedula)) {
    Swal.fire({ icon:'warning', title:'Contraseña inválida', text:'Te mostraré unas opciones' });
    return;
  }
  try {
    const res = await apiGet('login', { cedula });
    if (!res || !res.encontrado){
    // Datos para posible solicitud por WhatsApp (solo si el usuario decide solicitar acceso)
    const soporte = '573103230712';
    const mensaje =
      'Buen día *Oscar*%0A%0ANo tengo acceso a la app de Contratación.%0A' +
      'Mi Contraseña: *' + cedula + '*%0A' +
      'Te dejo mis datos a continuación:%0A*Nombre Completo:*%0A*Celular:*';
    const esMovil = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
    const urlWA = esMovil
      ? 'whatsapp://send?phone=' + soporte + '&text=' + mensaje
      : 'https://api.whatsapp.com/send?phone=' + soporte + '&text=' + mensaje;

    // Nueva alerta con dos opciones
    const rs = await Swal.fire({
      icon: 'error',
      title: 'NO TIENES ACCESO',
      text: 'Toma una de las opciones',
      showConfirmButton: true,
      confirmButtonText: 'Solicitar Acceso',
      showDenyButton: true,
      denyButtonText: 'Rectificar / Salir'
    });

    if (rs.isConfirmed){
      // Abre WhatsApp para solicitar habilitación
      window.open(urlWA, '_blank');
      await Swal.fire({
        icon: 'success',
        title: 'Se abrió WhatsApp',
        text: 'Solicita tu habilitación por ese medio.',
        timer: 6000,
        showConfirmButton: false
      });
      return;
    } else if (rs.isDenied){
      // Limpia el campo y permite corregir
      loginCedula.value = '';
      return;
    }
  }
    currentUser = {
      cedula,
      profesional: res.profesional || '',
      celular: res.celular || ''
    };
    playSoundOnce(SOUNDS.login);
    renderInicio();
    showView('view-inicio');
  } catch (e) {
    Swal.fire({ icon:'error', title:'Error', text:e.message });
  }
});

document.getElementById('btn-logout').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.logout);
  currentUser = null;
  loginCedula.value = '';
  showView('view-login');
});

/* ================== INICIO ================== */
function renderInicio(){
  document.getElementById('inicio-profesional').textContent = 'PROFESIONAL: ' + (currentUser?.profesional || '');
  document.getElementById('inicio-fecha').textContent = formatoFechaHumana(new Date());
}
function formatoFechaHumana(date){
  const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const d=dias[date.getDay()];
  const dia=('0'+date.getDate()).slice(-2);
  const mes=meses[date.getMonth()];
  const y=date.getFullYear();
  return `${d}, ${dia} de ${mes} de ${y}`;
}
function formatoFechaHoraCorta(date){
  let h=date.getHours(); const min=('0'+date.getMinutes()).slice(-2);
  const ampm=h<12?'AM':'PM'; h=h%12||12;
  const dd=('0'+date.getDate()).slice(-2);
  const mm=('0'+(date.getMonth()+1)).slice(-2);
  const yyyy=date.getFullYear();
  return `${dd}/${mm}/${yyyy} ${h}:${min} ${ampm}`;
}

/* ================== NAVEGACIÓN PRINCIPAL ================== */
document.getElementById('go-contratistas').addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);
  await cargarContratistas();
  showView('view-contratistas');
});
document.getElementById('go-revision').addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);

  const prof = String(currentUser?.profesional || '').trim().toUpperCase();
  const allowed = (prof === 'YESICA ALFARO' || prof === 'OSCAR POLANIA'); 

  if(!allowed){
    await Swal.fire({
      icon:'info',
      title:'NO TIENES PERMISOS PARA REVISAR',
      text:'Rol exclusivo para personal autorizado.'
    });
    return;
  }

  await cargarCuentasPendientes();
  if (!CUENTAS_DATA || CUENTAS_DATA.length === 0){
    await Swal.fire({
      icon:'success',
      title:'¡Estás al día!',
      text:'No tienes CUENTAS pendientes por revisar y aprobar',
      timer: 3200,
      showConfirmButton: false
    });
    showView('view-inicio');
    return;
  }
  showView('view-revision');
});
  
document.getElementById('go-requerimientos').addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);
  await cargarRequerimientosBase();
  showView('view-requerimientos');
});
document.getElementById('go-comunicados').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  showView('view-comunicados');
});
  
document.getElementById('go-soporte').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  showView('view-soporte');
});

  document.getElementById('go-reporte').addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);

  const prof = String(currentUser?.profesional || '').trim().toUpperCase();
  const allowed = (prof === 'YESICA ALFARO' || prof === 'OSCAR POLANIA');

  if(!allowed){
    await Swal.fire({
      icon:'info',
      title:'NO TIENES PERMISOS PARA REPORTE',
      text:'Rol exclusivo para personal autorizado.'
    });
    return;
  }

  // reset rango visible
  REPORTE_STATE.desde = '';
  REPORTE_STATE.hasta = '';
  const lbl = document.getElementById('reporte-rango-label');
  if(lbl) lbl.textContent = '';

  showView('view-reporte');
});

/* ================== REPORTE (FRONTEND) ================== */
const REPORTE_STATE = { desde:'', hasta:'' };

function formatDMYLocal(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}
function parseDMYLocal(s){
  const m = String(s||'').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!m) return null;
  const dd = parseInt(m[1],10), mm = parseInt(m[2],10), yy = parseInt(m[3],10);
  const dt = new Date(yy, mm-1, dd);
  if(isNaN(dt.getTime())) return null;
  return dt;
}
function buildDateListDMY(maxDate, minDate){
  const out = [];
  const a = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  const b = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
  for(let d=new Date(a); d<=b; d.setDate(d.getDate()+1)){
    out.push(formatDMYLocal(d));
  }
  return out;
}

(async function initPickerReporteFechas(){
  const selDesde = document.getElementById('reporteDesde');
  const selHasta = document.getElementById('reporteHasta');
  if(!selDesde || !selHasta) return;

  function parseDMYLocal(s){
    const m = String(s||'').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(!m) return null;
    const dd = parseInt(m[1],10), mm = parseInt(m[2],10), yy = parseInt(m[3],10);
    const dt = new Date(yy, mm-1, dd);
    if(isNaN(dt.getTime())) return null;
    dt.setHours(0,0,0,0);
    return dt;
  }

  function formatDMYLocal(d){
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  function buildDateListDMY(minDate, maxDate){
    const out = [];
    const a = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    const b = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
    for(let d=new Date(a); d<=b; d.setDate(d.getDate()+1)){
      out.push(formatDMYLocal(d));
    }
    return out;
  }

  function disableHasta(){
    selHasta.innerHTML = '';
    selHasta.disabled = true;
  }
  function enableHasta(){
    selHasta.disabled = false;
  }
  function fillHastaFrom(desdeValue, fullList){
    const idx = fullList.indexOf(desdeValue);
    const sub = (idx >= 0) ? fullList.slice(idx) : fullList.slice();
    selHasta.innerHTML = '';
    sub.forEach(v=>{
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      selHasta.appendChild(o);
    });
    if(sub.length){
      selHasta.value = sub[0];
    }
  }

  function fixedMinForUser(profUpper){
    if(profUpper === 'YESICA ALFARO') return '16/02/2026';
    if(profUpper === 'OSCAR POLANIA') return '01/01/2026';
    return '01/01/2026';
  }

  function setListWithFixedMin(){
    const profUp = String(currentUser?.profesional || '').trim().toUpperCase();
    const fixedMin = parseDMYLocal(fixedMinForUser(profUp));

    const today = new Date();
    today.setHours(0,0,0,0);

    const listFull = (fixedMin && fixedMin <= today) ? buildDateListDMY(fixedMin, today) : [];

    selDesde.innerHTML = '';
    listFull.forEach(v=>{
      const o1 = document.createElement('option');
      o1.value = v;
      o1.textContent = v;
      selDesde.appendChild(o1);
    });

    disableHasta();

    if(listFull.length){
      selDesde.value = listFull[0];
      enableHasta();
      fillHastaFrom(selDesde.value, listFull);
    }
  }

  disableHasta();

  const prof = String(currentUser?.profesional || '').trim();

  let mm = null;
  try{
    mm = await apiGet('reporteAprobadasMinMax', { responsable: prof });
  }catch(e){
    mm = null;
  }

  const profUp = String(currentUser?.profesional || '').trim().toUpperCase();
  const fixedMin = parseDMYLocal(fixedMinForUser(profUp));

  const today = new Date();
  today.setHours(0,0,0,0);

  const backendMax = parseDMYLocal(mm?.max || '');
  const realMax = (backendMax && backendMax <= today) ? backendMax : today;

  const realMin = fixedMin;

  const listFull = (realMin && realMax && realMin <= realMax)
    ? buildDateListDMY(realMin, realMax)
    : [];

  selDesde.innerHTML = '';
  listFull.forEach(v=>{
    const o1 = document.createElement('option');
    o1.value = v;
    o1.textContent = v;
    selDesde.appendChild(o1);
  });

  disableHasta();

  function onDesdeSelected(){
    const desdeVal = String(selDesde.value || '').trim();
    if(!desdeVal || !listFull.length){
      disableHasta();
      return;
    }
    enableHasta();
    fillHastaFrom(desdeVal, listFull);
  }

  if(!selDesde.dataset.boundHasta){
    selDesde.dataset.boundHasta = '1';
    selDesde.addEventListener('click', onDesdeSelected);
    selDesde.addEventListener('change', onDesdeSelected);
    selDesde.addEventListener('input', onDesdeSelected);
  }

  if(listFull.length){
    selDesde.value = listFull[0];
    onDesdeSelected();
  }else{
    setListWithFixedMin();
  }
})();

document.getElementById('btn-open-reporte-fechas').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  const modal = document.getElementById('reporteFechaModal');
  if(modal){
    modal.style.display='flex';
    modal.setAttribute('aria-hidden','false');
  }
});

function cancelarPickerReporte(){
  const modal = document.getElementById('reporteFechaModal');
  if(modal){
    modal.style.display='none';
    modal.setAttribute('aria-hidden','true');
  }
}

function confirmarPickerReporte(){
  const desde = String(document.getElementById('reporteDesde')?.value || '').trim();
  const hasta = String(document.getElementById('reporteHasta')?.value || '').trim();

  if(!desde || !hasta){
    Swal.fire({ icon:'warning', title:'Debes seleccionar ambas fechas' });
    return;
  }

  const d1 = parseDMYLocal(desde);
  const d2 = parseDMYLocal(hasta);
  if(!d1 || !d2){
    Swal.fire({ icon:'warning', title:'Formato de fecha inválido' });
    return;
  }
  if(d2 < d1){
    Swal.fire({ icon:'warning', title:'Rango inválido', text:'Hasta debe ser mayor o igual a Desde.' });
    return;
  }

  REPORTE_STATE.desde = desde;
  REPORTE_STATE.hasta = hasta;

  const lbl = document.getElementById('reporte-rango-label');
  if(lbl) lbl.textContent = `REPORTE ENTRE ${desde} HASTA ${hasta}`;

  cancelarPickerReporte();
}

document.getElementById('btn-reporte-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

document.getElementById('btn-generar-reporte').addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);

  const prof = String(currentUser?.profesional || '').trim();
  const desde = String(REPORTE_STATE.desde || '').trim();
  const hasta = String(REPORTE_STATE.hasta || '').trim();

  if(!desde || !hasta){
    Swal.fire({ icon:'warning', title:'Filtro requerido', text:'Selecciona Desde y Hasta.' });
    return;
  }

  suppressLoader = true;
  loadingCount = 0;
  if(loaderTimer){ clearTimeout(loaderTimer); loaderTimer = null; }
  if(loader){
    loader.classList.add('hidden');
    loader.style.display = 'none';
  }

  Swal.fire({
    title: 'GENERANDO REPORTE...',
    html: 'Espera unos segundos mientras genero tu archivo<br><br>Hacemos todo por ti 👩🏻‍💻',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => { Swal.showLoading(); }
  });

  try{
    const data = await apiGet('reporteAprobadasUrl', { desde, hasta, responsable: prof });

    await Swal.close();

    if(!data || data.created === false || !data.exportUrl){
      Swal.fire({
        icon:'info',
        title:'NO HAY REVISIONES EN ESTE RANGO DE FECHAS',
        text:'Revisa bien el rango seleccionado'
      });
      return;
    }

    const url = String(data.exportUrl || '').trim();

    // Iniciar descarga
    const isMobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
    if(isMobile){
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_self';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    Swal.fire({ icon:'success', title:'REPORTE GENERADO', timer:1400, showConfirmButton:false });

    // Eliminar el archivo después de 5s — suficiente para que la descarga inicie
    if(data.fileId){
      setTimeout(()=>{
        apiPost('cleanupReporte', {
          cleanupToken: data.fileId,
          hardDelete: true
        }).catch(()=>{});
      }, 5000);
    }

  }catch(e){
    try{ await Swal.close(); }catch(_){}
    Swal.fire({ icon:'error', title:'Error', text: String(e.message || e) });
  }finally{
    suppressLoader = false;
    loadingCount = 0;
    if(loaderTimer){ clearTimeout(loaderTimer); loaderTimer = null; }
    if(loader){
      loader.style.display = '';
      loader.classList.add('hidden');
    }
  }
});

/* ================== CONTRATISTAS ================== */
let CONTR_DATA=[];
async function cargarContratistas(){
  try{
    const list=await apiGet('listContratistas');
    CONTR_DATA=Array.isArray(list)?list:[];
    pintarContratistas(CONTR_DATA);
    actualizarResumenContratistas(CONTR_DATA);
  }catch(e){
    CONTR_DATA=[];
    pintarContratistas(CONTR_DATA);
    actualizarResumenContratistas(CONTR_DATA);
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}
function actualizarResumenContratistas(list){
  const box=document.getElementById('contr-count');
  if(!box) return;
  if(!list.length){ box.style.display='none'; box.textContent=''; return; }
  box.textContent=String(list.length);
  box.style.display='inline-block';
}
function pintarContratistas(list){
  const wrap=document.getElementById('contr-list');
  if(!wrap) return;
  wrap.innerHTML='';
  if(!list.length){
    wrap.innerHTML='<p class="muted center">No hay contratistas activos.</p>';
    return;
  }
  for(const c of list){
    const div=document.createElement('div');
    div.className='item-card';
    // NUEVO: contacto oculto en la tarjeta (grupo WhatsApp del supervisor)
    div.dataset.contacto = c.contacto || '';

    const header=document.createElement('div');
    header.className='item-header';

    const title=document.createElement('p');
    title.className='item-title';
    title.textContent= (c.nombre||'');

    const estadoSpan = document.createElement('span');
    estadoSpan.className = 'estado-badge ' + (c.estado === 'ACTIVO' ? '' : 'inactivo');
    estadoSpan.textContent = c.estado;
    let nuevoEstado = c.estado;
    estadoSpan.style.cursor='pointer';
    estadoSpan.title='Tocar para alternar entre ACTIVO e INACTIVO';
    estadoSpan.addEventListener('click', ()=>{
      nuevoEstado = (nuevoEstado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO');
      estadoSpan.textContent = nuevoEstado;
      estadoSpan.className = 'estado-badge ' + (nuevoEstado === 'ACTIVO' ? '' : 'inactivo');
    });

    header.appendChild(title);
    header.appendChild(estadoSpan);
    div.appendChild(header);

    const pDoc=document.createElement('p');
    pDoc.className='item-sub';
    pDoc.textContent='CC / NIT: '+(c.documento||'');
    div.appendChild(pDoc);

    const pSec=document.createElement('p');
    pSec.className='item-sub';
    pSec.textContent='SECRETARÍA: '+(c.secretaria||'');
    div.appendChild(pSec);

    const pSup=document.createElement('p');
    pSup.className='item-sub';
    pSup.textContent='SUPERVISOR: '+(c.supervisor||'');
    div.appendChild(pSup);

    const pContrato=document.createElement('p');
    pContrato.className='item-sub';
    pContrato.textContent='CONTRATO: '+(c.contrato||'')+' de: '+(c.fechaContrato||'');
    div.appendChild(pContrato);

    const pInicio=document.createElement('p');
    pInicio.className='item-sub';
    pInicio.textContent='FECHA INICIO: '+(c.fechaInicio||'');
    div.appendChild(pInicio);

    const pTermino=document.createElement('p');
    pTermino.className='item-sub';
    pTermino.textContent='FECHA TERMINO: '+(c.fechaTermino||'');
    div.appendChild(pTermino);

    const tieneAdicion = String(c.tieneAdicion||'') === 'true' || c.tieneAdicion === true;
      if(tieneAdicion){
  const pAdi = document.createElement('p');
  pAdi.className = 'item-sub adicionado';
  pAdi.textContent = 'ADICIONADO';
  div.appendChild(pAdi);
}

    const actionsRow=document.createElement('div');
    actionsRow.className='contr-actions';

    const leftGroup=document.createElement('div');
    leftGroup.className='left-group';

    const rightGroup=document.createElement('div');
    rightGroup.className='right-group';

    const btnDetalles=document.createElement('button');
btnDetalles.textContent='MOSTRAR DETALLES';
btnDetalles.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  mostrarDetallesContratista(c.documento);
});

    const btnGuardarEstado=document.createElement('button');
    btnGuardarEstado.textContent='GUARDAR ESTADO';
    btnGuardarEstado.addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);
  try{
    await apiPost('guardarEstadoContratista',{ documento:c.documento, estado:nuevoEstado });
    Swal.fire({icon:'success',title:'Estado actualizado',timer:1600,showConfirmButton:false});
    await cargarContratistas();
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});

    const btnWhatsapp=document.createElement('button');
    btnWhatsapp.className='btn-icon';
    btnWhatsapp.innerHTML='<img src="https://res.cloudinary.com/dqqeavica/image/upload/v1759166341/WhatsApp_mljaqm.webp" alt="WhatsApp">';
    btnWhatsapp.setAttribute('aria-label','Abrir chat de WhatsApp');
    btnWhatsapp.addEventListener('click', ()=>{
      let tel=String(c.telefono||'').replace(/\D/g,'');
      if(!tel){ Swal.fire({icon:'info',title:'Sin teléfono'}); return; }
      if(!tel.startsWith('57')) tel='57'+tel;
      if(!/^57\d{10}$/.test(tel)){
        Swal.fire({icon:'warning',title:'Teléfono inválido'}); return;
      }
      window.open('https://wa.me/'+tel,'_blank');
    });

    const btnDrive=document.createElement('button');
    btnDrive.className='btn-icon';
    btnDrive.innerHTML='<img src="https://res.cloudinary.com/dqqeavica/image/upload/v1763997280/DRIVE_bycgsc.webp" alt="Drive">';
    btnDrive.setAttribute('aria-label','Abrir carpeta Drive');
    btnDrive.addEventListener('click', ()=>{
      if(c.carpetaContratista){
        window.open('https://drive.google.com/drive/folders/'+c.carpetaContratista,'_blank');
      }else{
        Swal.fire({icon:'info',title:'Sin carpeta',text:'No hay carpeta asociada.'});
      }
    });

    leftGroup.appendChild(btnDetalles);
leftGroup.appendChild(btnGuardarEstado);

const btnAdicion = document.createElement('button');
btnAdicion.textContent = 'ADICIÓN';
btnAdicion.addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);
  try{
    await abrirVistaAdicion(c.documento);
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});
leftGroup.appendChild(btnAdicion);
    // NUEVO: Botón CESIÓN
    const btnCesion=document.createElement('button');
    btnCesion.className='btn-icon';
    btnCesion.innerHTML='<img src="https://res.cloudinary.com/dqqeavica/image/upload/v1773342299/no_found_czsnkj.webp" alt="Cesión">';
    btnCesion.setAttribute('aria-label','Cesión de contrato');
    btnCesion.title='Cesión de contrato';
    btnCesion.addEventListener('click', async ()=>{
      const contacto   = String(div.dataset.contacto || c.contacto || '').trim();
      const supervisor = String(c.supervisor || '').trim();
      const contrato   = String(c.contrato   || '').trim();

      if(!contacto){
        Swal.fire({icon:'warning',title:'Sin contacto del supervisor',text:'No hay grupo de WhatsApp asociado.'});
        return;
      }

      const rs = await Swal.fire({
        icon:'info',
        title:'¿Confirmar Cesión?',
        text:'Se notificará al supervisor sobre la cesión del contrato '+contrato,
        showCancelButton:true,
        confirmButtonText:'Informar',
        cancelButtonText:'Cancelar'
      });

      if(rs.isConfirmed){
        const mensaje =
          'Estimado(a) *'+supervisor+'*\n' +
          'Se ha configurado la *Cesión del contrato '+contrato+'* ✍🏻\n\n' +
          'Por favor compartir con el contratista el enlace para descargar la *App Contratistas* junto a las siguientes instrucción:\n' +
          'https://tinyurl.com/GDF-CONTRATISTA-APP\n' +
          '*1.* Descargar la App\n' +
          '*2.* Inciar sesión con CC o NIT\n' +
          '*3.* Tomar la opción DATOS DEL PROCESO / DATOS DEL CONTRATO / ACTUALIZAR\n' +
          '*4.* Cambiar asertivamente todos los datos incluyendo la firma\n' +
          '*5.* En la 1ra cuenta bajo la Cesión, debe adjuntar la justificación en el campo *Otro Documento Requerido*\n\n' +
          'Revisar muy bien para evitar reprocesos.\n\n' +
          'Cordialmente,\n\n*Equipo de Contratación*\n> Alcaldía de Flandes';

        sendBuilderbotMessage(contacto, mensaje);

        Swal.fire({
          icon:'success',
          title:'EL SUPERVISOR HA SIDO NOTIFICADO',
          timer:2000,
          showConfirmButton:false
        });
      }
    });

    rightGroup.appendChild(btnWhatsapp);
    rightGroup.appendChild(btnDrive);
    rightGroup.appendChild(btnCesion);
    actionsRow.appendChild(leftGroup);
    actionsRow.appendChild(rightGroup);

    div.appendChild(actionsRow);
    wrap.appendChild(div);
  } 
} 

document.getElementById('contr-filter').addEventListener('input',()=>{
  const input = document.getElementById('contr-filter');
  const q = (input.value || '').trim().toLowerCase();

  const qDigits = q.replace(/\D/g,''); // solo números digitados
  const allowDocumento = qDigits.length >= 6; // documento mínimo 6 dígitos

  const filtered = CONTR_DATA.filter(c=>{
    const nombre     = String(c.nombre||'').toLowerCase();
    const secretaria = String(c.secretaria||'').toLowerCase();
    const supervisor = String(c.supervisor||'').toLowerCase();
    const telefono   = String(c.telefono||'').toLowerCase();

    const contratoDigits  = String(c.contrato||'').replace(/\D/g,'');
    const documentoDigits = String(c.documento||'').replace(/\D/g,'');

    const hitTexto =
      nombre.includes(q) ||
      secretaria.includes(q) ||
      supervisor.includes(q) ||
      telefono.includes(q);

    const hitContrato = qDigits ? contratoDigits.includes(qDigits) : false;
    const hitDocumento = allowDocumento && qDigits ? documentoDigits.includes(qDigits) : false;

    return hitTexto || hitContrato || hitDocumento;
  });

  pintarContratistas(filtered);
  actualizarResumenContratistas(filtered);
});
document.getElementById('contr-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== AGREGAR CONTRATISTA ================== */
  function resetFormAgregarContratista(){
  const ids = [
    'add-documento',
    'add-nombre',
    'add-secretaria',
    'add-carpetaSecretaria',
    'add-supervisor',
    'add-contactoSupervisor',
    'add-contrato',
    'add-tipoContrato',
    'add-fechaContrato',
    'add-diaContrato',
    'add-mesContrato',
    'add-valor',
    'add-valorTexto',
    'add-cdp',
    'add-objeto',
    'add-obligaciones',
    'add-mra'
  ];

  ids.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;

    if(el.tagName === 'SELECT'){
      // vuelve al placeholder (tu <option value="" disabled selected>)
      el.selectedIndex = 0;
    }else{
      el.value = '';
    }

    // limpia bordes/estilos aplicados por validaciones (CDP/valorTexto)
    el.style.border = '';
  });

  // valor inicial esperado para mra oculto
  const mra = document.getElementById('add-mra');
  if(mra) mra.value = '0';

  // si el textarea tiene autogrow, fuerza recalcular altura
  const ob = document.getElementById('add-obligaciones');
  if(ob){
    ob.style.height = 'auto';
    ob.style.height = (ob.scrollHeight + 4) + 'px';
  }
}
  
const MAP_SECRETARIA_CARPETA={
  'DESPACHO MUNICIPAL':'1KkTSaWUnNkKzES_Drn7cO449hYYDT-Pd',
  'SECRETARÍA DE GOBIERNO Y SERVICIOS ADMINISTRATIVOS':'1X5spQ24vs5wzZyI1AtiMMMBrTCzKMNOH',
  'SECRETARÍA DE HACIENDA':'1v_0D71jH-9nK0HgAWr5gzLHxRCF3R2bG',
  'SECRETARÍA DE EDUCACIÓN, DESARROLLO ECONÓMICO Y SOCIAL':'1EM4GpZB29vaxCABp3T--dN9bYy9z0eJz',
  'SECRETARÍA DE PLANEACIÓN E INFRAESTRUCTURA':'1Z7FrxQc8APQQjabcZvf9kLLwT5nodD0g',
  'SECRETARÍA DE ASUNTOS AGROPECUARIOS':'1kiDmMAzHGUjWn3UEI_mjhzJkDvXBcCRe',
  'SECRETARÍA DE SALUD':'1c87Bg1pQQ6ydrtG7dTEVyByWqUHrWnMD'
};
const MAP_SUPERVISOR_CONTACTO={
  'ANA JUDITH GAMBOA MANTILLA':'GuEkoHmea8Q0CEi2cwROuR',
  'DAMARA HAIDY LEAL LEAL':'HvQIM3gY68tJfcH5PLqsTS',
  'LUZ HAYDEE ORTEGA MAYORGA':'HQhVJXsVyQ0D61ntAqrDod',
  'VALENTINA PÁEZ GUZMÁN':'Bp90wihdj5Z6a9H2mV4p5n',
  'JOSE ARCESIO VARGAS BENITEZ':'HCydU18HqL96I0BFjlymex',
  'MARLEN DEYANIRA MELO ZAMORA':'HMwizc0fb54CRkEEMEj1Lk',
  'YEIMY SUGEY ORTIZ SAENZ':'FMNWiyEBjH71rClLVjUjg7',
  'LAURA FABIANA BOCANEGRA CONDE':'DXJ1uoXhgXl3fObjPkS4te',
  'BRAYHAM JUSSET RODRIGUEZ CALDERON':'CJ0UJdJtoqI5AFHJBPig6t',
  'LIDA ERIKA SANCHEZ PEÑA':'DXJ1uoXhgXl3fObjPkS4te'
};

document.getElementById('btn-add-contratista').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  resetFormAgregarContratista();
  showView('view-agregar');
});
document.getElementById('add-secretaria').addEventListener('change',()=>{
  const val=document.getElementById('add-secretaria').value;
  document.getElementById('add-carpetaSecretaria').value=MAP_SECRETARIA_CARPETA[val]||'';
});
document.getElementById('add-supervisor').addEventListener('change',()=>{
  const val=document.getElementById('add-supervisor').value;
  document.getElementById('add-contactoSupervisor').value=MAP_SUPERVISOR_CONTACTO[val]||'';
});
document.getElementById('btn-add-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-contratistas');
});

document.getElementById('btn-add-guardar').addEventListener('click',async()=>{
  const documento=(document.getElementById('add-documento').value||'').trim();
  const nombre=(document.getElementById('add-nombre').value||'').trim();
  const secretaria=(document.getElementById('add-secretaria').value||'').trim();
  const carpetaSecretaria=(document.getElementById('add-carpetaSecretaria').value||'').trim();
  const supervisor=(document.getElementById('add-supervisor').value||'').trim();
  const contacto=(document.getElementById('add-contactoSupervisor').value||'').trim();

  // NUEVOS CAMPOS
  const contratoRaw=(document.getElementById('add-contrato').value||'').trim();
  const tipoContrato=(document.getElementById('add-tipoContrato').value||'').trim();
  const fechaContrato=(document.getElementById('add-fechaContrato').value||'').trim();   // dd/mm/2026 del picker
  const diaContrato=(document.getElementById('add-diaContrato').value||'').trim();       // "01" del picker
  const mesContrato=(document.getElementById('add-mesContrato').value||'').trim();       // "Enero" del picker
  const valorRaw=(document.getElementById('add-valor').value||'').trim();                // ej: 15000000
  const mraRaw=(document.getElementById('add-mra').value||'').trim();                    // 0
  const valorTexto=(document.getElementById('add-valorTexto').value||'').trim();         // en mayúsculas
  const cdp=(document.getElementById('add-cdp').value||'').trim();                       // 10 dígitos

  const objetoRaw = (document.getElementById('add-objeto').value || '').trim();
const obligacionesRaw = (document.getElementById('add-obligaciones').value || '').trim();

// Validaciones requeridos
if (!objetoRaw){
  Swal.fire({icon:'warning',title:'Objeto del contrato requerido'}); return;
}
if (!obligacionesRaw){
  Swal.fire({icon:'warning',title:'Obligaciones requeridas'}); return;
}

// Normalización Objeto: romper saltos de línea -> espacio, colapsar espacios y MAYÚSCULAS
const objeto = objetoRaw
  .replace(/\r?\n+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toUpperCase();

// Normalización Obligaciones:
// - NO partir por saltos de línea
// - Partir únicamente cuando aparece un marcador de ítem permitido (1..26):
//   1.  1)  1:  1-  1–  1— (con o sin espacios) ... hasta 26.
// - Dentro de cada obligación: unir saltos de línea en un solo párrafo
const obligaciones = (() => {
  const text = String(obligacionesRaw || '').trim();
  if (!text) return [];

  // Marcador permitido: (inicio o whitespace) + (1..26) + separador + opcional espacios
  // Separadores: .  )  :  -  –  —
  const marker = /(?:^|\s)((?:[1-9]|1\d|2[0-6]))\s*(?:[.)]|:|[-–—])\s*/g;

  // Si no hay marcadores, se toma todo como una sola obligación
  if (!marker.test(text)) {
    const unico = text.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
    return unico ? [unico] : [];
  }

  // Reinicia el regex porque test() avanzó el lastIndex al ser /g
  marker.lastIndex = 0;

  const parts = [];
  const indices = [];
  let match;

  while ((match = marker.exec(text)) !== null) {
    indices.push({ index: match.index, len: match[0].length });
  }

  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].index + indices[i].len;
    const end = (i + 1 < indices.length) ? indices[i + 1].index : text.length;
    const chunk = text.slice(start, end);

    const cleaned = chunk
      .replace(/\r?\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned) parts.push(cleaned);
  }

  return parts.slice(0, 26);
})();


if (obligaciones.length === 0){
  Swal.fire({icon:'warning',title:'Debes ingresar al menos una obligación'}); return;
}
  
  if(!/^\d{6,10}$/.test(documento)){
    Swal.fire({icon:'warning',title:'Documento inválido'}); return;
  }
  const nombreParts=nombre.split(/\s+/).filter(Boolean);
  if(nombreParts.length<2){
    Swal.fire({icon:'warning',title:'Nombre incompleto',text:'Ingresa mínimo nombre y apellido'}); return;
  }
  if(!secretaria || !supervisor || !carpetaSecretaria || !contacto){
    Swal.fire({icon:'warning',title:'Campos incompletos'}); return;
  }

  // Validaciones básicas nuevas
  if(!contratoRaw){ Swal.fire({icon:'warning',title:'Contrato requerido'}); return; }
  if(!tipoContrato){ Swal.fire({icon:'warning',title:'Tipo de contrato requerido'}); return; }
  if(!fechaContrato || !/^\d{2}\/\d{2}\/\d{4}$/.test(fechaContrato)){
    Swal.fire({icon:'warning',title:'Fecha de contrato inválida',text:'Usa el picker'}); return;
  }
  if(!diaContrato || !/^\d{2}$/.test(diaContrato)){
    Swal.fire({icon:'warning',title:'Día de contrato inválido'}); return;
  }
  if(!mesContrato){ Swal.fire({icon:'warning',title:'Mes de contrato requerido'}); return; }
  if(!/^\d{1,8}$/.test(valorRaw)){ Swal.fire({icon:'warning',title:'Valor inválido'}); return; }
  if(!valorTexto){ Swal.fire({icon:'warning',title:'Valor en texto faltante'}); return; }
  if(!/^\d{10}$/.test(cdp)){ Swal.fire({icon:'warning',title:'CDP inválido'}); return; }

  // Normalizaciones con ceros a la izquierda
  let numeroContrato = contratoRaw.replace(/\D/g,'');
  numeroContrato = ('000' + numeroContrato).slice(-3);   // 3 dígitos
  const contratoCell = "'" + numeroContrato;             // fuerza texto en Sheets

  let dia2 = diaContrato.replace(/\D/g,'');
  dia2 = ('00' + dia2).slice(-2);                        // 2 dígitos
  const diaContratoCell = "'" + dia2;                    // fuerza texto en Sheets

  const valorNum = Number(valorRaw.replace(/\D/g,'')) || 0;
  const mraNum   = Number(mraRaw.replace(/\D/g,'')) || 0;

  try{
    const res=await apiPost('agregarContratista',{
      documento,
      nombre:nombre.toUpperCase(),
      secretaria,
      carpetaSecretaria,
      supervisor,
      contacto,
      // ENVÍA AL BACKEND
      contrato: numeroContrato,      // el backend pondrá el prefijo '
      tipoContrato,
      fechaContrato,                 // dd/mm/yyyy
      diaContrato: dia2,             // "02"
      mesContrato,                   // "Febrero"
      valor: String(valorNum),
      mra: String(mraNum),
      valorTexto: valorTexto.toUpperCase(),
      cdp,
      objeto,                     // X (columna 24 en Sheets)
      obligaciones                // arreglo de hasta 26
    });
    Swal.fire({icon:'success',title:'Contratista Agregado',timer:3000,showConfirmButton:false});
    await cargarContratistas();
    showView('view-contratistas');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});

/* ================== DETALLES CONTRATISTA ================== */
  let _detallesDocActual = null; //
  
async function mostrarDetallesContratista(documento){
  try{
    const d=await apiGet('detallesContratista',{documento});
    const body=document.getElementById('detalles-body');
    body.innerHTML='';
    if(!d){
      body.innerHTML='<p class="muted center">No encontrado.</p>';
    }else{
      const lines=[
        `<b>NOMBRE:</b> ${d.nombre||''}`,
        `<b>CC / NIT:</b> ${d.documento||''} <b>de:</b> ${d.expedida||''}`,
        `<b>TELEFONO:</b> ${d.telefono||'SIN REGISTRO'}`,
        `<b>CORREO:</b> ${d.correo||'SIN REGISTRO'}`,
        `<b>CUENTA:</b> ${d.cuenta||''} ${d.tipoCuenta||''} ${d.banco||''}`,
        `<b>EPS:</b> ${d.eps||''}`,
        `<b>AFP:</b> ${d.pension||''}`,
        `<b>ARL:</b> ${d.arl||''}`,
        `<b>SECRETARÍA:</b> ${d.secretaria||''}`,
        `<b>SUPERVISOR:</b> ${d.supervisor||''}`,
        `<b>CONTRATO:</b> ${d.contrato||''} <b>de:</b> ${d.fechaContrato||''}`,
        `<b>OBJETO:</b> ${d.objeto||''}`,
        `<b>FECHA DE INICIO:</b> ${d.fechaInicio||''}`,
        `<b>FECHA DE TERMINO:</b> ${d.fechaTermino||''}`,
        `<b>VALOR INICIAL:</b> ${d.valor||''}`,
        `<b>MRA:</b> ${d.mra||''}`,
        `<b>VALOR FINAL:</b> ${d.valorFinal||''}`,
        `<b>CDP:</b> ${d.cdp||''}`,
        `<b>RP:</b> ${d.rp||''}`,
        `<b>CDP ADICIÓN:</b> ${d.cdpAdicion||''}`,
        `<b>RP ADICIÓN:</b> ${d.rpAdicion||''}`,
        `<b>REGIMEN:</b> ${d.regimen||''}`
      ];
      for(let i=1;i<=26;i++){
        const val=d['obligacion'+i];
        if(val && val!=='-'){
          lines.push(`<b>OBLIGACIÓN ${i}:</b> ${val}`);
        }
      }
      body.innerHTML=lines.map(l=>`<p>${l}</p>`).join('');
    }
     _detallesDocActual = documento;
    showView('view-detalles');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}
document.getElementById('detalles-ocultar').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-contratistas');
});

/* ================== REVISIÓN DE CUENTAS (Listado) ================== */
// Convierte "dd/mm/yyyy" o "dd/mm/yyyy h:mm AM/PM" a timestamp comparable
function parseFechaRadicacion(s){
  const str = String(s || '').trim();
  if(!str) return Number.POSITIVE_INFINITY; // sin fecha -> al final
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i);
  if(m){
    const dd = parseInt(m[1],10);
    const mm = parseInt(m[2],10) - 1;
    const yy = parseInt(m[3],10);
    let h = m[4] ? parseInt(m[4],10) : 0;
    const min = m[5] ? parseInt(m[5],10) : 0;
    const ampm = m[6] ? m[6].toUpperCase() : '';
    if(ampm === 'PM' && h < 12) h += 12;
    if(ampm === 'AM' && h === 12) h = 0;
    return new Date(yy, mm, dd, h, min).getTime();
  }
  const t = Date.parse(str);
  return isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

let CUENTAS_DATA=[];
async function cargarCuentasPendientes(){
  try{
    const list=await apiGet('listCuentasPendientes');
    CUENTAS_DATA=Array.isArray(list)?list:[];
    // 🔽 Ordenar: la más antigua primero (ascendente por FECHA DE RADICACIÓN)
    CUENTAS_DATA.sort((a,b)=>
      parseFechaRadicacion(a.fechaRadicacion) - parseFechaRadicacion(b.fechaRadicacion)
    );

    // Priorizar a OSCAR MAURICIO POLANIA GUERRA al inicio
    const PRIORITARIO = 'OSCAR MAURICIO POLANIA GUERRA';
    CUENTAS_DATA.sort((a, b) => {
      const aPrio = String(a.nombre || '').trim().toUpperCase() === PRIORITARIO ? 0 : 1;
      const bPrio = String(b.nombre || '').trim().toUpperCase() === PRIORITARIO ? 0 : 1;
      return aPrio - bPrio;
    });

    pintarCuentas(CUENTAS_DATA);
    actualizarResumenCuentas(CUENTAS_DATA);
  }catch(e){
    CUENTAS_DATA=[];
    pintarCuentas(CUENTAS_DATA);
    actualizarResumenCuentas(CUENTAS_DATA);
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}function actualizarResumenCuentas(list){
  const box=document.getElementById('cuentas-count');
  if(!box) return;
  if(!list.length){ box.style.display='none'; box.textContent=''; return; }
  box.textContent=String(list.length);
  box.style.display='inline-block';
}
function pintarCuentas(list){
  const wrap=document.getElementById('cuentas-list');
  wrap.innerHTML='';
  if(!list.length){
    wrap.innerHTML='<p class="muted center">No hay cuentas pendientes.</p>';
    return;
  }
  for(const c of list){
    const div=document.createElement('div');
    div.className='item-card';

    const header=document.createElement('div');
    header.className='item-header';

    const title=document.createElement('p');
    title.className='item-title';
    title.textContent= (c.nombre||'');
    header.appendChild(title);

   const pDoc=document.createElement('p');
    pDoc.className='item-sub';
    pDoc.textContent='CC / NIT: '+(c.documento||'');

    const pContrato=document.createElement('p');
    pContrato.className='item-sub';
    pContrato.textContent='CONTRATO: '+(c.contrato||'');

    const pInf=document.createElement('p');
    pInf.className='item-sub';
    pInf.textContent='INFORME: '+(c.informe||'')+' de: '+(c.totalInformes||'');
 
    const pSupervisor=document.createElement('p');
    pSupervisor.className='item-sub';
    pSupervisor.textContent='SUPERVISOR: '+(c.supervisor||'');

    const btnRow=document.createElement('div');
    btnRow.className='btn-row';

      // ✅ NUEVO: FECHA DE RADICACIÓN debajo de CONTRATO (rojo + latido)
    const pRad = document.createElement('p');
    pRad.className = 'item-sub rad-latido';
    pRad.textContent = 'FECHA DE RADICACIÓN: ' + (c.fechaRadicacion || '');
    div.appendChild(pRad);

    const btnRevisar=document.createElement('button');
btnRevisar.textContent='REVISAR';
btnRevisar.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  abrirRevisionCuenta(c.documento);
});
    btnRow.appendChild(btnRevisar);

    div.appendChild(header);
    div.appendChild(pDoc);
    div.appendChild(pContrato);
    div.appendChild(pInf);
    div.appendChild(pSupervisor);
    div.appendChild(btnRow);
    wrap.appendChild(div);
  }
}
document.getElementById('cuentas-filter').addEventListener('input',()=>{
  const input = document.getElementById('cuentas-filter');
  const q = (input.value || '').trim().toLowerCase();

  const qDigits = q.replace(/\D/g,'');
  const allowDocumento = qDigits.length >= 6;

  const filtered = CUENTAS_DATA.filter(c=>{
    const nombre = String(c.nombre||'').toLowerCase();
    const informe = String(c.informe||'').toLowerCase();
    const totalInformes = String(c.totalInformes||'').toLowerCase();
    const supervisor = String(c.supervisor||'').toLowerCase();

    const contratoDigits  = String(c.contrato||'').replace(/\D/g,'');
    const documentoDigits = String(c.documento||'').replace(/\D/g,'');

    const hitTexto =
      nombre.includes(q) ||
      informe.includes(q) ||
      totalInformes.includes(q) ||
      supervisor.includes(q);

    const hitContrato = qDigits ? contratoDigits.includes(qDigits) : false;
    const hitDocumento = allowDocumento && qDigits ? documentoDigits.includes(qDigits) : false;

    return hitTexto || hitContrato || hitDocumento;
  });

  pintarCuentas(filtered);
  actualizarResumenCuentas(filtered);
});
document.getElementById('revision-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== REVISAR CUENTA (Detalle) ================== */

  function resetSeccionesRevision(){
  const parts = [
    { sec:'sec-contrato',   btn:'btn-toggle-contrato',  label:'Ver Información del Contrato' },
    { sec:'sec-informe',    btn:'btn-toggle-informe',   label:'Ver Relación de Informe y Pago' },
    { sec:'sec-planilla',   btn:'btn-toggle-planilla',  label:'Ver Relación de Planilla' },
    { sec:'sec-planilla2',  btn:'btn-toggle-planilla2', label:'Ver Relación de Planilla Anexa' },
    { sec:'sec-actividades',btn:'btn-toggle-actividades',label:'Ver Relación de Actividades' }
  ];
  parts.forEach(({sec, btn, label})=>{
    const s = document.getElementById(sec);
    const b = document.getElementById(btn);
    if (s) s.classList.add('hidden');   // asegura cerrado
    if (b) b.textContent = label;       // restaura el texto "Ver ..."
  });
}
  
let REV_CUENTA=null;
async function abrirRevisionCuenta(documento){
  try{
    const data=await apiGet('revisarCuentaData',{documento});
    if(!data){
      Swal.fire({icon:'info',title:'No encontrado'}); return;
    }
    REV_CUENTA=data;

    const obsEl = document.getElementById('rc-observaciones');
    if(obsEl) obsEl.value = '';

    resetSeccionesRevision();
    renderRevisionCuenta();
    showView('view-revisar-cuenta');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}
function renderRevisionCuenta(){
  const c=REV_CUENTA?.contratista;
  const cu=REV_CUENTA?.cuenta;
  const rcTitle=document.getElementById('rc-title');
  const rcBody=document.getElementById('rc-body');
  rcTitle.textContent='REVISIÓN DE CUENTA N° '+(cu?.informe||'')+' de '+(c?.nombre||'');
  rcBody.innerHTML='';
  const baseInfo=[
    `<b>DOCUMENTO:</b> ${c?.documento||''}`,
    `<b>SECRETARÍA:</b> ${c?.secretaria||''}`,
    `<b>SUPERVISOR:</b> ${c?.supervisor||''}`
  ];
  rcBody.innerHTML=baseInfo.map(x=>`<p>${x}</p>`).join('');

  const sContrato=document.getElementById('sec-contrato');
  sContrato.innerHTML=[
    `<b>CONTRATO N°:</b> ${c?.contrato||''}`,
    `<b>OBJETO:</b> ${c?.objeto||''}`,
    `<b>FECHA DE CONTRATO:</b> ${c?.fechaContrato||''}`,
    `<b>FECHA DE INICIO:</b> ${c?.fechaInicio||''}`,
    `<b>FECHA DE TERMINO:</b> ${c?.fechaTermino||''}`,
    `<b>VALOR INICIAL:</b> ${c?.valor || '-'}`,
    `<b>MRA:</b> ${c?.mra||''}`,
    `<b>VALOR FINAL:</b> ${c?.valorFinal||''}`,
    `<b>CDP:</b> ${c?.cdp||''}`,
    `<b>RP:</b> ${c?.rp||''}`,
    `<b>CDP ADICIÓN:</b> ${c?.cdpAdicion||''}`,
    `<b>RP ADICIÓN:</b> ${c?.rpAdicion||''}`,
    `<b>SECRETARÍA:</b> ${c?.secretaria||''}`,
    `<b>SUPERVISOR:</b> ${c?.supervisor||''}`,
  ].map(x=>`<p>${x}</p>`).join('');

  const sInforme=document.getElementById('sec-informe');
  sInforme.innerHTML=[
    `<h4 style="margin:4px 0;color:var(--primary)">RELACIÓN DE INFORME</h4>`,
    `<p><b>FECHA DE RADICACIÓN:</b> ${cu?.fechaRadicacion||''}</p>`,
    `<p><b>INFORME:</b> ${cu?.informe||''} de ${cu?.totalInformes||''}</p>`,
    `<p><b>INICIO DE PERIODO RATIFICADO:</b> ${cu?.inicioRatificar||''}</p>`,
    `<p><b>FIN DE PERIODO RATIFICADO:</b> ${cu?.finRatificar||''}</p>`,
    `<h4 style="margin:14px 0 4px;color:var(--primary)">RELACIÓN DE PAGO</h4>`,
    `<p><b>N° FACTURA DIGITAL:</b> ${cu?.facturaDigital || 'N/A'}</p>`,
    `<p><b>SALDO ACTUAL:</b> ${cu?.saldoActual||''}</p>`,
    `<p><b>VALOR COBRADO:</b> ${cu?.menos||''}</p>`,
    `<p><b>NUEVO SALDO:</b> ${cu?.nuevoSaldo||''}</p>`
  ].join('');

  const sPlanilla=document.getElementById('sec-planilla');
  sPlanilla.innerHTML=[
    `<h4 style="margin:4px 0;color:var(--primary)">RELACIÓN DE PLANILLA</h4>`,
    `<p><b>PLANILLA N°:</b> ${cu?.planilla||''} de ${cu?.mesPlanilla||''}</p>`,
    `<p><b>BASE DE COTIZACIÓN:</b> ${cu?.base||''}</p>`,
    `<p><b>APORTES A SALUD:</b> ${cu?.salud||''}</p>`,
    `<p><b>APORTES A PENSIÓN:</b> ${cu?.fondo||''}</p>`,
    `<p><b>APORTES A ARL:</b> ${cu?.riesgos||''}</p>`,
    `<p><b>APORTES FPS:</b> ${cu?.solidario||''} ${cu?.aporte||''}</p>`
  ].join('');

  const sPlanilla2=document.getElementById('sec-planilla2');
  sPlanilla2.innerHTML=[
    `<h4 style="margin:4px 0;color:var(--primary)">RELACIÓN DE PLANILLA ANEXA</h4>`,
    `<p><b>PLANILLA ANEXA N°:</b> ${cu?.planilla2||''} de ${cu?.mesPlanilla2||''}</p>`,
    `<p><b>BASE DE COTIZACIÓN:</b> ${cu?.base2||''}</p>`,
    `<p><b>APORTES A SALUD:</b> ${cu?.salud2||''}</p>`,
    `<p><b>APORTES A PENSIÓN:</b> ${cu?.fondo2||''}</p>`,
    `<p><b>APORTES A ARL:</b> ${cu?.riesgos2||''}</p>`,
    `<p><b>APORTES FPS:</b> ${cu?.solidario2||''} ${cu?.aporte2||''}</p>`
  ].join('');

  // === Actividades sin paginación, mostrando solo las con contenido ===
  const blocksWrap=document.getElementById('actividades-blocks');
  blocksWrap.innerHTML='';
  const actividades=REV_CUENTA?.actividades||[];
  const evidencias=REV_CUENTA?.evidencias||[];
  const obligaciones=REV_CUENTA?.obligaciones||[];
  const total=obligaciones.length;

  function extraerDriveId(url){
    if(!url) return '';
    const primera=String(url).trim().split(/\s+/)[0];
    const patrones=[
      /\/d\/([A-Za-z0-9_-]{10,})/,
      /id=([A-Za-z0-9_-]{10,})/,
      /\/file\/d\/([A-Za-z0-9_-]{10,})/,
      /open\?[^#]*id=([A-Za-z0-9_-]{10,})/
    ];
    for(const rx of patrones){
      const m=primera.match(rx);
      if(m) return m[1];
    }
    return '';
  }

  function evidenciaThumb(url){
  const id=extraerDriveId(url);
  return id ? 'https://drive.google.com/thumbnail?sz=w1000&id='+id : url;
}
function evidenciaFull(url){
  if(!url) return '';
  const primera = String(url).trim().split(/\s+/)[0];
  const patrones = [
    /\/d\/([A-Za-z0-9_-]{10,})/,
    /id=([A-Za-z0-9_-]{10,})/,
    /\/file\/d\/([A-Za-z0-9_-]{10,})/,
    /open\?[^#]*id=([A-Za-z0-9_-]{10,})/
  ];
  let id = '';
  for(const rx of patrones){
    const m = primera.match(rx);
    if(m){ id = m[1]; break; }
  }
  // Usa thumbnail con tamaño grande en lugar de uc?export=view (que devuelve 403)
  return id
    ? 'https://drive.google.com/thumbnail?sz=w1600&id='+id
    : primera;
}

 /* Helper de zoom — usa lightbox nativo (sin alert) */
function abrirZoomEvidencia(src) {
  if (typeof openEvLightbox_ === 'function') {
    openEvLightbox_(src);
  }
}

  for(let i=1;i<=total;i++){
    const oblig=obligaciones[i-1];
    const act=actividades[i-1];
    const evid=evidencias[i-1];

    if(![oblig,act,evid].some(v=>v && v!=='-')) continue;

    const block=document.createElement('div');
    block.className='oblig-block';

    const titulo=document.createElement('p');
    titulo.className='oblig-title';
    titulo.textContent='OBLIGACIÓN N° '+i;
    block.appendChild(titulo);

  if(oblig && oblig!=='-'){
  const ob = document.createElement('p');
  ob.className = 'oblig-sub';
  ob.style.whiteSpace = 'pre-line';

  const bOb = document.createElement('b');
  bOb.textContent = String(oblig);

  ob.appendChild(bOb);
  block.appendChild(ob);
}
    if(act && act!=='-'){
  const ac = document.createElement('p');
  ac.className = 'oblig-sub';
  ac.style.whiteSpace = 'pre-line';

  const bAct = document.createElement('b');
  bAct.textContent = 'Actividades: ';
  ac.appendChild(bAct);

  // ✅ Detectar URLs en el texto y convertirlas en enlaces clicables
  const texto = String(act);
  const regexUrl = /(https?:\/\/[^\s]+)/g;
  let ultimoIndice = 0;
  let match;
  while ((match = regexUrl.exec(texto)) !== null) {
    if (match.index > ultimoIndice) {
      ac.appendChild(document.createTextNode(texto.substring(ultimoIndice, match.index)));
    }
    // Limpiar signos de puntuación finales que no son parte de la URL
    let urlLimpia = match[0];
    const puntFinal = urlLimpia.match(/[.,;:!?)\]]+$/);
    if (puntFinal) urlLimpia = urlLimpia.slice(0, -puntFinal[0].length);

    const enlace = document.createElement('a');
    enlace.href = urlLimpia;
    enlace.textContent = urlLimpia;
    enlace.target = '_blank';
    enlace.rel = 'noopener noreferrer';
    enlace.style.color = '#1d4ed8';
    enlace.style.textDecoration = 'underline';
    enlace.style.wordBreak = 'break-all';
    ac.appendChild(enlace);

    if (puntFinal) ac.appendChild(document.createTextNode(puntFinal[0]));
    ultimoIndice = match.index + match[0].length;
  }
  if (ultimoIndice < texto.length) {
    ac.appendChild(document.createTextNode(texto.substring(ultimoIndice)));
  }

  block.appendChild(ac);
}
    if(evid && evid!=='-'){
      const evDiv=document.createElement('div');
      evDiv.className='evidence-grid';
      const img=document.createElement('img');
      img.className='evidence-thumb';
      img.src=evidenciaThumb(evid);
      img.alt='Evidencia '+i;
      img.addEventListener('click', ()=>{
  const full = evidenciaFull(evid);
   abrirZoomEvidencia(full);
});
      evDiv.appendChild(img);
      block.appendChild(evDiv);
    }
               blocksWrap.appendChild(block);
  }

    // === Mostrar/ocultar y parametrizar botones "SEGUIMIENTO" y "CUENTA" (debajo de Actividades) ===
const cuentaBtn = document.getElementById('btn-abrir-carpeta-cuenta');
const segBtn    = document.getElementById('btn-abrir-seguimiento');

const observPrev = String(REV_CUENTA?.cuenta?.observacionesPrev || '').trim();

if (cu?.informe && c?.carpetaContratista){
  if (cuentaBtn){
    cuentaBtn.classList.remove('hidden');
    cuentaBtn.dataset.parent  = c.carpetaContratista;          // carpeta del contratista (padre)
    cuentaBtn.dataset.informe = String(cu.informe).trim();      // número de informe
    if (cu?.idCuenta){                                         // ID directo de la subcarpeta (BH)
      cuentaBtn.dataset.subId = String(cu.idCuenta).trim();
    } else {
      delete cuentaBtn.dataset.subId;
    }
  }

  // Seguimiento: siempre disponible en esta vista, muestra CL anterior
  if (segBtn){
    segBtn.classList.remove('hidden');
    segBtn.dataset.obs = observPrev; // CL
  }
} else {
  if (cuentaBtn){
    cuentaBtn.classList.add('hidden');
    delete cuentaBtn.dataset.parent;
    delete cuentaBtn.dataset.informe;
    delete cuentaBtn.dataset.subId;
  }
  if (segBtn){
    segBtn.classList.add('hidden');
    delete segBtn.dataset.obs;
  }
}
  
document.getElementById('rc-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  resetSeccionesRevision();     // cierra cualquier sección abierta
  showView('view-revision');    // vuelve a la lista
});


// Abrir directamente la subcarpeta "CUENTA <informe>" usando su ID (BH->idCuenta)
const btnAbrirCarpetaCuenta = document.getElementById('btn-abrir-carpeta-cuenta');
btnAbrirCarpetaCuenta.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);

  const subId = btnAbrirCarpetaCuenta.dataset.subId || '';
  const parentId = btnAbrirCarpetaCuenta.dataset.parent || REV_CUENTA?.contratista?.carpetaContratista || '';

  if (subId){
    window.open('https://drive.google.com/drive/folders/' + subId, '_blank');
    return;
  }

  // Fallback solo si no llegó BH: abre la carpeta del contratista
  if (parentId){
    Swal.fire({ icon:'info', title:'Falta id de CUENTA', text:'Se abrirá la carpeta del contratista.' });
    window.open('https://drive.google.com/drive/folders/' + parentId, '_blank');
  } else {
    Swal.fire({ icon:'info', title:'Sin carpeta', text:'Este contratista no tiene "carpetaContratista" asociada.' });
  }
});

  const btnAbrirSeguimiento = document.getElementById('btn-abrir-seguimiento');
if (btnAbrirSeguimiento && !btnAbrirSeguimiento.dataset.bound){
  btnAbrirSeguimiento.dataset.bound = '1';
  btnAbrirSeguimiento.addEventListener('click', async ()=>{
    playSoundOnce(SOUNDS.info);

    const obs = String(btnAbrirSeguimiento.dataset.obs || '').trim();
    await Swal.fire({
      icon: 'success',
      title: 'OBSERVACIONES DE SEGUIMIENTO',
      text: obs ? obs : 'Sin observaciones anteriores',
      confirmButtonText: 'Cerrar'
    });
  });
}
  
document.getElementById('rc-guardar').addEventListener('click', async ()=>{
  if(!REV_CUENTA?.cuenta){
    Swal.fire({icon:'warning',title:'Sin cuenta cargada'}); return;
  }
  const documento = REV_CUENTA.contratista.documento;
  const nombre    = REV_CUENTA.contratista.nombre;
  const informe   = REV_CUENTA.cuenta.informe;
  const supervisor        = REV_CUENTA.contratista.supervisor;
  const supervisorGrupoId = (REV_CUENTA.contratista.contacto || '').trim(); // ahora es grupo
  const telContratistaRaw = REV_CUENTA.contratista.telefono;
  const correo    = (REV_CUENTA.contratista.correo || '').trim();
  const observ = (document.getElementById('rc-observaciones').value || '').trim();

  const telContratista = normalizeContratistaNumber(telContratistaRaw);

  const rs = await Swal.fire({
    icon:'success',
    title:`Haz revisado la cuenta N° ${informe} de ${nombre}`,
    text:'Toma una de las opciones.',
    showCancelButton:true,
    showDenyButton:true,
    confirmButtonText:'Aprobar',
    denyButtonText:'Devolver',
    cancelButtonText:'Cancelar'
  });

 function msgAprobado(){
  return (
    '> Estado 2️⃣\n' +
    'Estimado(a) *'+nombre+'*\n\n' +
    '¡Tu *Cuenta N° '+informe+'* ha sido *Aprobada*! ✅\n\n' +
    '📌 En la *App Contratista*, toma la opción *MI CUENTA DRIVE*, si te aparece que no tienes acceso, en la parte inferior usa el correo *'+correo+'*\n' +
    '📌 Descarga los documentos de la carpeta *CUENTA '+informe+', ¡IMPRIME DE UNA VEZ!*\n\n' +
    'Después de hacer correctamente el Plan de Pagos en el SECOP II:\n' +
    '📌 Toma la opción *PLAN DE PAGOS* en la App para avisarle a tu Supervisor(a).\n\n' +
    'Cordialmente,\n\n*Equipo de Contratación*\n> Alcaldía de Flandes'
  );
}

// NUEVO: URL del PDF para enviar como media
const URL_GUIA_PLAN_PAGOS = 'https://res.cloudinary.com/dqqeavica/image/upload/v1772819956/GU%C3%8DA_PLAN_DE_PAGOS_ouq59i.pdf';
  
  function msgDevueltaContratista(){
    return (
      'Estimado(a) *'+nombre+'*\n\n' +
      'Se ha devuelto tu *Cuenta N° '+informe+'* por esta inconsistencia que omitió tu supervisor(a):\n\n*'+(observ || 'Sin observaciones')+'*\n\n' +
      'Toma la opción *CORREGIR CUENTA* desde la *App Contratista* teniendo en cuenta las observaciones anteriores.\n' +
      'Una vez corregida y guardada, toma la opción *REPORTAR CUENTA* para avisarle a tu supervisor(a).' + '\n\n' +
      'Cordialmente,\n\n*Equipo de Contratación*\n> Alcaldía de Flandes'
    );
  }
  function msgDevueltaSupervisor(){
    return (
      '❌ Estimado(a) *'+supervisor+'* ❌\n\n' +
      'Se ha devuelto la *Cuenta N° '+informe+'* de *'+nombre+'* por esta inconsistencia:\n\n*'+(observ || 'Sin observaciones')+'*\n\n' +
      'El(la) Contratista ya ha sido notificado(a).\n\n' +
      'Cordialmente,\n\n*Equipo de Contratación*'
    );
  }

  if(rs.isConfirmed){
    try{
      await apiPost('aprobarCuenta',{
        documento,
        informe,
        estadoAprobada: 'APROBADA',
        responsable: (currentUser?.profesional || '').trim()
      });
      if(telContratista){
        sendBuilderbotMessage(telContratista, msgAprobado(), URL_GUIA_PLAN_PAGOS);
      } else {
        console.warn('Teléfono contratista inválido/no disponible');
      }
      Swal.fire({icon:'success',title:'Cuenta Aprobada',timer:1800,showConfirmButton:false});
      await cargarCuentasPendientes();
      showView('view-revision');
    }catch(e){
      Swal.fire({icon:'error',title:'Error',text:e.message});
    }
  } else if(rs.isDenied){
    try{
      await apiPost('devolverCuenta',{
        documento,
        informe,
        observaciones: observ,
        estadoAprobada: 'DEVUELTA',
        responsable: (currentUser?.profesional || '').trim()
      });
      if(supervisorGrupoId){
        // Se envía tal cual como "number" porque el backend acepta grupo también
        sendBuilderbotMessage(supervisorGrupoId, msgDevueltaSupervisor());
      } else {
        console.warn('ID grupo supervisor vacío');
      }
      if(telContratista){
        sendBuilderbotMessage(telContratista, msgDevueltaContratista());
      }
      Swal.fire({icon:'success',title:'Cuenta Devuelta',timer:1800,showConfirmButton:false});
      await cargarCuentasPendientes();
      showView('view-revision');
    }catch(e){
      Swal.fire({icon:'error',title:'Error',text:e.message});
    }
  }
});
}

  function initRevisionToggleSections(){
  const defs = [
    ['btn-toggle-contrato','sec-contrato','Ver Información del Contrato','Ocultar Información del Contrato'],
    ['btn-toggle-informe','sec-informe','Ver Relación de Informe y Pago','Ocultar Relación de Informe y Pago'],
    ['btn-toggle-planilla','sec-planilla','Ver Relación de Planilla','Ocultar Relación de Planilla'],
    ['btn-toggle-planilla2','sec-planilla2','Ver Relación de Planilla Anexa','Ocultar Relación de Planilla Anexa'],
    ['btn-toggle-actividades','sec-actividades','Ver Relación de Actividades','Ocultar Relación de Actividades']
  ];
  defs.forEach(([btnId,secId,showTxt,hideTxt])=>{
    const btn = document.getElementById(btnId);
    const sec = document.getElementById(secId);
    if(!btn || !sec) return;
    if(btn.dataset.bound) return;  // evita duplicados
    btn.dataset.bound = '1';
    btn.addEventListener('click',()=>{
      const visible = !sec.classList.contains('hidden');
      if(visible){
        sec.classList.add('hidden');
        btn.textContent = showTxt;
      }else{
        sec.classList.remove('hidden');
        btn.textContent = hideTxt;
      }
    });
  });
}
initRevisionToggleSections();
  
  
/* ================== REQUERIMIENTOS ================== */
let REQ_DATA=[];
async function cargarRequerimientosBase(){
  try{
    const list=await apiGet('listContratistas');
    REQ_DATA=Array.isArray(list)?list:[];
    pintarRequerimientos(REQ_DATA);
    actualizarResumenReq(REQ_DATA);
  }catch(e){
    REQ_DATA=[];
    pintarRequerimientos(REQ_DATA);
    actualizarResumenReq(REQ_DATA);
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}
function actualizarResumenReq(list){
  const box=document.getElementById('req-count');
  if(!box) return;
  if(!list.length){ box.style.display='none'; box.textContent=''; return; }
  box.textContent=String(list.length);
  box.style.display='inline-block';
}
function pintarRequerimientos(list){
  const wrap=document.getElementById('req-list');
  wrap.innerHTML='';
  if(!list.length){
    wrap.innerHTML='<p class="muted center">No hay contratistas.</p>';
    return;
  }
  for(const c of list){
    const div=document.createElement('div');
    div.className='item-card';

    const header=document.createElement('div');
    header.className='item-header';

    const title=document.createElement('p');
    title.className='item-title';
    title.textContent=(c.nombre||'');

    header.appendChild(title);
    div.appendChild(header);

    const btnRow=document.createElement('div');
    btnRow.className='btn-row';

    const btnRedact=document.createElement('button');
btnRedact.textContent='REDACTAR';
btnRedact.addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  abrirModalRequerimiento(c);
});

    btnRow.appendChild(btnRedact);
    div.appendChild(btnRow);

    wrap.appendChild(div);
  }
}
document.getElementById('req-filter').addEventListener('input',()=>{
  const q=document.getElementById('req-filter').value.trim().toLowerCase();
  const filtered=REQ_DATA.filter(c=>{
    return [c.nombre,c.documento,c.secretaria,c.supervisor,c.telefono]
      .some(v=>String(v||'').toLowerCase().includes(q));
  });
  pintarRequerimientos(filtered);
  actualizarResumenReq(filtered);
});
document.getElementById('req-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== MODAL REQUERIMIENTO ================== */
let MODAL_TARGET=null;
function abrirModalRequerimiento(c){
  MODAL_TARGET=c;
  document.getElementById('modal-req-text').value='';
  document.getElementById('modal-requerimiento').classList.remove('hidden');
}
document.getElementById('modal-req-cancelar').addEventListener('click',()=>{
  document.getElementById('modal-requerimiento').classList.add('hidden');
});
document.getElementById('modal-req-enviar').addEventListener('click',()=>{
  const txt=(document.getElementById('modal-req-text').value||'').trim();
  if(!MODAL_TARGET){ return; }
  if(!txt){
    Swal.fire({icon:'warning',title:'Texto requerido'}); return;
  }
  // Normaliza el teléfono (agrega 57 si viene a 10 dígitos y valida)
const telefonoNormalizado = normalizeContratistaNumber(MODAL_TARGET.telefono);
const nombre = (MODAL_TARGET.nombre || '').trim();

// Mensaje EXACTO solicitado
const mensaje = 
  'Estimado(a) *' + nombre + '*\n\n' +
  'Tenemos el siguiente requerimiento:\n\n*' + txt + '*\n\n' +
  'Cordialmente,\n\n*Equipo de Contratación*\n> Alcaldía de Flandes';

if (telefonoNormalizado){
  sendBuilderbotMessage(telefonoNormalizado, mensaje);
} else {
  // Si el número no es válido, avisa al usuario
  Swal.fire({ icon:'warning', title:'Teléfono inválido', text:'No se pudo enviar el requerimiento por WhatsApp.' });
}
  document.getElementById('modal-requerimiento').classList.add('hidden');
  Swal.fire({icon:'success',title:'Requerimiento enviado',timer:1800,showConfirmButton:false});
});

/* ================== COMUNICADOS ================== */
document.getElementById('comunicado-enviar').addEventListener('click',async()=>{
  const txt=(document.getElementById('comunicado-text').value||'').trim();
  if(!txt){ Swal.fire({icon:'warning',title:'Texto requerido'}); return; }
  try{
    await apiPost('guardarComunicado',{
      profesional: currentUser?.profesional || '',
      noticia: txt
    });
    Swal.fire({icon:'success',title:'COMUNICADO CARGADO CON ÉXITO',timer:4000,showConfirmButton:false});
    document.getElementById('comunicado-text').value='';
    renderInicio();
    showView('view-inicio');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});
document.getElementById('comunicado-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== SOPORTE ================== */
document.getElementById('soporte-enviar').addEventListener('click',async()=>{
  const txt=(document.getElementById('soporte-text').value||'').trim();
  if(!txt){ Swal.fire({icon:'warning',title:'Texto requerido'}); return; }
  try{
    await apiPost('guardarSoporte',{
      profesional: currentUser?.profesional || '',
      soporte: txt,
      celular: currentUser?.celular || ''
    });
    Swal.fire({icon:'success',title:'SOLICITUD CARGADA CON ÉXITO',timer:4000,showConfirmButton:false});
    document.getElementById('soporte-text').value='';
    renderInicio();
    showView('view-inicio');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});
document.getElementById('soporte-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== PWA AVANZADO ================== */
let deferredPrompt = null;
let __installStartShown = false;    // bandera: ya mostramos "App instalándose"
let __installSuccessShown = false;  // bandera: ya mostramos "Instalación exitosa"

function isStandalone(){
  const dmStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const dmInstalled  = window.matchMedia('(display-mode: installed)').matches;
  const iosStandalone = (window.navigator.standalone === true);
  return dmStandalone || dmInstalled || iosStandalone;
}
function isIOS(){
  return /(iphone|ipad|ipod)/i.test(navigator.userAgent || '');
}
function isMarkedInstalled(){
  try{ return localStorage.getItem('pwaInstalledFlag') === '1'; }catch(_){ return false; }
}
function markInstalled(){
  try{ localStorage.setItem('pwaInstalledFlag', '1'); }catch(_){}
}
function clearInstalledMark(){
  try{ localStorage.removeItem('pwaInstalledFlag'); }catch(_){}
}
async function detectInstalled(){
  if (isStandalone()) return true;
  if (typeof navigator.getInstalledRelatedApps === 'function'){
    try{
      const apps = await navigator.getInstalledRelatedApps();
      const found = apps.some(a =>
        a.platform === 'webapp' &&
        typeof a.url === 'string' &&
        /manifest\.webmanifest$/.test(a.url)
      );
      if (found){
        markInstalled();
        return true;
      } else {
        clearInstalledMark();
      }
    }catch(_){}
  }
  return isMarkedInstalled();
}
function updateInstallButtonsVisibility(){
  const btn1 = document.getElementById('btn-instalar');
  const canPrompt = !!deferredPrompt;
  const installed = isMarkedInstalled() || isStandalone();
  const shouldShow = !installed && (canPrompt || isIOS());
  if(btn1) btn1.style.display = shouldShow ? '' : 'none';
}

window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  updateInstallButtonsVisibility();
});

window.addEventListener('appinstalled', ()=>{
  markInstalled();
  deferredPrompt = null;
  updateInstallButtonsVisibility();
});

document.getElementById('btn-instalar').addEventListener('click', async ()=>{
  // Flujo iOS: se respeta exactamente tu alerta e instrucciones
  if(isIOS()){
    Swal.fire({
      icon:'info',
      title: '¡Para Instalar en tu Iphone!',
  html: `
    <div style="text-align:center; margin-top:8px;">
      <img
        src="https://res.cloudinary.com/dqqeavica/image/upload/v1765745210/instalacion_ios_ysbhnd.gif"
        alt="Instalación de IOS"
        style="width:180px; max-width:70vw; height:auto; display:block; margin:0 auto 12px;"
      >
      <div style="margin-top:10px;">
        <b>1.</b> Toca Compartir.<br><b>2.</b> Elige "Agregar a pantalla de inicio".<br><b>3.</b> Confirma "Agregar".
      </div>
    </div>
  `,
    });
    return;
  }
  // Android: requiere beforeinstallprompt (deferredPrompt)
  if(!deferredPrompt){
    Swal.fire({icon:'info',title:'Instalación no disponible todavía'});
    return;
  }

  const dp = deferredPrompt;
  dp.prompt();                           // muestra diálogo nativo de instalación
  const choice = await dp.userChoice;    // espera la elección del usuario
  deferredPrompt = null;                 // limpia el prompt (solo se usa una vez)

  if (choice.outcome === 'accepted'){
    // Primera alerta (Android): confirma inicio de instalación por 6 segundos
    markInstalled();
    __installStartShown = true;
    Swal.fire({
  icon: 'success',
  title: '¡App instalándose!',
  html: `
    <div style="text-align:center; margin-top:8px;">
      <img
        src="https://res.cloudinary.com/dqqeavica/image/upload/v1765740540/instalacion_lydtcl.gif"
        alt="Instalando app"
        style="width:180px; max-width:70vw; height:auto; display:block; margin:0 auto 12px;"
      >
      <div>Debes esperar unos segundos mientras el sistema instala la App.</div>
      <div style="margin-top:10px;">
        <b>Al desaparecer este aviso, puedes salir de esta vista. La App aparecerá en la pantalla principal de este dispositivo.</b>
      </div>
    </div>
  `,
  timer: 12000,
  showConfirmButton: false
});
  } else {
    Swal.fire({icon:'info',title:'Instalación cancelada'});
  }

  updateInstallButtonsVisibility();
});

async function initPWAVista(){
  const installed = await detectInstalled();
  if (installed){
    showView('view-login');
  } else {
    showView('view-instalar');
    updateInstallButtonsVisibility();
  }
}
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}
window.addEventListener('load', initPWAVista);
  
  
// Helper para IDs con prefijo "add-"
function $id(base) {
  return document.getElementById('add-' + base) || document.getElementById(base);
}

/* ========= FECHA CONTRATO (ruleta) ========= */
(function initPickerFecha() {
  const dias = document.getElementById('pickerDia');
  const meses = document.getElementById('pickerMes');
  if (!dias || !meses) return;

  for (let d = 1; d <= 31; d++) {
    const opt = document.createElement('option');
    opt.value = String(d).padStart(2, '0');
    opt.textContent = String(d).padStart(2, '0');
    dias.appendChild(opt);
  }

  const mesesNombres = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];
  for (let i = 0; i < 12; i++) {
    const opt = document.createElement('option');
    opt.value = String(i + 1).padStart(2, '0');
    opt.textContent = mesesNombres[i];
    meses.appendChild(opt);
  }
})();

function abrirPickerFecha() {
  const modal = document.getElementById('fechaModal');
  if (modal) modal.style.display = 'flex';
}
function cancelarPickerFecha() {
  const modal = document.getElementById('fechaModal');
  if (modal) modal.style.display = 'none';
  const fc = $id('fechaContrato'); if (fc) fc.value = '';
  const d  = $id('diaContrato');   if (d)  d.value = '';
  const m  = $id('mesContrato');   if (m)  m.value = '';
}
function confirmarPickerFecha() {
  const modal = document.getElementById('fechaModal');
  const dSel = (document.getElementById('pickerDia')?.value) || '01';
  const mSel = (document.getElementById('pickerMes')?.value) || '01';
  const anio = '2026';

  const fc = $id('fechaContrato'); if (fc) fc.value = `${dSel}/${mSel}/${anio}`;
  const d  = $id('diaContrato');   if (d)  d.value = dSel;

  const mesesNombres = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];
  const idx = Math.max(1, Math.min(12, parseInt(mSel, 10))) - 1;
  const m   = $id('mesContrato');   if (m)  m.value = mesesNombres[idx];

  if (modal) modal.style.display = 'none';
}

(function bindFechaContratoChange(){
  const fc = $id('fechaContrato');
  if (!fc) return;
  fc.addEventListener('change', function () {
    actualizarCamposFecha(this.value, 'diaContrato', 'mesContrato');
  });
})();
function actualizarCamposFecha(fechaISO, idDiaBase, idMesBase) {
  if (!fechaISO) {
    const d = $id(idDiaBase); if (d) d.value = '';
    const m = $id(idMesBase); if (m) m.value = '';
    return;
  }
  const dObj = new Date(fechaISO + 'T00:00:00');
  if (isNaN(dObj)) {
    const d = $id(idDiaBase); if (d) d.value = '';
    const m = $id(idMesBase); if (m) m.value = '';
    return;
  }
  const dd = String(dObj.getUTCDate()).padStart(2, '0');
  const mm = dObj.getUTCMonth();
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const d = $id(idDiaBase); if (d) d.value = dd;
  const m = $id(idMesBase); if (m) m.value = meses[mm];
}

/* ========= VALOR -> VALOR TEXTO (MAYÚSCULA) ========= */
(function initValorTexto(){
  const valor = $id('valor');
  const valorTexto = $id('valorTexto');
  if (!valor || !valorTexto) return;

  valor.addEventListener('input', () => {
    let raw = (valor.value || '').replace(/\D/g, '');
    valor.value = raw;
    const len = raw.length;

    valorTexto.style.border = '';
    if ((len >= 1 && len <= 5) || len > 8) {
      valorTexto.style.border = '2px solid red';
    } else if (len === 8) {
      valorTexto.style.border = '2px solid green';
    }

    const n = parseInt(raw || '0', 10);
    const texto = convertirNumeroATexto(n); // ya retorna en mayúsculas
    valorTexto.value = texto ? (texto + ' PESOS M/CTE') : '';
    // Garantizar mayúsculas siempre:
    valorTexto.value = (valorTexto.value || '').toUpperCase();
  });
})();

/* ========= CDP (borde verde si empieza por 2026) ========= */
(function initCDP(){
  const cdp = $id('cdp');
  if (!cdp) return;
  cdp.addEventListener('input', () => {
    let raw = (cdp.value || '').replace(/\D/g, '').slice(0, 10);
    cdp.value = raw;
    cdp.style.border = '';
    if (raw.length === 10 && raw.startsWith('2026')) {
      cdp.style.border = '2px solid green';
    }
  });
})();

/* ========= Conversor número->texto (MAYÚSCULAS) ========= */
function convertirNumeroATexto(numero) {
  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas  = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  const especiales = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];

  function convCentenas(n) {
    if (n === 100) return "CIEN";
    if (n > 100) return (centenas[Math.floor(n/100)] + " " + convDecenas(n%100)).trim();
    return convDecenas(n);
  }
  function convDecenas(n) {
    if (n < 10) return unidades[n];
    if (n < 20) return especiales[n-10];
    if (n === 20) return "VEINTE";
    if (n < 30) return "VEINTI" + unidades[n%10];
    return decenas[Math.floor(n/10)] + (n%10 ? " Y " + unidades[n%10] : "");
  }
  function convMiles(n) {
    if (n < 1000) return convCentenas(n);
    if (n < 1000000) {
      const miles = Math.floor(n/1000), resto = n%1000;
      if (miles === 1) return ("MIL " + (resto ? convCentenas(resto) : "")).trim();
      return (convCentenas(miles) + " MIL " + (resto ? convCentenas(resto) : "")).trim();
    }
    const millones = Math.floor(n/1000000), resto = n%1000000;
    if (millones === 1) return ("UN MILLÓN " + (resto ? convMiles(resto) : "DE")).trim();
    return (convCentenas(millones) + " MILLONES " + (resto ? convMiles(resto) : "DE")).trim();
  }
  let t = convMiles(parseInt(numero || 0, 10));
  if (t.endsWith(" UNO")) t = t.slice(0, -4) + " UN";
  return t;
}

  // Autogrow del textarea de Obligaciones
(function autoGrowObligaciones(){
  const ta = document.getElementById('add-obligaciones');
  if (!ta) return;
  const resize = ()=>{
    ta.style.height = 'auto';
    ta.style.height = (ta.scrollHeight + 4) + 'px';
  };
  ['input','change'].forEach(ev => ta.addEventListener(ev, resize));
  // Primer ajuste si trae texto pegado
  resize();
})();

/* ================== ADICIÓN DE CONTRATO (CONTRATACIÓN) ================== */

let AD_STATE = {
  documento: '',
  nombre: '',
  contrato: '',
  telefono: '',
  fechaInicio: '',
  valorInicial: 0,
  fechaInicioFmt: '',
  valorInicialFmt: '',
  inicioA: '',
  finA: '',
  mesesA: '',
  diasA: '',
  adicion: '',
  mesesT: '',
  diasT: '',
  ejecucion: '',
  cdpA: '',
  mra: 0,
  textoAdicion: '',
  valorFin: 0,
  textoValor: ''
};

function numPureCOP(s){
  return Number(String(s||'').replace(/\D/g,'')) || 0;
}
function formatCOPViewLocal(n){
  const x = Number(String(n).replace(/\D/g,''))||0;
  return '$ ' + x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function pad2Local(n){ return String(n).padStart(2,'0'); }

/* Formato fecha dd/mm/yyyy garantizado */
function normDMY(str){
  const s = String(str||'').trim();
  if(!s) return '';
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const d = new Date(s.replace(' ', 'T'));
  if(!isNaN(d.getTime())){
    return pad2Local(d.getDate()) + '/' + pad2Local(d.getMonth()+1) + '/' + d.getFullYear();
  }
  return s;
}
function parseDMYToDate(dmy){
  const s = String(dmy||'').trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!m) return null;
  const dd = parseInt(m[1],10), mm = parseInt(m[2],10), yy = parseInt(m[3],10);
  const dt = new Date(yy, mm-1, dd);
  if(isNaN(dt.getTime())) return null;
  return dt;
}

/* Calcula meses y días entre dos fechas incluyendo el día final (misma lógica de indexref: diffDays +1) */
function calcMesesDiasEntre(dInicio, dFin){
  const a = parseDMYToDate(dInicio);
  const b = parseDMYToDate(dFin);
  if(!a || !b || b < a) return { meses:0, dias:0 };

  // Normaliza a medianoche local
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end   = new Date(b.getFullYear(), b.getMonth(), b.getDate());

  // Función días del mes
  function daysInMonth(y, m0){ return new Date(y, m0 + 1, 0).getDate(); }

  // Avanza meses completos desde start sin pasar end
  let meses = 0;
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  while(true){
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());

    // Si el día no existe en el mes siguiente (ej 31), ajusta al último día del mes
    if(next.getDate() !== cursor.getDate()){
      const dim = daysInMonth(next.getFullYear(), next.getMonth());
      next.setDate(dim);
    }

    if(next <= end){
      meses++;
      cursor = next;
    }else{
      break;
    }
  }

  // Días restantes (diferencia exacta sin +1)
  const msDay = 1000*60*60*24;
  const dias = Math.round((end - cursor) / msDay);

  return { meses, dias: Math.max(0, dias) };
}

function textoTiempo(meses, dias){
  const m = parseInt(meses||'0',10) || 0;
  const d = parseInt(dias||'0',10) || 0;

  let txt = '';
  if(m>0){
    txt += `${convertirNumeroATexto(m)} (${m}) ${m===1?'MES':'MESES'}`;
  }
  if(d>0){
    if(txt) txt += ' Y ';
    txt += `${convertirNumeroATexto(d)} (${d}) ${d===1?'DIA':'DIAS'}`;
  }
  return (txt||'').toUpperCase();
}

function bindNumericSanitizerLocal(id, maxLen){
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('input', ()=>{
    const raw = (el.value || '').replace(/\D/g,'');
    el.value = maxLen ? raw.slice(0,maxLen) : raw;
  });
}

/* Picker Adición (año fijo 2026) */
let __adPickerTarget = null;

(function initPickerAdicion(){
  const dSel = document.getElementById('adicionDia');
  const mSel = document.getElementById('adicionMes');
  if(!dSel || !mSel) return;

  if(!dSel.childElementCount){
    for(let d=1; d<=31; d++){
      const opt = document.createElement('option');
      opt.value = pad2Local(d);
      opt.textContent = opt.value;
      dSel.appendChild(opt);
    }
  }
  if(!mSel.childElementCount){
    const mesesNombres = [
      'Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
    ];
    for(let i=0;i<12;i++){
      const opt = document.createElement('option');
      opt.value = pad2Local(i+1);
      opt.textContent = mesesNombres[i];
      mSel.appendChild(opt);
    }
  }
})();

function abrirPickerAdicion(target){
  __adPickerTarget = target;
  const modal = document.getElementById('adicionModal');
  if(modal){
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden','false');
  }
}
function cancelarPickerAdicion(){
  const modal = document.getElementById('adicionModal');
  if(modal){
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden','true');
  }
}
function confirmarPickerAdicion(){
  const dia = document.getElementById('adicionDia')?.value || '';
  const mes = document.getElementById('adicionMes')?.value || '';
  if(!dia || !mes){
    Swal.fire({ icon:'info', title:'DEBES SELECCIONAR', text:'Corrobora tu selección', timer:1000, showConfirmButton:false });
    return;
  }

  const anio = '2026';
  const val = `${dia}/${mes}/${anio}`;
  const input = document.getElementById(__adPickerTarget);
  if(input) input.value = val;

  cancelarPickerAdicion();
  recomputeAdicionAll();
}

/* Formato COP mientras escribe en mra */
function formatCOPInstantLocal(el){
  if(!el) return;
  const raw = numPureCOP(el.value);
  if(!raw){ el.value = '$ '; return; }
  el.value = formatCOPViewLocal(raw);
}

function recomputeAdicionAll(){
  const fechaInicioContrato = normDMY(AD_STATE.fechaInicio || document.getElementById('fechaInicioRO')?.value || '');
  const inicioA = normDMY(document.getElementById('inicioA')?.value || '');
  const finA    = normDMY(document.getElementById('finA')?.value || '');

  const mesesNombres = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

// diaFa / mesFa desde finA (dd/mm/yyyy)
const diaFaEl = document.getElementById('diaFa');
const mesFaEl = document.getElementById('mesFa');
if(finA && /^\d{2}\/\d{2}\/\d{4}$/.test(finA)){
  const parts = finA.split('/');
  const dd = parts[0];
  const mm = parts[1];
  const idx = Math.max(1, Math.min(12, parseInt(mm,10))) - 1;
  if(diaFaEl) diaFaEl.value = dd;
  if(mesFaEl) mesFaEl.value = mesesNombres[idx] || '';
} else {
  if(diaFaEl) diaFaEl.value = '';
  if(mesFaEl) mesFaEl.value = '';
}

  if(fechaInicioContrato){
    document.getElementById('fechaInicioRO').value = fechaInicioContrato;
  }

   if(inicioA && finA){
    const { meses, dias } = calcMesesDiasEntre(inicioA, finA);

    const mesesEl = document.getElementById('mesesA');
    const diasEl  = document.getElementById('diasA');

    // Siempre recalcula ante cambio de fechas (pero permite editar luego)
    if(mesesEl){ mesesEl.value = String(meses); }
    if(diasEl){  diasEl.value  = String(dias);  }

    const mA = document.getElementById('mesesA')?.value || '0';
    const dA = document.getElementById('diasA')?.value  || '0';
    const txtA = textoTiempo(mA, dA);

    const adicionEl = document.getElementById('adicion');
    if(adicionEl) adicionEl.value = txtA;

    const textoAd = document.getElementById('textoAdicion');
    if(textoAd) textoAd.value = txtA;

    const { meses: mesesT, dias: diasT } = calcMesesDiasEntre(fechaInicioContrato, finA);

    const mesesTEl = document.getElementById('mesesT');
    const diasTEl  = document.getElementById('diasT');

    if(mesesTEl){ mesesTEl.value = String(mesesT); }
    if(diasTEl){  diasTEl.value  = String(diasT);  }

    const mT = document.getElementById('mesesT')?.value || '0';
    const dT = document.getElementById('diasT')?.value  || '0';
    const txtT = textoTiempo(mT, dT);

    const ejecEl = document.getElementById('ejecucion');
    if(ejecEl) ejecEl.value = txtT;
  }else{
    const adicionEl = document.getElementById('adicion');
    if(adicionEl) adicionEl.value = '';
    const ejecEl = document.getElementById('ejecucion');
    if(ejecEl) ejecEl.value = '';
  }

  const valorInicial = numPureCOP(AD_STATE.valorInicial || document.getElementById('valorInicioRO')?.value || '');
  const mraRaw = numPureCOP(document.getElementById('mra')?.value || '');
  const valorFin = valorInicial + mraRaw;

  const valorFinEl = document.getElementById('valorFin');
  if(valorFinEl) valorFinEl.value = formatCOPViewLocal(valorFin);

  const textoValorEl = document.getElementById('textoValor');
  if(textoValorEl){
    const texto = convertirNumeroATexto(valorFin);
    textoValorEl.value = (texto ? (texto + ' PESOS M/CTE') : '').toUpperCase();
  }
}

async function abrirVistaAdicion(documento){
  if(!documento) throw new Error('Documento inválido');

  const data = await apiGet('getAdicionData', { documento });

  if(!data || !data.found){
    throw new Error('Contratista no encontrado');
  }

  AD_STATE = {
    documento: String(data.documento||'').trim(),
    nombre: String(data.nombre||'').trim(),
    contrato: String(data.contrato||'').trim(),
    telefono: String(data.telefono||'').trim(),
    fechaInicio: normDMY(data.fechaInicio || ''),
    valorInicial: Number(String(data.valorInicial||'').replace(/\D/g,'')) || 0,
    inicioA: normDMY(data.inicioA || ''),
    finA: normDMY(data.finA || ''),
    mesesA: String(data.mesesA||''),
    diasA: String(data.diasA||''),
    adicion: String(data.adicion||''),
    mesesT: String(data.mesesT||''),
    diasT: String(data.diasT||''),
    ejecucion: String(data.ejecucion||''),
    cdpA: String(data.cdpA||''),
    mra: Number(String(data.mra||'').replace(/\D/g,'')) || 0,
    textoAdicion: String(data.textoAdicion||''),
    valorFin: Number(String(data.valorFin||'').replace(/\D/g,'')) || 0,
    textoValor: String(data.textoValor||'')
  };

  document.getElementById('fechaInicioRO').value = AD_STATE.fechaInicio;
  document.getElementById('valorInicioRO').value = formatCOPViewLocal(AD_STATE.valorInicial);

  document.getElementById('inicioA').value = AD_STATE.inicioA || '';
  document.getElementById('finA').value    = AD_STATE.finA || '';

  const mesesAEl = document.getElementById('mesesA');
  const diasAEl  = document.getElementById('diasA');
  const mesesTEl = document.getElementById('mesesT');
  const diasTEl  = document.getElementById('diasT');

  if(mesesAEl){ mesesAEl.value = AD_STATE.mesesA || ''; mesesAEl.dataset.auto='1'; }
  if(diasAEl){  diasAEl.value  = AD_STATE.diasA  || ''; diasAEl.dataset.auto='1'; }
  if(mesesTEl){ mesesTEl.value = AD_STATE.mesesT || ''; mesesTEl.dataset.auto='1'; }
  if(diasTEl){  diasTEl.value  = AD_STATE.diasT  || ''; diasTEl.dataset.auto='1'; }

  const adicionEl = document.getElementById('adicion');
  if(adicionEl) adicionEl.value = (AD_STATE.textoAdicion || AD_STATE.adicion || '').toUpperCase();

  const ejecEl = document.getElementById('ejecucion');
  if(ejecEl) ejecEl.value = (AD_STATE.ejecucion || '').toUpperCase();

  const cdpEl = document.getElementById('cdpA');
  if(cdpEl){
    cdpEl.value = String(AD_STATE.cdpA || '').replace(/\D/g,'').slice(0,10);
    cdpEl.style.border = '';
    if(cdpEl.value.length === 10 && cdpEl.value.startsWith('2026')){
      cdpEl.style.border = '2px solid green';
    }
  }

 const mraEl = document.getElementById('mra');
  if(mraEl){
    if(AD_STATE.mra > 0){
      mraEl.value = formatCOPViewLocal(AD_STATE.mra);
    }else{
      mraEl.value = '$ ';
    }
  }

  const textoAdEl = document.getElementById('textoAdicion');
  if(textoAdEl) textoAdEl.value = (AD_STATE.textoAdicion || '').toUpperCase();

  const textoValEl = document.getElementById('textoValor');
  if(textoValEl) textoValEl.value = (AD_STATE.textoValor || '').toUpperCase();

  const valorFinEl = document.getElementById('valorFin');
  if(valorFinEl){
    const fin = AD_STATE.valorFin || (AD_STATE.valorInicial + (AD_STATE.mra||0));
    valorFinEl.value = formatCOPViewLocal(fin);
  }

  showView('view-adicion');
}

/* Eventos UI Adición */
(function bindAdicionHandlers(){
  const back = document.getElementById('ad-volver');
  if(back && !back.dataset.bound){
    back.dataset.bound = '1';
    back.addEventListener('click', ()=>{
      playSoundOnce(SOUNDS.back);
      showView('view-inicio');
    });
  }

  bindNumericSanitizerLocal('cdpA', 10);

  const cdp = document.getElementById('cdpA');
  if(cdp && !cdp.dataset.bound){
    cdp.dataset.bound='1';
    cdp.addEventListener('input', ()=>{
      const raw = (cdp.value||'').replace(/\D/g,'').slice(0,10);
      cdp.value = raw;
      cdp.style.border = '';
      if(raw.length === 10 && raw.startsWith('2026')){
        cdp.style.border = '2px solid green';
      }
    });
  }

  const mra = document.getElementById('mra');
  if(mra && !mra.dataset.bound){
    mra.dataset.bound='1';
    if(!mra.value) mra.value = '$ ';
    mra.addEventListener('input', ()=>{
      formatCOPInstantLocal(mra);
      recomputeAdicionAll();
    });
    mra.addEventListener('blur', ()=>{
      formatCOPInstantLocal(mra);
      recomputeAdicionAll();
    });
  }

  ['mesesA','diasA','mesesT','diasT'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el || el.dataset.bound) return;
    el.dataset.bound='1';

    // Permitir borrar y escribir libre (solo números) sin forzar auto
    el.addEventListener('input', ()=>{
      const raw = (el.value||'').replace(/\D/g,'').slice(0,3);
      el.value = raw; // puede quedar '' mientras edita
      recomputeAdicionAll();
    });

    // Si queda vacío al salir, lo deja en 0 (así nunca queda vacío para guardar)
    el.addEventListener('blur', ()=>{
      if(String(el.value||'').trim() === ''){
        el.value = '0';
        recomputeAdicionAll();
      }
    });
  });

  ['inicioA','finA'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el || el.dataset.bound) return;
    el.dataset.bound='1';

    // Si el valor cambia por cualquier vía (picker o asignación), recalcula
    el.addEventListener('input', ()=> recomputeAdicionAll());
    el.addEventListener('change', ()=> recomputeAdicionAll());
    el.addEventListener('blur', ()=> recomputeAdicionAll());
  });

  const saveBtn = document.getElementById('ad-guardar');
  if(saveBtn && !saveBtn.dataset.bound){
    saveBtn.dataset.bound='1';
    saveBtn.addEventListener('click', async ()=>{
      try{
        const fechaInicioContrato = normDMY(document.getElementById('fechaInicioRO')?.value || '');
        const inicioA = normDMY(document.getElementById('inicioA')?.value || '');
        const finA    = normDMY(document.getElementById('finA')?.value || '');
        const cdpA    = String(document.getElementById('cdpA')?.value || '').replace(/\D/g,'').slice(0,10);
        const mraVal  = numPureCOP(document.getElementById('mra')?.value || '');

        if(!fechaInicioContrato){
          Swal.fire({ icon:'warning', title:'Falta Fecha de Inicio' });
          return;
        }
        if(!inicioA || !/^\d{2}\/\d{2}\/\d{4}$/.test(inicioA)){
          Swal.fire({ icon:'warning', title:'Fecha Inicio de Adición inválida' });
          return;
        }
        if(!finA || !/^\d{2}\/\d{2}\/\d{4}$/.test(finA)){
          Swal.fire({ icon:'warning', title:'Fecha Fin de Adición inválida' });
          return;
        }

        const dIni = parseDMYToDate(inicioA);
        const dFin = parseDMYToDate(finA);
        if(!dIni || !dFin || dFin < dIni){
          Swal.fire({ icon:'warning', title:'Rango de fechas inválido', text:'La fecha fin debe ser mayor o igual a la fecha inicio.' });
          return;
        }

        if(!(cdpA.length === 10 && cdpA.startsWith('2026'))){
          Swal.fire({ icon:'warning', title:'CDP Adición inválido', text:'Debe tener 10 dígitos e iniciar por 2026.' });
          return;
        }

        if(!mraVal || mraVal <= 0){
          Swal.fire({ icon:'warning', title:'Valor de la Adición requerido' });
          return;
        }

        recomputeAdicionAll();

        const mesesA = String(document.getElementById('mesesA')?.value || '').trim();
        const diasA  = String(document.getElementById('diasA')?.value  || '').trim();
        const mesesT = String(document.getElementById('mesesT')?.value || '').trim();
        const diasT  = String(document.getElementById('diasT')?.value  || '').trim();

        if(mesesA === '' || diasA === '' || mesesT === '' || diasT === ''){
          Swal.fire({
            icon:'warning',
            title:'Campos de tiempo incompletos',
            text:'Meses y días no pueden quedar vacíos. Si no aplica, escribe 0.'
          });
          return;
        }

        const adicionTxt  = String(document.getElementById('adicion')?.value || '').trim().toUpperCase();
        const ejecTxt     = String(document.getElementById('ejecucion')?.value || '').trim().toUpperCase();
        const textoAdicion= String(document.getElementById('textoAdicion')?.value || '').trim().toUpperCase();
        const textoValor  = String(document.getElementById('textoValor')?.value || '').trim().toUpperCase();

        const valorInicial = numPureCOP(AD_STATE.valorInicial);
        const valorFin     = valorInicial + mraVal;

        const resumen = [
          `<b>Inicio contrato:</b> ${fechaInicioContrato}`,
          `<b>Inicio adición:</b> ${inicioA}`,
          `<b>Fin adición:</b> ${finA}`,
          `<b>Tiempo adición:</b> ${adicionTxt || '-'}`,
          `<b>CDP Adición:</b> ${cdpA}`,
          `<b>Valor contrato:</b> ${formatCOPViewLocal(valorInicial)}`,
          `<b>Valor adición:</b> ${formatCOPViewLocal(mraVal)}`,
          `<b>Valor final:</b> ${formatCOPViewLocal(valorFin)}`
        ].join('<br>');

        const rs = await Swal.fire({
          icon:'info',
          title:'Resumen de Adición',
          html: resumen,
          showCancelButton:true,
          confirmButtonText:'Confirmar',
          cancelButtonText:'Editar'
        });
        if(!rs.isConfirmed) return;

        const payload = {
          documento: AD_STATE.documento,
          inicioA,
          finA,
          diaFa: String(document.getElementById('diaFa')?.value || '').trim(),
          mesFa: String(document.getElementById('mesFa')?.value || '').trim(),
          mesesA,
          diasA,
          adicion: adicionTxt,
          mesesT,
          diasT,
          ejecucion: ejecTxt,
          cdpA,
          mra: String(mraVal),
          textoAdicion: textoAdicion || adicionTxt,
          valorFin: String(valorFin),
          textoValor
        };

        await apiPost('guardarAdicion', payload);

        const tel = normalizeContratistaNumber(AD_STATE.telefono);
        if(tel){
          const msg =
            'Estimado(a) *'+(AD_STATE.nombre||'')+'*\n\n' +
            '¡Se ha generado la *Adición del Contrato N° '+(AD_STATE.contrato||'')+'*!\n' +
            '- En la *App Contratista*, toma la opción *DATOS DEL CONTRATO* - Actualizar. Registra solo el RP de Adición Correctamente una vez lo tengas.\n\n' +
            'Para la *Primera cuenta en esta Adición* debes Anexar el CDP y RP de Adición.\n' +
            '> Si no tienes esta guía, revisa los TUTORIALES en la App.\n\n' +
            'Cordialmente,\n\n*Equipo de Contratación*\n> Alcaldía de Flandes';
          sendBuilderbotMessage(tel, msg);
        }

        await Swal.fire({ icon:'success', title:'Adición guardada', timer:1800, showConfirmButton:false });
        const mraInput = document.getElementById('mra');
        if(mraInput) mraInput.value = '$ ';

        await cargarContratistas();
        showView('view-contratistas');
      }catch(e){
        Swal.fire({ icon:'error', title:'Error', text:String(e.message||e) });
      }
    });
  }
})();

  /* ================== OTROSÍ (EDICIÓN) ================== */

/* ── Inicializar selects del picker de fecha propio ── */
(function initOtPickerFecha() {
  const dias  = document.getElementById('otPickerDia');
  const meses = document.getElementById('otPickerMes');
  if (!dias || !meses) return;

  for (let d = 1; d <= 31; d++) {
    const opt = document.createElement('option');
    opt.value = String(d).padStart(2, '0');
    opt.textContent = opt.value;
    dias.appendChild(opt);
  }
  const mesesNombres = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];
  for (let i = 0; i < 12; i++) {
    const opt = document.createElement('option');
    opt.value = String(i + 1).padStart(2, '0');
    opt.textContent = mesesNombres[i];
    meses.appendChild(opt);
  }
})();

function abrirPickerOtFecha() {
  const modal = document.getElementById('otFechaModal');
  if (modal) { modal.style.display = 'flex'; modal.setAttribute('aria-hidden','false'); }
}
function cancelarPickerOtFecha() {
  const modal = document.getElementById('otFechaModal');
  if (modal) { modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); }
}
function confirmarPickerOtFecha() {
  const dSel = document.getElementById('otPickerDia')?.value || '01';
  const mSel = document.getElementById('otPickerMes')?.value || '01';
  const anio = '2026';
  const mesesNombres = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];
  const idx = Math.max(1, Math.min(12, parseInt(mSel, 10))) - 1;

  const fc = document.getElementById('ot-fechaContrato'); if (fc) fc.value = `${dSel}/${mSel}/${anio}`;
  const d  = document.getElementById('ot-diaContrato');   if (d)  d.value  = dSel;
  const m  = document.getElementById('ot-mesContrato');   if (m)  m.value  = mesesNombres[idx];
  cancelarPickerOtFecha();
}

/* ── Secretaría → CarpetaSecretaria ── */
document.getElementById('ot-secretaria').addEventListener('change', () => {
  document.getElementById('ot-carpetaSecretaria').value =
    MAP_SECRETARIA_CARPETA[document.getElementById('ot-secretaria').value] || '';
});

/* ── Supervisor → Contacto ── */
document.getElementById('ot-supervisor').addEventListener('change', () => {
  document.getElementById('ot-contactoSupervisor').value =
    MAP_SUPERVISOR_CONTACTO[document.getElementById('ot-supervisor').value] || '';
});

/* ── Valor → ValorTexto (idéntico al add) ── */
(function initOtValorTexto() {
  const valor      = document.getElementById('ot-valor');
  const valorTexto = document.getElementById('ot-valorTexto');
  if (!valor || !valorTexto) return;
  valor.addEventListener('input', () => {
    const raw = (valor.value || '').replace(/\D/g, '');
    valor.value = raw;
    const len = raw.length;
    valorTexto.style.border = '';
    if ((len >= 1 && len <= 5) || len > 8) valorTexto.style.border = '2px solid red';
    else if (len === 8)                     valorTexto.style.border = '2px solid green';
    const n     = parseInt(raw || '0', 10);
    const texto = convertirNumeroATexto(n);
    valorTexto.value = texto ? (texto + ' PESOS M/CTE').toUpperCase() : '';
  });
})();

/* ── CDP → borde verde si 10 dígitos y empieza por 2026 ── */
(function initOtCDP() {
  const cdp = document.getElementById('ot-cdp');
  if (!cdp) return;
  cdp.addEventListener('input', () => {
    const raw = (cdp.value || '').replace(/\D/g, '').slice(0, 10);
    cdp.value = raw;
    cdp.style.border = '';
    if (raw.length === 10 && raw.startsWith('2026')) cdp.style.border = '2px solid green';
  });
})();

/* ── Autogrow + contador + preview de obligaciones ── */
(function initOtObligacionesUI() {
  const ta    = document.getElementById('ot-obligaciones');
  const count = document.getElementById('ot-obligaciones-count');
  const prev  = document.getElementById('ot-obligaciones-preview');
  if (!ta) return;

  function parsearLineas(texto) {
    return String(texto || '')
      .split(/\r?\n+/)
      .map(l => l.replace(/\s+/g, ' ').trim())
      .map(l => l.replace(/^\s*(?:[1-9]|1\d|2[0-6])\s*(?:[.)]|:|[-–—])\s*/, '').trim())
      .filter(l => l.length > 0);
  }

  function actualizar() {
    // autogrow
    ta.style.height = 'auto';
    ta.style.height = (ta.scrollHeight + 4) + 'px';

    const lineas = parsearLineas(ta.value);
    const n = lineas.length;

    if (count) {
      count.textContent = n === 1
        ? '1 obligación detectada'
        : n + ' obligaciones detectadas';
      count.style.color = (n > 26) ? '#b91c1c' : (n > 0 ? '#06402B' : '#555');
    }

    if (prev) {
      prev.innerHTML = '';
      lineas.slice(0, 26).forEach((t, i) => {
        const div = document.createElement('div');
        div.className = 'ot-oblig-line';
        div.setAttribute('data-num', String(i + 1));
        div.textContent = t;
        prev.appendChild(div);
      });
      if (n > 26) {
        const aviso = document.createElement('div');
        aviso.className = 'ot-oblig-line';
        aviso.setAttribute('data-num', '!');
        aviso.style.color = '#b91c1c';
        aviso.style.fontWeight = '800';
        aviso.textContent = 'Solo se guardarán las primeras 26 obligaciones.';
        prev.appendChild(aviso);
      }
    }
  }

  ['input','change','keyup','paste'].forEach(ev => ta.addEventListener(ev, () => {
    // en paste el valor aún no está listo, difiere un tick
    setTimeout(actualizar, 0);
  }));

  actualizar();
})();

/* ── Botón OTROSÍ (EDICIÓN) en view-detalles ── */
document.getElementById('btn-detalles-otrosi').addEventListener('click', () => {
  playSoundOnce(SOUNDS.login);
  if (!_detallesDocActual) {
    Swal.fire({ icon:'warning', title:'Sin contratista seleccionado' });
    return;
  }
  abrirOtrosiEdicion(_detallesDocActual);
});

/* ── Abrir vista OTROSÍ y prellenar campos ── */
async function abrirOtrosiEdicion(documento) {
  try {
    const data = await apiGet('getEditarContratistaData', { documento });
    if (!data) { Swal.fire({ icon:'info', title:'No encontrado' }); return; }

    const otDocEl = document.getElementById('ot-documento');
    otDocEl.value = data.documento || '';
    otDocEl.dataset.original = String(data.documento || '').trim(); // guarda el documento ORIGINAL
    document.getElementById('ot-nombre').value    = data.nombre    || '';

    /* Secretaría */
    const secEl = document.getElementById('ot-secretaria');
    secEl.value = data.secretaria || '';
    document.getElementById('ot-carpetaSecretaria').value = data.carpetaSecretaria || '';

    /* Supervisor */
    const supEl = document.getElementById('ot-supervisor');
    supEl.value = data.supervisor || '';
    document.getElementById('ot-contactoSupervisor').value = data.contacto || '';

    /* Contrato */
    document.getElementById('ot-contrato').value = String(data.contrato || '').replace(/^'/,'');

    /* Tipo contrato */
    document.getElementById('ot-tipoContrato').value = data.tipoContrato || '';

    /* Fecha contrato + sync picker */
    document.getElementById('ot-fechaContrato').value = data.fechaContrato || '';
    if (data.fechaContrato && /^\d{2}\/\d{2}\/\d{4}$/.test(data.fechaContrato)) {
      const pts = data.fechaContrato.split('/');
      const pd  = document.getElementById('otPickerDia');
      const pm  = document.getElementById('otPickerMes');
      if (pd) pd.value = pts[0];
      if (pm) pm.value = pts[1];
    }
    document.getElementById('ot-diaContrato').value = data.diaContrato || '';
    document.getElementById('ot-mesContrato').value = data.mesContrato || '';

    /* Valor */
    const valorEl      = document.getElementById('ot-valor');
    const valorTextoEl = document.getElementById('ot-valorTexto');
    const valorNum = Number(String(data.valor || '').replace(/\D/g,'')) || 0;
    valorEl.value      = valorNum ? String(valorNum) : '';
    valorEl.style.border = '';
    valorTextoEl.value = data.valorTexto ||
      (valorNum ? (convertirNumeroATexto(valorNum) + ' PESOS M/CTE').toUpperCase() : '');

    /* CDP */
    const cdpEl = document.getElementById('ot-cdp');
    cdpEl.value = String(data.cdp || '').replace(/\D/g,'').slice(0, 10);
    cdpEl.style.border = '';
    if (cdpEl.value.length === 10 && cdpEl.value.startsWith('2026'))
      cdpEl.style.border = '2px solid green';

    /* Objeto */
    document.getElementById('ot-objeto').value = data.objeto || '';

    /* Obligaciones */
    const oblEl  = document.getElementById('ot-obligaciones');
    const oblArr = Array.isArray(data.obligaciones) ? data.obligaciones : [];
    oblEl.value  = oblArr.filter(v => v).join('\n');
    oblEl.style.height = 'auto';
    oblEl.style.height = (oblEl.scrollHeight + 4) + 'px';
    // dispara el recálculo de contador + preview al cargar los datos
    oblEl.dispatchEvent(new Event('input'));

    showView('view-otrosi');
  } catch (e) {
    Swal.fire({ icon:'error', title:'Error cargando datos', text:e.message });
  }
}

/* ── Regresar ── */
document.getElementById('btn-ot-volver').addEventListener('click', () => {
  playSoundOnce(SOUNDS.back);
  showView('view-detalles');
});

/* ── Guardar (OTROSÍ) ── */
document.getElementById('btn-ot-guardar').addEventListener('click', async () => {
  const otDocEl           = document.getElementById('ot-documento');
  const documentoOriginal = String(otDocEl.dataset.original || '').trim();
  const documento         = (otDocEl.value || '').trim();
  const nombre            = (document.getElementById('ot-nombre').value            || '').trim();
  const secretaria        = (document.getElementById('ot-secretaria').value        || '').trim();
  const carpetaSecretaria = (document.getElementById('ot-carpetaSecretaria').value || '').trim();
  const supervisor        = (document.getElementById('ot-supervisor').value        || '').trim();
  const contacto          = (document.getElementById('ot-contactoSupervisor').value|| '').trim();
  const contratoRaw       = (document.getElementById('ot-contrato').value          || '').trim();
  const tipoContrato      = (document.getElementById('ot-tipoContrato').value      || '').trim();
  const fechaContrato     = (document.getElementById('ot-fechaContrato').value     || '').trim();
  const diaContrato       = (document.getElementById('ot-diaContrato').value       || '').trim();
  const mesContrato       = (document.getElementById('ot-mesContrato').value       || '').trim();
  const valorRaw          = (document.getElementById('ot-valor').value             || '').trim();
  const valorTexto        = (document.getElementById('ot-valorTexto').value        || '').trim();
  const cdp               = (document.getElementById('ot-cdp').value               || '').trim();
  const objetoRaw         = (document.getElementById('ot-objeto').value            || '').trim();
  const obligacionesRaw   = (document.getElementById('ot-obligaciones').value      || '').trim();

 /* ── Validaciones (idénticas al add) ── */
  if (!documentoOriginal) {
    Swal.fire({ icon:'warning', title:'No se pudo leer el documento original' }); return;
  }
  if (!/^\d{6,10}$/.test(documento)) {
    Swal.fire({ icon:'warning', title:'Documento inválido', text:'Debe tener entre 6 y 10 dígitos, sin puntos ni espacios.' }); return;
  }
  if (!nombre) {
    Swal.fire({ icon:'warning', title:'Nombre requerido' }); return;
  }
  if (nombre.split(/\s+/).filter(Boolean).length < 2) {
    Swal.fire({ icon:'warning', title:'Nombre incompleto', text:'Ingresa mínimo nombre y apellido' }); return;
  }
  if (!secretaria || !carpetaSecretaria) {
    Swal.fire({ icon:'warning', title:'Secretaría requerida' }); return;
  }
  if (!supervisor || !contacto) {
    Swal.fire({ icon:'warning', title:'Supervisor requerido' }); return;
  }
  if (!contratoRaw) {
    Swal.fire({ icon:'warning', title:'Contrato requerido' }); return;
  }
  if (!tipoContrato) {
    Swal.fire({ icon:'warning', title:'Tipo de contrato requerido' }); return;
  }
  if (!fechaContrato || !/^\d{2}\/\d{2}\/\d{4}$/.test(fechaContrato)) {
    Swal.fire({ icon:'warning', title:'Fecha de contrato inválida', text:'Usa el picker' }); return;
  }
  if (!diaContrato || !/^\d{2}$/.test(diaContrato)) {
    Swal.fire({ icon:'warning', title:'Día de contrato inválido' }); return;
  }
  if (!mesContrato) {
    Swal.fire({ icon:'warning', title:'Mes de contrato requerido' }); return;
  }
  if (!/^\d{1,8}$/.test(valorRaw.replace(/\D/g,''))) {
    Swal.fire({ icon:'warning', title:'Valor inválido' }); return;
  }
  if (!valorTexto) {
    Swal.fire({ icon:'warning', title:'Valor en texto faltante' }); return;
  }
  if (!/^\d{10}$/.test(cdp.replace(/\D/g,''))) {
    Swal.fire({ icon:'warning', title:'CDP inválido' }); return;
  }
  if (!objetoRaw) {
    Swal.fire({ icon:'warning', title:'Objeto del contrato requerido' }); return;
  }
  if (!obligacionesRaw) {
    Swal.fire({ icon:'warning', title:'Obligaciones requeridas' }); return;
  }

  /* ── Normalizaciones ── */
  let numeroContrato = contratoRaw.replace(/\D/g,'');
  numeroContrato = ('000' + numeroContrato).slice(-3);

  let dia2 = diaContrato.replace(/\D/g,'');
  dia2 = ('00' + dia2).slice(-2);

  const valorNum = Number(valorRaw.replace(/\D/g,'')) || 0;

 /* ── Parseo de obligaciones en OTROSÍ: una por línea ── */
  const obligaciones = (() => {
    const text = String(obligacionesRaw || '').trim();
    if (!text) return [];

    // Cada salto de línea = una obligación distinta
    // Dentro de cada línea se colapsan espacios y se limpia
    // Se remueve cualquier marcador residual tipo "1.", "2)", "3-", "10:" al inicio
    const parts = text
      .split(/\r?\n+/)
      .map(line => line.replace(/\s+/g, ' ').trim())
      .map(line => line.replace(/^\s*(?:[1-9]|1\d|2[0-6])\s*(?:[.)]|:|[-–—])\s*/, '').trim())
      .filter(line => line.length > 0);

    return parts.slice(0, 26);
  })();
  
  if (obligaciones.length === 0) {
    Swal.fire({ icon:'warning', title:'Debes ingresar al menos una obligación' }); return;
  }

  /* ── Enviar al backend ── */
  try {
    await apiPost('editarContratista', {
      documentoOriginal,
      documento,
      nombre:           nombre.toUpperCase(),
      secretaria,
      carpetaSecretaria,
      supervisor,
      contacto,
      contrato:         numeroContrato,
      tipoContrato,
      fechaContrato,
      diaContrato:      dia2,
      mesContrato,
      valor:            String(valorNum),
      valorTexto:       valorTexto.toUpperCase(),
      cdp:              cdp.replace(/\D/g,''),
      objeto:           objetoRaw,
      obligaciones
    });

    Swal.fire({ icon:'success', title:'Contratista Actualizado', timer:2800, showConfirmButton:false });
    await cargarContratistas();
    // Recarga la vista de detalles con los datos actualizados
    await mostrarDetallesContratista(documento);
  } catch (e) {
    var msg = String((e && e.message) || e || '');
    if (msg.indexOf('CUENTAS_PENDIENTES') !== -1) {
      Swal.fire({
        icon: 'warning',
        title: 'NO SE PUEDE PROCESAR',
        text: 'El Contratista a reemplazar tiene cuenta(s) pendiente(s) por pagar.'
      });
    } else {
      Swal.fire({ icon:'error', title:'Error al guardar', text: e.message });
    }
  }
});

/* ================== AUTO-ACTUALIZACIÓN (version.json) ================== */
let __APP_VERSION_LOADED = '';
let __versionCheckInFlight = false;

async function checkAppVersion(){
  if(__versionCheckInFlight) return;
  __versionCheckInFlight = true;
  try{
    const url = 'version.json?t=' + Date.now();
    const r = await fetch(url, { cache: 'no-store' });
    if(!r.ok) return;
    const j = await r.json();
    const serverVersion = String(j.version || '').trim();
    if(!serverVersion) return;

    // Primera lectura: guardar la versión actual y pintarla en login
    if(!__APP_VERSION_LOADED){
      __APP_VERSION_LOADED = serverVersion;
      const el = document.getElementById('app-version');
      if(el) el.textContent = 'Versión ' + serverVersion;
      return;
    }

    // Lecturas posteriores: si cambió, recargar silenciosamente
    if(serverVersion !== __APP_VERSION_LOADED){
      try{
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }catch(_){}
      location.reload();
    }
  }catch(_){
    /* silencio: sin red no hay actualización */
  }finally{
    __versionCheckInFlight = false;
  }
}

// Recarga automática cuando el SW nuevo toma control (solo una vez por sesión de página)
if('serviceWorker' in navigator){
  let __reloadingFromSW = false;
  navigator.serviceWorker.addEventListener('controllerchange', ()=>{
    if(__reloadingFromSW) return;
    // Evitar loop: solo recargar si NO veníamos de una recarga reciente
    const lastReload = Number(sessionStorage.getItem('__swReloadTs') || 0);
    const now = Date.now();
    if(now - lastReload < 10000) return; // si recargamos hace menos de 10s, no recargar otra vez
    __reloadingFromSW = true;
    sessionStorage.setItem('__swReloadTs', String(now));
    location.reload();
  });
}

// Chequeo al cargar la página
window.addEventListener('load', ()=>{ checkAppVersion(); });

// Chequeo cada vez que la pestaña/PWA vuelve a estar visible (máx 1 vez cada 30s)
let __lastVersionCheck = Date.now();
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden) return;
  const now = Date.now();
  if(now - __lastVersionCheck < 30000) return;
  __lastVersionCheck = now;
  checkAppVersion();
});
