(() => {
 const $=(selector,root=document)=>root.querySelector(selector);
 const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>`Rs. ${Number(v||0).toLocaleString('en-PK',{maximumFractionDigits:2})}`;
 const prettyDate=v=>v?new Date(String(v).replace(' ','T')).toLocaleString('en-PK',{dateStyle:'medium',timeStyle:'short'}):'—';
 const dateOnly=v=>v?new Date(String(v).replace(' ','T')).toLocaleDateString('en-PK',{dateStyle:'medium'}):'—';
 const badge=s=>`<span class="badge ${esc(s)}">${esc(String(s||'').replaceAll('_',' '))}</span>`;
 const loading=()=>'<div class="loader">Loading latest information...</div>';
 const empty=(title='Nothing here yet',description='Your records will appear here when available.')=>`<div class="empty"><i class="fa-regular fa-folder-open"></i><strong>${esc(title)}</strong><p>${esc(description)}</p></div>`;
 async function api(path,options={}){
  const opts={credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}};
  let response;try{response=await fetch('/api'+path,opts);}catch{throw Error('Unable to reach the server. Check your connection.');}
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||`Request failed (${response.status})`);
  return data;
 }
 function toast(message,type='success'){
  $('.toast-box')?.remove();const el=document.createElement('div');el.className='toast-box notice'+(type==='error'?' error':'');el.setAttribute('role','status');el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),5000);
 }
 const value=(id)=>document.getElementById(id)?.value;
 async function confirmAction(message,callback){if(window.confirm(message))try{await callback();}catch(e){toast(e.message,'error');}}
 const nav=[['/index.html','Home'],['/about.html','About Us'],['/routes.html','Routes'],['/contact.html','Contact']];
 const menu={
  admin:[['dashboard','Dashboard','fa-table-columns'],['buses','Manage buses','fa-bus'],['routes','Routes','fa-route'],['stops','Bus stops','fa-location-dot'],['schedules','Schedules','fa-calendar-days'],['drivers','Drivers','fa-id-card'],['bookings','Bookings','fa-ticket'],['users','Users','fa-users'],['complaints','Feedback & complaints','fa-comments'],['reports','Reports','fa-chart-column']],
  passenger:[['dashboard','Overview','fa-table-columns'],['bookings','My bookings','fa-ticket'],['feedback','Feedback & complaints','fa-comment-dots'],['profile','My profile','fa-user-gear']],
  driver:[['dashboard','Overview','fa-table-columns'],['trips','Assigned trips','fa-bus'],['verify-ticket','Verify ticket','fa-qrcode']]
 };
 const roleLink=role=>`/${role}/dashboard.html`;
 function header(user){
  const path=location.pathname;
  return `<header class="site-header"><div class="container"><a class="brand" href="/index.html"><span class="brand-mark"><i class="fa-solid fa-bus-simple"></i></span>City<strong>Safar</strong></a><button class="mobile-menu" aria-label="Open navigation" id="mobile-menu"><i class="fa-solid fa-bars"></i></button><nav class="nav-links" id="nav-links">${nav.map(([href,name])=>`<a href="${href}" class="${path===href?'active':''}">${name}</a>`).join('')}<a href="/search-buses.html" class="${path.includes('search')?'active':''}">Find a bus</a>${user?`<a href="${roleLink(user.role)}">My dashboard</a>`:''}</nav><div class="nav-actions">${user?`<button class="btn btn-outline btn-sm" id="logout">Sign out</button>`:`<a class="btn btn-outline btn-sm" href="/login.html">Sign in</a><a class="btn btn-sm" href="/register.html">Get started</a>`}</div></div></header>`;
 }
 function footer(){return `<footer class="footer"><div class="container"><div class="footer-grid"><div><a class="brand text-white" href="/index.html"><span class="brand-mark"><i class="fa-solid fa-bus-simple"></i></span>City<strong>Safar</strong></a><p class="mt-2 small">A smoother way to explore Pakistan. Find a route, reserve your seat and travel with confidence.</p></div><div><h4>Explore</h4><div class="footer-links"><a href="/about.html">About us</a><a href="/routes.html">Bus routes</a><a href="/search-buses.html">Search trips</a></div></div><div><h4>Account</h4><div class="footer-links"><a href="/login.html">Sign in</a><a href="/register.html">Create account</a><a href="/contact.html">Get in touch</a></div></div><div><h4>Built for better journeys</h4><p class="small">Online reservations, real-time seat availability, QR tickets and organized transport operations.</p></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} City Safar. Semester project.</span><span>Made for simpler travel across Pakistan</span></div></div></footer>`;}
 function dashboardLayout(user){
  const group=menu[user.role]||[],page=location.pathname.split('/').pop().replace('.html','');
  return `<div class="dashboard-layout"><aside class="sidebar"><a class="brand" href="/index.html"><span class="brand-mark"><i class="fa-solid fa-bus-simple"></i></span>City<strong>Safar</strong></a><div><div class="sidebar-label">${esc(user.role)} workspace</div><nav class="side-links">${group.map(([file,name,icon])=>`<a href="/${user.role}/${file}.html" class="${file===page?'active':''}"><i class="fa-solid ${icon}"></i>${name}</a>`).join('')}</nav><div class="sidebar-label">Quick links</div><nav class="side-links"><a href="/search-buses.html"><i class="fa-solid fa-magnifying-glass"></i>Search trips</a><a href="/index.html"><i class="fa-solid fa-house"></i>Public website</a></nav></div><div class="sidebar-bottom"><div>${esc(user.name)}</div><div style="opacity:.6">${esc(user.email)}</div><button class="btn btn-outline btn-sm mt-1" id="logout" style="color:white;border-color:#56727a">Sign out</button></div></aside><div class="dashboard-main"><header class="dashboard-topbar"><div><h3>${esc(user.role[0].toUpperCase()+user.role.slice(1))} workspace</h3><div class="small">Manage your journey with confidence</div></div><div class="d-flex"><span class="pill">${esc(user.role)}</span><span class="small">${esc(user.name)}</span></div></header><div class="dashboard-content"><div id="app"></div></div></div></div>`;
 }
 function pageHero(title,desc){return `<div class="page-hero"><div class="container"><div class="eyebrow" style="color:#e6b66f">City Safar</div><h1>${esc(title)}</h1><p>${esc(desc)}</p></div></div>`;}
 function heading(title,desc,action=''){return `<div class="page-heading"><div><h1>${esc(title)}</h1><p>${esc(desc)}</p></div>${action}</div>`;}
 async function session(){try{return await api('/auth/me');}catch{return null;}}
 async function mount(){
  const body=document.body,layout=body.dataset.layout||'public',requireRole=body.dataset.role;
  const user=await session();window.CS.user=user;
  if(requireRole&&user?.role!==requireRole){location.replace(user?roleLink(user.role):'/login.html?next='+encodeURIComponent(location.pathname+location.search));return false;}
  if(layout==='dashboard'){body.innerHTML=dashboardLayout(user);}else{$('#header').innerHTML=header(user);$('#footer').innerHTML=footer();}
  $('#mobile-menu')?.addEventListener('click',()=>$('#nav-links').classList.toggle('open'));
  $('#logout')?.addEventListener('click',async()=>{try{await api('/auth/logout',{method:'POST'});location.href='/index.html';}catch(e){toast(e.message,'error');}});
  return true;
 }
 function bindForm(form,handler){form.addEventListener('submit',async e=>{e.preventDefault();const btn=form.querySelector('button[type=submit]');if(btn){btn.disabled=true;btn.dataset.original=btn.innerHTML;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Please wait';}try{await handler(Object.fromEntries(new FormData(form)));}catch(err){toast(err.message,'error');}finally{if(btn){btn.disabled=false;btn.innerHTML=btn.dataset.original;}}});}
 function modal(title,content,onsubmit){
  $('.modal-backdrop-custom')?.remove();const overlay=document.createElement('div');overlay.className='modal-backdrop-custom';overlay.innerHTML=`<div class="modal-custom" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header-custom"><h2>${esc(title)}</h2><button type="button" class="icon-close" id="close-modal" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div><form id="dialog-form">${content}<div class="form-actions"><button type="button" id="cancel-modal" class="btn btn-outline">Cancel</button><button type="submit" class="btn"><i class="fa-solid fa-check"></i> Save changes</button></div></form></div>`;
  document.body.appendChild(overlay);$('#close-modal',overlay).onclick=$('#cancel-modal',overlay).onclick=()=>overlay.remove();
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  bindForm($('#dialog-form',overlay),async data=>{await onsubmit(data);overlay.remove();});
 }
 const field=(name,label,value='',type='text',options=null,extra='')=>`<div class="field"><label class="form-label" for="field-${esc(name)}">${esc(label)}</label>${options?`<select class="select" name="${esc(name)}" id="field-${esc(name)}" ${extra}>${options.map(x=>`<option value="${esc(x.value??x)}" ${(x.value??x)==value?'selected':''}>${esc(x.label??x)}</option>`).join('')}</select>`:type==='textarea'?`<textarea class="textarea" name="${esc(name)}" id="field-${esc(name)}" ${extra}>${esc(value)}</textarea>`:`<input class="input" type="${type}" name="${esc(name)}" id="field-${esc(name)}" value="${esc(value)}" ${extra}>`}</div>`;
 window.CS={...window.CS,$,$$,esc,money,prettyDate,dateOnly,badge,loading,empty,api,toast,value,confirmAction,pageHero,heading,session,mount,bindForm,modal,field,roleLink};
 window.CS.ready=mount();
})();
