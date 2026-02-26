import{c as d,s as i}from"./index-D1KjIFF5.js";import{e as f,u as h,f as o}from"./vendor-data-CaJSbdUh.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q=d("Droplets",[["path",{d:"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z",key:"1ptgy4"}],["path",{d:"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97",key:"1sl1rz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=d("Pill",[["path",{d:"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z",key:"wa1lgi"}],["path",{d:"m8.5 8.5 7 7",key:"rvfmvr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=d("Syringe",[["path",{d:"m18 2 4 4",key:"22kx64"}],["path",{d:"m17 7 3-3",key:"1w1zoj"}],["path",{d:"M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5",key:"1exhtz"}],["path",{d:"m9 11 4 4",key:"rovt3i"}],["path",{d:"m5 19-3 3",key:"59f2uf"}],["path",{d:"m14 4 6 6",key:"yqp9t2"}]]);function S(a,n){const c=f(),s=h({queryKey:["care-reminders",a,n],queryFn:async()=>{let e=i.from("care_reminders").select("*").eq("user_id",a).order("due_date",{ascending:!0});n&&(e=e.eq("pet_id",n));const{data:r,error:t}=await e.limit(50);if(t)throw t;return r},enabled:!!a,staleTime:3e4}),m=(s.data||[]).filter(e=>!e.completed_at),l=(s.data||[]).filter(e=>!!e.completed_at),u=o({mutationFn:async e=>{const{data:r,error:t}=await i.from("care_reminders").insert({user_id:a,pet_id:e.petId,category:e.category,title:e.title,notes:e.notes||null,due_date:e.dueDate,is_recurring:e.isRecurring||!1,recurrence_days:e.recurrenceDays||null}).select().single();if(t)throw t;return r},onSuccess:()=>{c.invalidateQueries({queryKey:["care-reminders"]})}}),y=o({mutationFn:async e=>{const{error:r}=await i.from("care_reminders").update({completed_at:new Date().toISOString()}).eq("id",e);if(r)throw r},onSuccess:()=>{c.invalidateQueries({queryKey:["care-reminders"]})}}),p=o({mutationFn:async e=>{const{error:r}=await i.from("care_reminders").delete().eq("id",e);if(r)throw r},onSuccess:()=>{c.invalidateQueries({queryKey:["care-reminders"]})}});return{reminders:s.data||[],upcomingReminders:m,completedReminders:l,isLoading:s.isLoading,createReminder:u,completeReminder:y,deleteReminder:p}}export{q as D,k as P,w as S,S as u};
