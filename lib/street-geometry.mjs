export function segmentProjection(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l)):0;return {x:a.x+t*dx,z:a.z+t*dz,t,distance:Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)};}
export function pointInPolygon(p,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;}
const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
function intersects(a,b,c,d){if(Math.max(a.x,b.x)<Math.min(c.x,d.x)||Math.max(c.x,d.x)<Math.min(a.x,b.x)||Math.max(a.z,b.z)<Math.min(c.z,d.z)||Math.max(c.z,d.z)<Math.min(a.z,b.z))return false;return cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;}
export function polygonBoxOverlap(box,polygon,margin=.08,holes=[]){const x=box.width/2+margin,z=box.length/2+margin,c=Math.cos(box.heading),s=Math.sin(box.heading),corners=[[-x,-z],[x,-z],[x,z],[-x,z]].map(([a,b])=>({x:box.x+a*c+b*s,z:box.z-a*s+b*c}));
 if(corners.some(p=>pointInPolygon(p,polygon)&&!holes.some(h=>pointInPolygon(p,h)))||polygon.some(p=>pointInPolygon(p,corners)))return true;
 for(let i=0;i<corners.length;i++)for(const ring of [polygon,...holes])for(let j=0;j<ring.length;j++)if(intersects(corners[i],corners[(i+1)%4],ring[j],ring[(j+1)%ring.length]))return true;return false;
}
export function polygonBounds(points){const xs=points.map(p=>p.x),zs=points.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);return {x:(minX+maxX)/2,z:(minZ+maxZ)/2,width:maxX-minX,length:maxZ-minZ,heading:0};}
