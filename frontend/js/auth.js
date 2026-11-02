document.addEventListener('DOMContentLoaded',async()=>{
 const C=window.CS;if(!(await C.ready))return;
 const root=C.$('#app'),page=document.body.dataset.page;
 if(page==='login'){
  root.innerHTML=`<div class="auth-shell"><div class="auth-card"><div class="eyebrow">Welcome back</div><h2>Sign in to City Safar</h2><p class="muted">Access your tickets, trips and transport workspace.</p><form id="auth-form">${C.field('email','Email address','','email',null,'required autocomplete="email"')}${C.field('password','Password','','password',null,'required autocomplete="current-password"')}<button class="btn" type="submit">Sign in <i class="fa-solid fa-arrow-right"></i></button></form><p class="small text-center mt-2">New passenger? <a href="/register.html" style="color:var(--teal);font-weight:800">Create an account</a></p></div></div>`;
  C.bindForm(C.$('#auth-form'),async data=>{const result=await C.api('/auth/login',{method:'POST',body:JSON.stringify(data)});C.toast('Welcome back!');const next=new URLSearchParams(location.search).get('next');const safe=next&&next.startsWith('/')&&!next.startsWith('//')?next:C.roleLink(result.user.role);location.href=safe;});
 }
 if(page==='register'){
  root.innerHTML=`<div class="auth-shell"><div class="auth-card"><div class="eyebrow">A better journey starts here</div><h2>Create your passenger account</h2><p class="muted">Reserve seats and keep every ticket in one place.</p><form id="auth-form">${C.field('name','Full name','','text',null,'required maxlength="100" autocomplete="name"')}${C.field('email','Email address','','email',null,'required autocomplete="email"')}${C.field('phone','Phone number','','tel',null,'required maxlength="20" autocomplete="tel"')}${C.field('password','Password (min. 8 characters)','','password',null,'required minlength="8" autocomplete="new-password"')}${C.field('confirm','Confirm password','','password',null,'required minlength="8" autocomplete="new-password"')}<button class="btn" type="submit">Create account <i class="fa-solid fa-arrow-right"></i></button></form><p class="small text-center mt-2">Already registered? <a href="/login.html" style="color:var(--teal);font-weight:800">Sign in</a></p></div></div>`;
  C.bindForm(C.$('#auth-form'),async data=>{if(data.password!==data.confirm)throw Error('Passwords do not match');await C.api('/auth/register',{method:'POST',body:JSON.stringify(data)});location.href='/login.html?registered=1';});
 }
 if(page==='login'&&new URLSearchParams(location.search).has('registered'))C.toast('Account created successfully. Sign in below.');
});
