import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.env.TEST_BOOTH_URL||'http://127.0.0.1:3100';
const hardware=process.env.TEST_HARDWARE_URL||'http://127.0.0.1:3101';
const stamp=Date.now(), password=randomBytes(24).toString('base64url');
const users=[{email:`qa-account-a-${stamp}@example.invalid`,name:'试填账号A',cookie:''},{email:`qa-account-b-${stamp}@example.invalid`,name:'试填账号B',cookie:''}];
let checks=0;
async function request(url,route,{user,method='GET',body,status=200}={}){
 const res=await fetch(url+route,{method,headers:{'Content-Type':'application/json',Origin:url,...(user?.cookie?{Cookie:user.cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await res.json();
 assert.equal(res.status,status,`${route}: expected ${status}, received ${res.status}; ${JSON.stringify(data).slice(0,180)}`);
 if(user){const cookies=res.headers.getSetCookie().filter(c=>!c.startsWith('__Secure-')||url.startsWith('https')).map(c=>c.split(';')[0]);if(cookies.length)user.cookie=cookies.join('; ');}
 checks++;return data;
}
const answers={questionnaireVersion:'perfume-onboarding-zh-v1.1',displayName:'试填昵称',experienceLevel:'beginner',usualContexts:['commute'],contextOther:'',familyAffinity:Object.fromEntries(['citrus','floral','tea','green_herbal','woody','aquatic','fruity','gourmand'].map(id=>[id,'unknown'])),sweetnessPreference:'slight',presencePreference:'medium',odorAvoidances:['none'],specificFloral:'',odorAvoidanceOtherText:'',ingredientExclusionAnswer:'none_known',ingredientExclusionText:'',explorationPreference:'familiar',likedExamplesText:'喜欢茶香',dislikedExamplesText:''};
let browser;
try{
 await request(base,'/api/me',{status:401});
 const publicAdmin=await fetch(base+'/admin/feedback',{redirect:'manual'});const publicHtml=await publicAdmin.text();assert.ok([307,308].includes(publicAdmin.status)||publicHtml.includes('NEXT_REDIRECT'));assert.equal(publicHtml.includes('账号、画像与反馈'),false);checks++;
 await request(base,'/api/generate',{method:'POST',body:{message:'通勤'},status:401});
 for(const user of users){const signed=await request(base,'/api/auth/sign-up/email',{user,method:'POST',body:{email:user.email,password,passwordConfirm:password,name:user.name}});assert.ok(signed.user.id);}
 const [a,b]=users;
 await request(base,'/api/generate',{user:a,method:'POST',body:{message:'通勤'},status:428});
 const saved=await request(base,'/api/me/questionnaire',{user:a,method:'PUT',body:{answers,expectedVersion:0}});assert.equal(saved.profile.version,1);
 await request(base,'/api/me/questionnaire',{user:a,method:'PUT',body:{answers,expectedVersion:0},status:409});
 const signedHardware=await request(hardware,'/api/auth/sign-in/email',{user:{...a},method:'POST',body:{email:a.email,password}});
 const me=await request(base,'/api/me',{user:a}),hwMe=await request(hardware,'/api/me',{user:a});
 assert.equal(signedHardware.user.id,me.user.id);assert.equal(hwMe.user.id,me.user.id);assert.deepEqual(hwMe.profile.answers,me.profile.answers);
 const generated=await request(base,'/api/generate',{user:a,method:'POST',body:{message:'帮我做一份通勤香'}});
 assert.ok(generated.generationId);assert.equal(generated.profileVersionUsed,1);
 assert.equal(generated.formula.quantitativeAnalysis.targetVector.sweet,1);assert.equal(generated.formula.quantitativeAnalysis.targetVector.intensity,3);
 const explained=await request(base,'/api/generate',{user:a,method:'POST',body:{message:'为什么选这些原料？',currentGenerationId:generated.generationId}});assert.deepEqual(explained.formula.formula,generated.formula.formula);
 await request(base,'/api/generate',{user:b,method:'POST',body:{message:'通勤',questionnaire:answers,currentGenerationId:generated.generationId},status:404});
 await request(base,'/api/feedback',{user:b,method:'POST',body:{generationId:generated.generationId,rating:4,comment:'',smelled:true,scope:'current'},status:404});
 const feedback={generationId:generated.generationId,rating:3,comment:'以后淡一点，日常不要太甜',smelled:true,scope:'global'};
 await request(base,'/api/feedback',{user:a,method:'POST',body:feedback});
 const duplicate=await request(base,'/api/feedback',{user:a,method:'POST',body:feedback});assert.equal(duplicate.duplicate,true);
 const pending=await request(base,'/api/me',{user:a});assert.equal(pending.memories.length,2);assert.ok(pending.memories.every(m=>m.status==='pending'));
 const memory=pending.memories.find(m=>m.field==='presencePreference');
 const confirmed=await request(base,'/api/me/memories',{user:a,method:'POST',body:{id:memory.id,action:'confirm',expectedVersion:1}});assert.equal(confirmed.profile.version,2);
 assert.equal(confirmed.profile.answers.presencePreference,'light');
 const learned=await request(base,'/api/generate',{user:a,method:'POST',body:{message:'再帮我做一份通勤香'}});assert.equal(learned.formula.quantitativeAnalysis.targetVector.intensity,2);
 await request(base,'/api/me/memories',{user:a,method:'POST',body:{id:memory.id,action:'revoke',expectedVersion:1},status:409});
 const revoked=await request(base,'/api/me/memories',{user:a,method:'POST',body:{id:memory.id,action:'revoke',expectedVersion:2}});assert.equal(revoked.profile.version,3);assert.equal(revoked.profile.answers.presencePreference,answers.presencePreference);
 const temp=await request(base,'/api/generate',{user:b,method:'POST',body:{message:'清爽',questionnaire:answers}});assert.equal(temp.profileVersionUsed,null);
 const bMe=await request(base,'/api/me',{user:b});assert.equal(bMe.profile,null);
 await request(base,'/api/generate',{user:b,method:'POST',body:{message:'清爽',questionnaire:{...answers,ingredientExclusionAnswer:'named',ingredientExclusionText:'未知化学物质'}},status:422});
 await request(base,'/api/records',{user:b,status:403});
 const privateAdmin=await fetch(base+'/admin/feedback',{headers:{Cookie:b.cookie}});const privateHtml=await privateAdmin.text();assert.ok(privateAdmin.status===404||privateHtml.includes('NEXT_HTTP_ERROR_FALLBACK;404'));assert.equal(privateHtml.includes('账号、画像与反馈'),false);checks++;
 const exported=await request(base,'/api/me/export',{user:b});assert.ok(exported.account_generations.every(g=>g.user_id===bMe.user.id));assert.equal(exported.account_profiles.length,0);
 const hwGeneration=await request(hardware,'/api/generate',{user:a,method:'POST',body:{message:'清爽通勤'}});
 await request(hardware,'/api/dispatch',{user:b,method:'POST',body:{generationId:hwGeneration.generationId,targetTotalG:10},status:404});
 if(!process.env.TEST_SKIP_DISPATCH){const dispatch=await request(hardware,'/api/dispatch',{user:a,method:'POST',body:{generationId:hwGeneration.generationId,targetTotalG:10}});assert.equal(dispatch.mode,'simulated');assert.equal(dispatch.recipe.steps.reduce((s,i)=>s+i.grams,0),10);}
 // Browser checks use the same throwaway account and never store its password.
 const dir=path.resolve('runtime/account-verification');await mkdir(dir,{recursive:true});
 browser=await chromium.launch({channel:'msedge',headless:true,...(process.env.TEST_PROXY?{proxy:{server:process.env.TEST_PROXY}}:{})});
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByRole('heading',{name:'欢迎回来'}).waitFor();
 await page.screenshot({path:path.join(dir,'login-desktop.png'),fullPage:true});
 await page.getByLabel('邮箱',{exact:true}).fill(a.email);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录',exact:true}).click();
 await page.getByRole('button',{name:/偏好与记忆/}).waitFor();await page.getByRole('button',{name:/偏好与记忆/}).click();
 await page.getByRole('button',{name:'修改问卷'}).click();await page.getByRole('heading',{name:'让我们先了解你喜欢的香气'}).waitFor();
 await page.screenshot({path:path.join(dir,'questionnaire-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'下一步',exact:true}).click();await page.getByRole('heading',{name:/4. 对下面/}).waitFor();
 await page.screenshot({path:path.join(dir,'families-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(dir,'families-mobile.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Mobile questionnaire must not overflow');
 await page.getByRole('button',{name:'下一步',exact:true}).click();await page.getByRole('button',{name:'下一步',exact:true}).click();await page.getByRole('button',{name:'查看画像摘要'}).click();
 assert.equal(await page.getByText('再精细一点').count(),0);assert.equal(await page.getByText('如果用到').count(),0);
 await page.getByRole('button',{name:'确认并保存，开始生成'}).click();await page.getByRole('button',{name:/偏好与记忆/}).waitFor();
 await page.reload();await page.getByRole('button',{name:/偏好与记忆/}).waitFor();
 assert.deepEqual(errors,[]);checks+=8;
 await browser.close();browser=null;
 console.log(`PASS: ${checks} account/API/browser checks; user isolation, shared profile, target injection, memory undo and mobile layout verified.`);
}finally{
 if(browser)await browser.close();
 for(const user of users)if(user.cookie){try{await request(base,'/api/auth/delete-user',{user,method:'POST',body:{password}});await request(base,'/api/me',{user,status:401});}catch{console.error('A temporary QA account needs cleanup; no credentials logged.');process.exitCode=1;}}
}
