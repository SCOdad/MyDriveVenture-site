import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

const target=process.argv[2]||'assets/images/dv03/hero/parker-seated.png';
const bytes=fs.readFileSync(target);
if(bytes.subarray(1,4).toString()!=='PNG')throw new Error('Hero must be a PNG');
let offset=8,width,height,bitDepth,colorType,interlace,idat=[];
while(offset<bytes.length){
  const length=bytes.readUInt32BE(offset),type=bytes.subarray(offset+4,offset+8).toString(),data=bytes.subarray(offset+8,offset+8+length);
  if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];colorType=data[9];interlace=data[12]}
  if(type==='IDAT')idat.push(data);
  offset+=length+12;
}
if(width!==1536||height!==1024)throw new Error(`Hero must be 1536x1024; received ${width}x${height}`);
if(bitDepth!==8||colorType!==6||interlace!==0)throw new Error('Hero must be a non-interlaced 8-bit RGBA PNG');
const raw=zlib.inflateSync(Buffer.concat(idat)),stride=width*4,rows=[];
for(let y=0;y<height;y++){
  const filter=raw[y*(stride+1)],source=raw.subarray(y*(stride+1)+1,(y+1)*(stride+1)),row=Buffer.alloc(stride),prior=rows[y-1];
  for(let x=0;x<stride;x++){
    const left=x>=4?row[x-4]:0,up=prior?prior[x]:0,upperLeft=prior&&x>=4?prior[x-4]:0;
    let prediction=0;
    if(filter===1)prediction=left;
    else if(filter===2)prediction=up;
    else if(filter===3)prediction=Math.floor((left+up)/2);
    else if(filter===4){const p=left+up-upperLeft,pa=Math.abs(p-left),pb=Math.abs(p-up),pc=Math.abs(p-upperLeft);prediction=pa<=pb&&pa<=pc?left:pb<=pc?up:upperLeft}
    else if(filter!==0)throw new Error(`Unsupported PNG filter ${filter}`);
    row[x]=(source[x]+prediction)&255;
  }
  rows.push(row);
}
let minX=width,minY=height,maxX=-1,maxY=-1,visible=0;
for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(rows[y][x*4+3]>=8){visible++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
if(!visible)throw new Error('Hero has no visible pixels');
const bbox=[minX,minY,maxX+1,maxY+1];
if(minX>32||minY<470||minY>560||maxX+1<420||maxX+1>500||maxY+1!==1024)throw new Error(`Hero composition is outside the DV03 acceptance window: ${bbox.join(',')}`);
console.log(JSON.stringify({file:path.resolve(target),width,height,alphaThreshold:8,visiblePixels:visible,bbox,status:'PASS'},null,2));
