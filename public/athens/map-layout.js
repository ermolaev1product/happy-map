/* Screen-space grouping and label placement; never drops events from a group. */
const MorrowMapLayout = (points, width, height, zoom) => {
 const groups=[];
 for(const p of points){const g=groups.find(g=>g.focus===p.focus&&Math.hypot(g.x-p.x,g.y-p.y)<40);if(g)g.items.push(p.item);else groups.push({x:p.x,y:p.y,focus:p.focus,items:[p.item]});}
 const overlap=(a,b)=>a.l<b.r&&a.r>b.l&&a.t<b.b&&a.b>b.t;
 const obstacles=groups.map(g=>({l:g.x-23,r:g.x+23,t:g.y-23,b:g.y+23}));
 obstacles.push({l:0,r:width,t:0,b:65},{l:0,r:width,t:height-102,b:height},{l:width-68,r:width,t:65,b:175});
 const labels=[];const cap=Math.min(18,Math.max(3,Math.floor(width*height/(zoom>=16?16000:26000))));
 // Prefer central labels, so edge markers cannot consume the label budget.
 const order=[...groups].sort((a,b)=>Math.hypot(a.x-width/2,a.y-height/2)-Math.hypot(b.x-width/2,b.y-height/2));
 for(const g of order){if(labels.length>=cap)break;for(const side of ['right','left']){
  const rect={l:side==='right'?g.x+25:g.x-145,r:side==='right'?g.x+145:g.x-25,t:g.y-12,b:g.y+12};
  if(rect.l<8||rect.r>width-8||rect.t<8||rect.b>height-8||obstacles.some(o=>overlap(rect,o)))continue;
  g.labelSide=side;g.labelRect=rect;labels.push(rect);obstacles.push({l:rect.l-7,r:rect.r+7,t:rect.t-6,b:rect.b+6});break;
 }}
 return groups;
};
if(typeof module!=='undefined')module.exports=MorrowMapLayout;
