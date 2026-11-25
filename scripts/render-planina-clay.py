"""Bake grounded glacier relief at successive melt levels onto registered PNG tiles."""
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'www/assets/planina-clay'
ART = ROOT / 'background-concepts/planina-clay'
valley = Image.open(OUT/'valley.png').convert('RGB')
rock = np.asarray(valley, dtype=float)
sheet = Image.open(ART/'clouds-source.png').convert('RGBA')
clouds = Image.new('RGBA', (3*320, 168))
for i,(left,right) in enumerate([(0,790),(791,1640),(1641,2172)]):
    c=sheet.crop((left,0,right,sheet.height))
    c.putalpha(c.getchannel('A').point(lambda a: max(0,min(255,(a-18)*255/228))))
    c=ImageOps.contain(c.crop(c.getbbox()), (312,158), Image.Resampling.LANCZOS)
    clouds.paste(c,(320*i+(320-c.width)//2,(168-c.height)//2))
clouds.save(OUT/'clouds.png')

# Measured skyline guides limit the ridge search to the three separate mountains.
# x, y, w, h cover all melt stages, including the shadow at the ice margin.
peaks=[
    ('left',(0,253,160,140),72,266,82,78,[(0,340),(32,295),(57,272),(72,266),(86,272),(110,306),(135,352),(159,400)]),
    ('middle',(551,462,140,90),616,473,65,49,[(551,535),(580,505),(604,479),(616,473),(627,479),(652,503),(677,526),(690,535)]),
    ('right',(789,327,152,142),873,340,87,82,[(789,455),(813,408),(845,362),(862,344),(873,340),(886,346),(907,368),(940,409)]),
]
STAGES=40
poster=valley.copy()
for name,(ox,oy,w,h),cx,cy,width,depth,guide in peaks:
    yy,xx=np.mgrid[oy:oy+h,ox:ox+w]
    cols=xx[0]
    guess=np.interp(cols,*np.array(guide).T).round().astype(int)
    offsets=np.arange(-9,10)[:,None]
    rows=guess+offsets
    edge=np.linalg.norm(rock[rows+2,cols]-rock[rows-2,cols],axis=2)
    ridge=(edge*rows).sum(axis=0)/np.maximum(edge.sum(axis=0),.001)
    ridge=np.where(edge.sum(axis=0)>20,ridge,guess)
    ridge=np.convolve(np.pad(ridge,2,mode='edge'),np.array([1,4,6,4,1])/16,mode='valid')
    surface=rock[oy:oy+h,ox:ox+w]
    luma=surface @ np.array([.3,.57,.13])
    slope=np.clip(np.gradient(ridge),-2,2)
    tiles=Image.new('RGB',(8*w,5*h))
    for index in range(STAGES):
        melt=index/(STAGES-1)
        scale=1-.59*melt
        u=(xx-cx)/(width*scale)
        breadth=np.maximum(0,1-u*u)
        tongues=(.80+.13*np.cos(9*u+.7)+.09*np.cos(16*u-1.2))
        reach=depth*(1-.74*melt)*breadth**1.15*tongues
        upper=ridge-3*scale*breadth
        # Ice thickens away from the edges; the lower edge retreats uphill first.
        inside=np.minimum((yy-upper)/np.sqrt(1+slope*slope),
                          (upper+reach-yy)/np.sqrt(1+np.gradient(upper+reach,axis=1)**2))
        alpha=np.clip(inside+.5,0,1)*np.clip((1-np.abs(u))*width,0,1)
        thickness=6*scale*(1-np.exp(-np.maximum(inside,0)/4.5))
        dy,dx=np.gradient(thickness)
        lighting=np.clip(.76+.12*np.tanh(slope)+.08*(luma-130)/60-.19*dx+.23*dy,.35,1.12)
        # A cool blue ice core shows through along the overhanging lower lip.
        lip=np.exp(-np.maximum(0,upper+reach-yy)/4)
        ice=np.stack([128+119*lighting-40*lip,161+87*lighting-17*lip,198+52*lighting],axis=2)
        shade=np.asarray(Image.fromarray(np.uint8(alpha*255)).filter(ImageFilter.GaussianBlur(2.1)))/255
        shadow=np.zeros_like(shade)
        shadow[3:,:-1]=shade[:-3,1:]
        bed=surface*(1-.23*shadow[:,:,None])
        pixels=np.clip(bed*(1-alpha[:,:,None])+ice*alpha[:,:,None],0,255).astype(np.uint8)
        tile=Image.fromarray(pixels)
        tiles.paste(tile,(index%8*w,index//8*h))
        if index==0:
            poster.paste(tile,(ox,oy))
    tiles.save(OUT/(name+'.png'),optimize=True)

for i,(cx,cy,w,h,amplitude,phase) in enumerate([(124,145,283,148,36,0),(834,178,265,140,33,1.2),(678,291,128,68,20,2.4)]):
    tile=clouds.crop((320*i,0,320*(i+1),168)).resize((w,h),Image.Resampling.LANCZOS)
    poster.paste(tile,(round(cx+amplitude*math.sin(phase)-w/2),round(cy+3*math.sin(2*phase)-h/2)),tile)
poster.resize((659,1170),Image.Resampling.LANCZOS).save(OUT/'poster.png')
