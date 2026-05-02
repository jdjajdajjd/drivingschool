import{d as s,j as e,h as i,C as n}from"./index-BVg4Cvtl.js";import{C as x}from"./circle-alert-0LYSXF3K.js";/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=s("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a=s("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=s("ShieldAlert",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]]),b={empty:e.jsx(a,{size:22}),"no-results":e.jsx(a,{size:22}),loading:e.jsx(m,{size:22,className:"animate-spin"}),error:e.jsx(x,{size:22}),success:e.jsx(n,{size:22}),locked:e.jsx(h,{size:22})},p={empty:{bg:"#F4F5F6",color:"#9EA3A8"},"no-results":{bg:"#F4F5F6",color:"#9EA3A8"},loading:{bg:"rgba(246,184,77,0.12)",color:"#C97F10"},error:{bg:"#FEF2F2",color:"#E5534B"},success:{bg:"#F0FDF4",color:"#15803D"},locked:{bg:"#FFFBEB",color:"#B45309"}};function u({kind:r="empty",title:l,description:o,action:c,className:d}){const t=p[r];return e.jsxs("div",{className:i("text-center",d),style:{borderRadius:"24px",border:"1px dashed rgba(0,0,0,0.08)",background:"#F7F8F9",padding:"2.5rem 1.5rem"},children:[e.jsx("div",{className:"mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl",style:{background:t.bg,color:t.color,boxShadow:"0 18px 45px rgba(15,20,25,0.10)"},children:b[r]}),e.jsx("p",{className:"text-[17px] font-extrabold tracking-tight",style:{color:"#111418"},children:l}),o?e.jsx("p",{className:"body mx-auto mt-2 max-w-md",style:{color:"#6F747A"},children:o}):null,c?e.jsx("div",{className:"mt-5 flex justify-center",children:c}):null]})}export{u as S,a};
