document.addEventListener('DOMContentLoaded',async()=>{
 const C=window.CS;if(!(await C.ready))return;
 const page=document.body.dataset.page,app=C.$('#app');
 const button=(label,action,id,style='outline')=>`<button class="btn btn-${style} btn-sm" data-action="${action}" data-id="${id}">${label}</button>`;
 const text=(value)=>C.esc(value===null||value===undefined?'—':value);
 const format=(key,v)=>key.includes('status')?C.badge(v):key.includes('fare')||key==='total_amount'?C.money(v):key.includes('time')||key==='created_at'?C.prettyDate(v):text(v);
 const table=(items,cols,actions='')=>items.length?`<div class="table-wrap"><table class="table"><thead><tr>${cols.map(([key,label])=>`<th>${label}</th>`).join('')}${actions?'<th>Actions</th>':''}</tr></thead><tbody>${items.map(x=>`<tr>${cols.map(([key])=>`<td>${format(key,x[key])}</td>`).join('')}${actions?`<td><div class="d-flex">${typeof actions==='function'?actions(x):''}</div></td>`:''}</tr>`).join('')}</tbody></table></div>`:C.empty('No records available','Use the add button to create the first entry.');
 const render=(title,description,content,action='')=>{app.innerHTML=C.heading(title,description,action)+content;};
 const statusOptions=(array)=>array.map(x=>({value:x,label:x.replaceAll('_',' ')}));
 const configs={
  buses:{title:'Bus fleet',desc:'Manage vehicles, capacity and maintenance status.',url:'/buses',pk:'bus_id',columns:[['bus_number','Bus'],['registration_number','Registration'],['bus_type','Type'],['total_seats','Seats'],['status','Status']],fields:[['bus_number','Bus number'],['registration_number','Registration number'],['bus_type','Bus type','select',statusOptions(['AC','Non-AC'])],['total_seats','Number of seats','number'],['status','Availability','select',statusOptions(['available','maintenance'])]]},
  routes:{title:'Transport routes',desc:'Plan your network and configure ordered boarding stops.',url:'/routes',pk:'route_id',columns:[['route_name','Route'],['source','Origin'],['destination','Destination'],['distance_km','Distance (km)'],['fare_per_km','PKR/km'],['status','Status']],fields:[['route_name','Route name'],['source','Starting city'],['destination','Destination city'],['distance_km','Distance (km)','number'],['estimated_minutes','Travel minutes','number'],['fare_per_km','Fare per km (PKR)','number'],['status','Availability','select',statusOptions(['active','inactive'])]]},
  stops:{title:'Bus stops',desc:'Add terminals and stops served by your routes.',url:'/stops',pk:'stop_id',columns:[['stop_name','Stop name'],['city','City'],['address','Address']],fields:[['stop_name','Stop name'],['city','City'],['address','Address']]},
  schedules:{title:'Scheduled trips',desc:'Assign vehicles, routes, drivers and departure times.',url:'/schedules',pk:'schedule_id',columns:[['bus_number','Bus'],['route_name','Route'],['driver_name','Driver'],['departure_time','Departure'],['status','Status']],fields:[['bus_id','Bus','resource','buses'],['route_id','Route','resource','routes'],['driver_id','Driver','resource','drivers'],['departure_time','Departure time','datetime-local'],['arrival_time','Arrival time','datetime-local'],['fare_override','Full route fare override (optional)','number']]},
  drivers:{title:'Driver management',desc:'Manage driver accounts, licenses and access.',url:'/drivers',pk:'driver_id',columns:[['name','Name'],['email','Email'],['phone','Phone'],['license_number','License number'],['status','Account status']],fields:[['name','Full name'],['email','Email address','email'],['phone','Phone number'],['license_number','License number'],['address','Address'],['password','Password (new drivers only)','password'],['status','Status','select',statusOptions(['active','blocked'])]]}
 };
 let currentRows=[];
 async function optionsFor(field){
  const type=field[3];const records=await C.api('/'+type);
  if(type==='buses')return records.filter(x=>x.status==='available').map(x=>({value:x.bus_id,label:x.bus_number+' · '+x.total_seats+' seats'}));
  if(type==='routes')return records.filter(x=>x.status==='active').map(x=>({value:x.route_id,label:x.route_name}));
  return records.filter(x=>x.status==='active').map(x=>({value:x.driver_id,label:x.name}));
 }
 async function openEdit(config,row=null){
  const editing=Boolean(row),controls=[];
  for(const f of config.fields){
   const [key,label,type='text',options]=f;
   if(config===configs.drivers&&editing&&(key==='email'||key==='password'))continue;
   if(config===configs.drivers&&!editing&&key==='status')continue;
   let chosen=options;if(type==='resource')chosen=await optionsFor(f);
   const dateValue=type==='datetime-local'?String(row?.[key]||'').replace(' ','T').slice(0,16):row?.[key]??'';
   controls.push(C.field(key,label,dateValue,type==='resource'?'text':type,chosen,type==='number'?'step="any" '+(key==='fare_override'?'':'required'):'required'));
  }
  C.modal(`${editing?'Edit':'Add'} ${config.title.toLowerCase()}`,`<div class="form-grid">${controls.join('')}</div>`,async data=>{
   // MySQL DATETIME is written without a timezone shift.
   for(const key of ['departure_time','arrival_time'])if(data[key])data[key]=data[key].replace('T',' ')+':00';
   if(config===configs.schedules&&!data.fare_override)data.fare_override=null;
   await C.api(config.url+(editing?'/'+row[config.pk]:''),{method:editing?'PUT':'POST',body:JSON.stringify(data)});
   C.toast('Saved successfully');await loadConfig(config);
  });
 }
 async function openStopEditor(route){
  const allStops=await C.api('/stops'),assigned=await C.api('/routes/'+route.route_id+'/stops');
  if(!allStops.length)return C.toast('Create bus stops first','error');
  const makeRow=(stopId='',dist='')=>`<div class="route-stop-row"><select class="select" name="stop_id" required><option value="">Choose stop</option>${allStops.map(x=>`<option value="${x.stop_id}" ${x.stop_id==stopId?'selected':''}>${C.esc(x.city)} · ${C.esc(x.stop_name)}</option>`).join('')}</select><input class="input" type="number" step="0.01" min="0" name="distance" required value="${C.esc(dist)}" placeholder="Kilometres"><button class="btn btn-danger btn-sm" type="button" data-remove-stop aria-label="Remove stop"><i class="fa-solid fa-xmark"></i></button></div>`;
  const body=`<div class="form-help mb-2">Arrange stops in travel order. Start at 0 km and finish at ${C.esc(route.distance_km)} km. Bookings on this route prevent changing the stop sequence.</div><div class="route-stops-editor" id="stop-editor">${assigned.length?assigned.map(x=>makeRow(x.stop_id,x.distance_from_start_km)).join(''):makeRow('',0)+makeRow('',route.distance_km)}</div><button class="btn btn-outline btn-sm mt-2" type="button" id="add-route-stop"><i class="fa-solid fa-plus"></i> Add another stop</button>`;
  C.modal('Stops · '+route.route_name,body,async()=>{
   const list=C.$$('.route-stop-row',C.$('#stop-editor')).map(row=>({stop_id:Number(C.$('[name=stop_id]',row).value),distance_from_start_km:Number(C.$('[name=distance]',row).value)}));
   if(list.length<2)throw Error('At least two stops are required');
   await C.api('/routes/'+route.route_id+'/stops',{method:'POST',body:JSON.stringify({stops:list})});C.toast('Route stop sequence updated');
  });
  C.$('#add-route-stop').addEventListener('click',()=>C.$('#stop-editor').insertAdjacentHTML('beforeend',makeRow()));
  C.$('#stop-editor').addEventListener('click',e=>{if(e.target.closest('[data-remove-stop]'))e.target.closest('.route-stop-row').remove()});
 }
 async function loadConfig(config){
  render(config.title,config.desc,C.loading(),'<button class="btn" id="create-record"><i class="fa-solid fa-plus"></i> Add new</button>');
  try{currentRows=await C.api(config.url);
   const actions=x=>button('Edit','edit',x[config.pk])+(config===configs.routes?button('Stops','stops',x[config.pk]):'')+button(config===configs.drivers?'Deactivate':'Delete','remove',x[config.pk],'danger')+(config===configs.schedules?button('Status','status',x[config.pk]):'');
   app.querySelector('.loader').outerHTML=`<div class="dashboard-panel"><div class="dashboard-toolbar"><h3>${currentRows.length} records</h3><input class="input" id="filter-records" type="search" placeholder="Search records..."></div><div id="records-table">${table(currentRows,config.columns,actions)}</div></div>`;
   C.$('#filter-records').oninput=e=>{const q=e.target.value.toLowerCase();C.$('#records-table').innerHTML=table(currentRows.filter(x=>Object.values(x).some(v=>String(v??'').toLowerCase().includes(q))),config.columns,actions);};
   C.$('#create-record').onclick=()=>openEdit(config).catch(e=>C.toast(e.message,'error'));
   C.$('#records-table').onclick=async e=>{
    const btn=e.target.closest('[data-action]');if(!btn)return;const row=currentRows.find(x=>String(x[config.pk])===btn.dataset.id);if(!row)return;
    if(btn.dataset.action==='edit')openEdit(config,row).catch(e=>C.toast(e.message,'error'));
    if(btn.dataset.action==='stops')openStopEditor(row).catch(e=>C.toast(e.message,'error'));
    if(btn.dataset.action==='status'){
     C.modal('Update trip status',C.field('status','Trip status',row.status,'text',statusOptions(['scheduled','delayed','in_progress','completed','cancelled'])),async data=>{await C.api('/schedules/'+row.schedule_id+'/status',{method:'PUT',body:JSON.stringify(data)});C.toast('Status updated');loadConfig(config);});
    }
    if(btn.dataset.action==='remove')C.confirmAction(config===configs.drivers?`Deactivate ${row.name}?`:'Delete this record? Related records may prevent deletion.',async()=>{await C.api(config.url+'/'+row[config.pk],{method:'DELETE'});C.toast(config===configs.drivers?'Driver deactivated':'Record removed');await loadConfig(config);});
   };
  }catch(e){app.querySelector('.loader')?.remove();C.toast(e.message,'error');}
 }
 const statCard=(icon,value,label)=>`<div class="stat-card"><span class="stat-icon"><i class="fa-solid ${icon}"></i></span><div><div class="value">${C.esc(value)}</div><div class="label">${C.esc(label)}</div></div></div>`;
 if(page==='dashboard'){
  render('Operations overview','Everything happening across your transport network, at a glance.',C.loading());
  try{
   const [stats,recents]=await Promise.all([C.api('/admin/dashboard'),C.api('/admin/recent-bookings')]);
   render('Operations overview','Everything happening across your transport network, at a glance.',`<div class="stat-grid">${statCard('fa-bus',stats.total_buses,'Total buses')}${statCard('fa-route',stats.total_routes,'Active routes & more')}${statCard('fa-users',stats.total_passengers,'Passengers')}${statCard('fa-user-tie',stats.total_drivers,'Drivers')}${statCard('fa-ticket',stats.total_bookings,'All bookings')}${statCard('fa-check-circle',stats.confirmed_bookings,'Confirmed reservations')}${statCard('fa-circle-check',stats.available_buses,'Available buses')}${statCard('fa-screwdriver-wrench',stats.maintenance_buses,'Under maintenance')}</div><div class="grid grid-2"><div class="dashboard-panel"><h3>Quick operations</h3><p class="muted mt-1">Start with the most common tasks.</p><div class="grid grid-2 mt-2"><a href="/admin/buses.html" class="btn btn-outline">Manage fleet</a><a href="/admin/schedules.html" class="btn btn-outline">Trip schedules</a><a href="/admin/routes.html" class="btn btn-outline">Manage routes</a><a href="/admin/reports.html" class="btn btn-outline">View reports</a></div></div><div class="dashboard-panel"><h3>Fleet availability</h3><p class="muted mt-1">Vehicle operating status from the database.</p><div class="mt-2">${C.badge('available')} ${stats.available_buses} buses</div><div class="mt-2">${C.badge('maintenance')} ${stats.maintenance_buses} buses</div></div></div><div class="dashboard-panel mt-1"><div class="dashboard-toolbar"><h3>Recent reservations</h3><a class="btn btn-outline btn-sm" href="/admin/bookings.html">View all</a></div>${table(recents,[['booking_reference','Reference'],['name','Passenger'],['total_amount','Fare'],['booking_status','Status'],['created_at','Booked on']])}</div>`);
  }catch(e){app.innerHTML=C.empty('Dashboard is unavailable',e.message);}
 }
 if(configs[page])loadConfig(configs[page]);
 if(page==='bus-form'){
  render('Add a new bus','Register a vehicle in your available fleet.',`<div class="dashboard-panel" style="max-width:760px"><form id="new-bus-form" class="grid">${configs.buses.fields.map(([key,label,type='text',options])=>C.field(key,label,'',type,options,'required')).join('')}<div class="d-flex flex-wrap"><button class="btn" type="submit">Save bus</button><a class="btn btn-outline" href="/admin/buses.html">All buses</a></div></form></div>`);
  C.bindForm(C.$('#new-bus-form'),async data=>{await C.api('/buses',{method:'POST',body:JSON.stringify(data)});C.toast('Bus added');location.href='/admin/buses.html';});
 }
 if(page==='bookings'){
  render('Passenger bookings','Monitor bookings and manage upcoming reservations.',C.loading());
  try{const list=await C.api('/admin/bookings');const action=x=>x.booking_status==='confirmed'?button('Cancel','cancel',x.booking_id,'danger'):'';
   render('Passenger bookings','Monitor bookings and manage upcoming reservations.',`<div class="dashboard-panel"><div class="dashboard-toolbar"><h3>${list.length} bookings</h3><input class="input" type="search" id="booking-search" placeholder="Search passengers, references..."></div><div id="bookings-table">${table(list,[['booking_reference','Reference'],['passenger_name','Passenger'],['bus_number','Bus'],['total_amount','Amount'],['booking_status','Status'],['created_at','Booked on']],action)}</div></div>`);
   C.$('#booking-search').oninput=e=>{const term=e.target.value.toLowerCase();C.$('#bookings-table').innerHTML=table(list.filter(x=>Object.values(x).some(v=>String(v??'').toLowerCase().includes(term))),[['booking_reference','Reference'],['passenger_name','Passenger'],['bus_number','Bus'],['total_amount','Amount'],['booking_status','Status'],['created_at','Booked on']],action)};
   C.$('#bookings-table').onclick=e=>{const btn=e.target.closest('[data-action=cancel]');if(btn)C.confirmAction('Cancel this reservation and release its seats?',async()=>{await C.api('/bookings/'+btn.dataset.id+'/cancel',{method:'PUT'});C.toast('Booking cancelled');location.reload();});};
  }catch(e){app.innerHTML=C.empty('Unable to retrieve bookings',e.message);}
 }
 if(page==='complaints'){
  render('Feedback & complaints','Read passenger submissions and respond with updates.',C.loading());
  try{const list=await C.api('/admin/feedback');const cols=[['name','Passenger'],['type','Type'],['message','Message'],['status','Status'],['created_at','Date']];const action=x=>button('Respond','reply',x.feedback_id);
   render('Feedback & complaints','Read passenger submissions and respond with updates.',`<div class="dashboard-panel">${table(list,cols,action)}</div>`);
   app.onclick=e=>{const btn=e.target.closest('[data-action=reply]');if(!btn)return;const x=list.find(z=>String(z.feedback_id)===btn.dataset.id);C.modal('Respond to '+x.name,`<div class="form-help mb-2">${C.esc(x.message)}</div><div class="grid">${C.field('status','Submission status',x.status,'text',statusOptions(['pending','in_progress','resolved','rejected']))}${C.field('admin_response','Your response',x.admin_response||'','textarea')}</div>`,async data=>{await C.api('/admin/feedback/'+x.feedback_id+'/status',{method:'PUT',body:JSON.stringify(data)});C.toast('Response saved and passenger notified');location.reload();});};
  }catch(e){app.innerHTML=C.empty('Unable to load submissions',e.message);}
 }
 if(page==='users'){
  render('User accounts','Passenger and team profiles, account access and status.',C.loading());
  try{const list=await C.api('/admin/users');const cols=[['name','Name'],['email','Email'],['phone','Phone'],['role','Role'],['status','Status'],['created_at','Joined']];const action=x=>button(x.status==='active'?'Block':'Activate','toggle',x.user_id);
   render('User accounts','Passenger and team profiles, account access and status.',`<div class="dashboard-panel">${table(list,cols,action)}</div>`);
   app.onclick=e=>{const btn=e.target.closest('[data-action=toggle]');if(!btn)return;const x=list.find(z=>String(z.user_id)===btn.dataset.id);C.confirmAction('Change the account status for '+x.name+'?',async()=>{await C.api('/admin/users/'+x.user_id+'/status',{method:'PUT',body:JSON.stringify({status:x.status==='active'?'blocked':'active'})});C.toast('Account updated');location.reload();});};
  }catch(e){app.innerHTML=C.empty('Unable to load users',e.message);}
 }
 if(page==='reports'){
  render('Reports & analytics','Booking activity and network performance in real time.',C.loading());
  try{const r=await C.api('/admin/reports');const max=Math.max(1,...r.monthly.map(x=>x.count));
   render('Reports & analytics','Booking activity and network performance in real time.',`<div class="stat-grid">${statCard('fa-ticket',r.summary.total_bookings,'Total bookings')}${statCard('fa-coins',C.money(r.summary.total_value),'Confirmed booking value')}${statCard('fa-people-group',r.summary.unique_passengers,'Unique passengers')}${statCard('fa-calendar',r.monthly.length,'Months with activity')}</div><div class="grid grid-2"><div class="dashboard-panel"><h3>Bookings by month</h3>${r.monthly.length?r.monthly.map(x=>`<div class="mt-2"><div class="d-flex justify-between small"><span>${C.esc(x.month)}</span><strong>${x.count} bookings</strong></div><div style="height:9px;background:#e6f0ee;border-radius:9px"><div style="width:${x.count/max*100}%;height:100%;background:var(--teal);border-radius:9px"></div></div></div>`).join(''):C.empty('No booking data yet')}</div><div class="dashboard-panel"><h3>Trip status breakdown</h3>${table(r.trip_stats,[['status','Trip status'],['count','Trips']])}</div></div><div class="dashboard-panel"><h3>Top booked routes</h3>${table(r.route_stats,[['route_name','Route'],['bookings','Reservations']])}</div>`);
  }catch(e){app.innerHTML=C.empty('Unable to generate reports',e.message);}
 }
});
