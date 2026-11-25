"""Bake the Grad miniature's animated water and cloth, and register the window glass."""
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "background-concepts/grad-clay"
OUT = ROOT / "www/assets/grad-clay"
base = Image.open(ART / "square-source.png").convert("RGB")
sheet = Image.open(ART / "clouds-source.png").convert("RGBA")
clouds = Image.new("RGBA", (512, 256))
for i in range(4):
    x, y = i % 2 * 768, i // 2 * 512
    cloud = sheet.crop((x, y, x+768, y+512))
    cloud.putalpha(cloud.getchannel("A").point(lambda a: max(0, min(255, (a-32)*255/216))))
    cloud = ImageOps.contain(cloud.crop(cloud.getbbox()), (248, 120), Image.Resampling.LANCZOS)
    clouds.alpha_composite(cloud, (i%2*256+(256-cloud.width)//2, i//2*128+(128-cloud.height)//2))
clouds.save(OUT / "clouds.png")

# Select glass within each casing. Blue panes and warm distant panes need
# different masks so painted wood, arches and mullions keep their silhouettes.
rgb = np.asarray(base, dtype=float)
r,g,b = rgb.transpose(2,0,1)
glass = np.zeros(r.shape)
for x,y,w,h in [(22,408,53,125),(901,452,40,131),(21,879,52,108),(151,578,34,47),
                (219,579,29,58),(274,585,14,57),(342,714,17,38),(707,665,16,52),
                (744,662,29,47),(805,661,22,39),(155,806,55,44)]:
    area = np.s_[y:y+h,x:x+w]
    glass[area] = np.clip((b[area]-r[area]-1)/12,0,1)
for x,y,w,h in [(517,617,21,16),(556,625,30,21),(598,624,11,19),(619,580,17,17),
                (656,577,22,18),(501,648,47,20),(662,670,24,17)]:
    area = np.s_[y:y+h,x:x+w]
    glass[area] = np.clip((g[area]-b[area]-58)/24,0,1)*np.clip((r[area]-180)/40,0,1)
distant = np.zeros_like(glass)
distant[565:700,495:690] = glass[565:700,495:690]
base = Image.composite(Image.new("RGB",base.size,(65,91,105)),base,Image.fromarray(np.uint8(240*distant)))
base.save(OUT / "square.png")
mask = Image.fromarray(np.uint8(255*glass))
lights = Image.new("RGBA",base.size,(255,167,62,0))
lights.putalpha(mask.filter(ImageFilter.GaussianBlur(10)).point(lambda a:min(220,int(a*1.9))))
panes = Image.new("RGBA",base.size,(255,218,138,0))
panes.putalpha(mask.point(lambda a:int(a*.96)))
lights.alpha_composite(panes)
lights.crop((0,380,941,1000)).save(OUT / "lights.png")

# Sample the water height field in basin coordinates. Compression along the
# ground plane projects circular waves into ellipses. Its normals light the crests.
X,Y = np.meshgrid(np.arange(48,472)+.5,np.arange(1244,1440)+.5)
stone = rgb[1244:1440,48:472]
basin = np.clip((stone[:,:,2]-stone[:,:,0]-4)/26,0,1)
water_frames=[]
flag_frames=[]
for i in range(32):
    phase=2*math.pi*i/32
    wave=np.zeros(X.shape)
    for cx,cy in [(147,1394),(364,1394),(261,1414)]:
        d=np.hypot(X-cx,(Y-cy)*3.9) + 1.8*np.sin((X-cx)*.06+phase)*np.sin((Y-cy)*.13)
        wave+=np.cos(d*.30-phase*2)*np.exp(-d/47)
    rgba=np.empty((*X.shape,4),np.uint8)
    rgba[:,:,:3]=np.where((wave>0)[:,:,None],[181,243,244],[25,121,154])
    rgba[:,:,3]=np.uint8(basin*np.clip(32+np.abs(wave)*139,0,165))
    layer=Image.fromarray(rgba)
    # The waterline in the top saucer passes behind the central stone foot.
    upper=((X-255)/66)**2+((Y-1267)/8.3)**2
    foot=np.clip((np.abs(X-255)-25)/2,0,1)
    upper_fill=np.zeros_like(rgba)
    shimmer=.5+.5*np.sin(X*.37+Y*.8-phase*2)
    upper_fill[:,:,:3]=np.stack([87+47*shimmer,181+34*shimmer,197+28*shimmer],axis=2)
    upper_fill[:,:,3]=np.uint8(215*np.clip((1-upper)*6,0,1)*foot)
    layer=Image.alpha_composite(layer,Image.fromarray(upper_fill))
    # Three falling ribbons spill from the saucer. The parabolic path, round
    # cross section and travelling highlights describe their volume and flow.
    for sx,sy,tx,ty in [(173,1272,147,1394),(338,1273,364,1394),(256,1283,261,1414)]:
        u=np.clip((Y-sy)/(ty-sy),0,1)
        edge=np.sqrt(u)
        center=sx+(tx-sx)*edge+1.25*u*np.sin(11*u-phase*2)
        radius=3.5+1.7*np.cos(u*4)+.7*np.sin(12*u-phase*2)
        n=(X-center)/radius
        nz=np.sqrt(np.maximum(0,1-n*n))
        glint=np.exp(-((n+.35)/.19)**2)*(.62+.38*np.cos(22*u-phase*3))
        strand=np.zeros_like(rgba)
        light=.52+.38*nz+.38*glint
        strand[:,:,:3]=np.uint8(np.clip(light[:,:,None]*[130,215,234]+glint[:,:,None]*38,0,255))
        strand[:,:,3]=np.uint8(np.clip((1-np.abs(n))*radius,0,1)*(Y>=sy)*(Y<=ty)*(150+85*glint))
        layer=Image.alpha_composite(layer,Image.fromarray(strand))
    # Moving reflections on the upper pool, behind the finial and inside the lip.
    draw=ImageDraw.Draw(layer)
    for cx,cy in [(147,1394),(364,1394),(261,1414)]:
        for j in range(5):
            a=2*math.pi*j/5
            hop=(i/32+j*.39)%1
            px=cx+math.cos(a)*(3+6*hop)
            py=cy+math.sin(a)*2-3.5*math.sin(math.pi*hop)
            draw.ellipse((px-1.2,py-.8,px+1.2,py+.8),fill=(197,245,244,166))
    for dx in (-1,1):
        cx=255+dx*55
        for j in range(3):
            y=1265+j*2
            off=2*math.sin(phase+j)
            draw.arc((cx-14+off,y-2,cx+14+off,y+2),4,173,fill=(132,215,220,175),width=1)
    water_frames.append(layer.resize((256,118),Image.Resampling.LANCZOS))

    # Vertex positions and normals of a travelling cloth wave. The first
    # column is fixed to the pole; the free end folds towards the camera.
    flag=Image.new("RGBA",(112,68)); draw=ImageDraw.Draw(flag)
    def cloth(u,v):
        z=u*(3.6*math.sin(9*u-phase)+1.1*math.sin(16*u-2*phase))
        return (2*(1+42*u+.33*z),2*(7+18*v+u*(2.3*math.sin(8*u-phase)-2)+.58*z))
    for j in range(42):
        a,b=j/42,(j+1)/42
        normal=math.cos(9*a-phase)*a
        color=(int(223+23*normal),int(85+23*normal),int(75+20*normal),255)
        draw.polygon([cloth(a,0),cloth(b,0),cloth(b,1),cloth(a,1)],fill=color)
    flag_frames.append(flag.resize((56,34),Image.Resampling.LANCZOS))

def atlas(frames,name):
    w,h=frames[0].size
    sheet=Image.new("RGBA",(8*w,4*h))
    for i,frame in enumerate(frames):
        sheet.paste(frame,(i%8*w,i//8*h))
    sheet.save(OUT/name)

atlas(water_frames,"water.png")
atlas(flag_frames,"flag.png")

# Follow the connected blue sky of this particular plate, including the fine
# edge around the flagpole. The same alpha clips the moon as it rises.
sky_height = 580
red, green, blue = rgb[:sky_height].transpose(2,0,1)
coverage = np.clip(np.minimum.reduce([(blue-234)/16, (blue-green-6)/12, (blue-red-35)/28]), 0, 1)
islands = Image.fromarray(np.uint8(coverage > 0)).copy()
ImageDraw.floodfill(islands, (470,0), 2)
sky_mask = Image.fromarray(np.uint8(255*coverage*(np.asarray(islands)==2)))
assert sky_mask.getpixel((470,40)) == 255 and sky_mask.getpixel((44,470)) == 0
yy,xx = np.mgrid[:sky_height,:base.width]
haze = (.18 + .82*(yy/sky_height)**2) * (.80+.20*np.cos((xx-470)/480))
sky = Image.fromarray(np.uint8(np.stack([2+9*haze, 3+12*haze, 7+23*haze],axis=2))).convert("RGBA")
star_points = [(81,83,1),(237,56,1.5),(365,171,1),(427,82,2),(559,39,1),
                   (639,157,1.5),(804,62,1),(852,244,1),(501,285,1),(328,391,1),
                   (187,247,1),(622,376,1.5),(743,303,1)]
def star_strength(seconds, i):
    return .67+.21*math.sin(seconds*(1.5+.09*(i%4))+i*2.4)+.11*math.sin(seconds*2.7+i)

star=Image.new("RGBA",(32,32))
sy,sx=np.mgrid[:32,:32]
dist=np.hypot(sx-15.5,sy-15.5)
star.paste((244,237,215), (0,0,32,32))
star.putalpha(Image.fromarray(np.uint8(255*np.clip(np.exp(-dist**2/26)+.18*np.exp(-dist**2/94),0,1))))
star.save(OUT/"star.png")
sky.putalpha(sky_mask)
sky.save(OUT/"night-sky.png")

# Orthographic clay sphere. Shallow crater depressions perturb the surface
# normals, so their rims and floors receive the same light as the globe.
v,u=(np.mgrid[:256,:256]+.5-128)/115
z=np.sqrt(np.maximum(0,1-u*u-v*v))
normals=np.stack((u,v,z),axis=2)
for cx,cy,radius in [(-.40,-.34,.16),(.16,-.55,.095),(.33,.06,.18),
                     (-.22,.39,.12),(-.56,.08,.078),(.03,-.12,.07),(.49,.47,.09)]:
    axis=np.array([cx,cy,math.sqrt(1-cx*cx-cy*cy)])
    dot=u*axis[0]+v*axis[1]+z*axis[2]
    d=np.sqrt(np.maximum(1e-8,2-2*dot))/radius
    slope=(.48*d*np.exp(-d*d*1.6) - .75*(d-1)*np.exp(-((d-1)/.25)**2))
    tangent=(dot[:,:,None]*np.stack((u,v,z),axis=2)-axis)/(radius*d[:,:,None])
    normals-=slope[:,:,None]*tangent
normals/=np.maximum(.001,np.linalg.norm(normals,axis=2))[:,:,None]
light=np.maximum(0,normals @ np.array([-.61,-.52,.59]))
shade=.37+.66*light
grain=np.random.default_rng(12).normal(0,.95,z.shape)
moon=Image.fromarray(np.uint8(np.clip(shade[:,:,None]*[250,229,188]+grain[:,:,None]+
    (1-light[:,:,None])*[2,7,20],0,255))).convert("RGBA")
moon.putalpha(Image.fromarray(np.uint8(255*np.clip((1-np.hypot(u,v))*115+.5,0,1))))
# Two falloffs give the illuminated sphere a soft rim and a wider amber halo.
radius=np.hypot(u,v)*115
alpha=150*np.exp(-np.maximum(0,radius-63)/8)+62*np.exp(-np.maximum(0,radius-63)/24)
halo=Image.new("RGBA",(256,256),(250,210,145,0))
halo.putalpha(Image.fromarray(np.uint8(np.clip(alpha*(np.clip((128-radius)/14,0,1)),0,255))))
sphere=moon.resize((142,142),Image.Resampling.LANCZOS)
bright=np.asarray(sphere).copy()
bright[:,:,:3]=np.uint8(np.clip(bright[:,:,:3]*.87+[46,42,33],0,255))
halo.alpha_composite(Image.fromarray(bright),(57,57))
moon=halo.resize((220,220),Image.Resampling.LANCZOS)
moon.save(OUT/"moon.png")

def smooth(t):
    t=max(0,min(1,t))
    return t*t*(3-2*t)

# Only the turquoise river pixels receive the broken reflection, including
# the water visible beneath the arches. Perspective tightens the far ripples.
ry,rx=np.mgrid[752:864,368:704]
water_rgb=rgb[752:864,368:704]
channel=np.clip((np.minimum(water_rgb[:,:,1],water_rgb[:,:,2])-water_rgb[:,:,0]-10)/28,0,1)
depth=np.clip((ry-762)/104,0,1)
river_frames=[]
for i in range(32):
    phase=i*math.tau/32
    center=529+20*depth+9*np.sin(ry*.24+phase)+5*np.sin(ry*.51-phase)
    spread=11+46*depth
    envelope=np.exp(-((rx-center)/spread)**2)
    crest=.5+.5*np.sin(ry*(.98-.002*(ry-752))+.75*np.sin(rx*.11+phase)+phase)
    flecks=(.58+.42*np.cos(rx*.14-ry*.22-phase))**2
    shine=channel*envelope*(.10+.90*crest**4*flecks)
    frame=Image.new("RGBA",(336,112),(224,230,209))
    frame.putalpha(Image.fromarray(np.uint8(217*shine)))
    river_frames.append(frame.resize((192,64),Image.Resampling.LANCZOS))
atlas(river_frames,"river-moonlight.png")

# Soft reflected light grazes the original cobbles and respects the edges
# of the plaza, the base of the fountain and the planters.
py,px=np.mgrid[872:1672,0:941]
cobbles=rgb[872:1672]
mask=Image.new("L",(941,1672))
outline=ImageDraw.Draw(mask)
outline.polygon([(174,896),(391,877),(614,879),(625,911),(760,916),(742,970),(741,1039),
 (840,1057),(839,1091),(771,1107),(749,1202),(781,1280),(844,1320),(814,1420),
 (822,1445),(712,1464),(684,1550),(677,1672),(218,1672),(195,1571),(498,1500),
 (526,1451),(519,1393),(465,1349),(345,1320),(350,1256),(277,1244),(273,1197),
 (230,1194),(216,1243),(157,1254),(155,1323),(63,1348),(29,1288),(4,1271),
 (4,1128),(133,1107),(180,1080)],fill=255)
edge=np.asarray(mask.filter(ImageFilter.GaussianBlur(2)))[872:]/255
distance=(py-872)/800
beam=np.exp(-((px-(532+63*distance))/(64+174*distance))**2)
luma=cobbles @ np.array([.30,.58,.12])/255
amount=edge*beam*(.85-.42*distance)*np.clip((py-870)/28,0,1)*luma**2
paving=Image.fromarray(np.uint8(np.clip(cobbles*[.86,.95,1.05]+[12,13,17],0,255))).convert("RGBA")
paving.putalpha(Image.fromarray(np.uint8(226*amount)))
paving=paving.resize((471,400),Image.Resampling.LANCZOS)
paving.save(OUT/"paving-moonlight.png")

def preview(seconds):
    scene=base.convert("RGBA")
    phase=seconds%300
    night=smooth((phase-240)/20)*(1-smooth((phase-285)/15))
    cover=Image.new("L",sky.size)
    for i,(cx,cy,w,h) in enumerate([(167,125,263,130),(770,175,245,122),(247,331,137,68),(638,277,113,56)]):
        x,y=i%2*256,i//2*128
        piece=clouds.crop((x,y,x+256,y+128)).resize((w,h),Image.Resampling.LANCZOS)
        wind=seconds*2*math.pi/48+[0,1.4,2.3,3.5][i]
        pos=(round(cx+[28,24,17,14][i]*math.sin(wind)-w/2),round(cy+3*math.sin(2*wind)-h/2))
        scene.alpha_composite(piece,pos)
        cover.paste(255, pos+tuple(pos[k]+piece.size[k] for k in (0,1)),piece.getchannel("A"))
    flag=flag_frames[int(seconds*16)%32]
    scene.alpha_composite(water_frames[int(seconds*20)%32].resize((424,196)),(48,1244))
    scene.alpha_composite(flag,(727,383))
    if night:
        scene.alpha_composite(Image.new("RGBA",base.size,(12,19,63,round(188*night))))
        t=min(1,(phase-240)/20)
        rise=1-(1-t)**2
        setting=smooth((phase-275)/10)
        x=455+53*t+14*smooth((phase-260)/15)+212*setting
        y=603-477*rise-5*smooth((phase-260)/15)+484*setting
        layer=sky.copy()
        for i,(sx,sy,r) in enumerate(star_points):
            size=round(6*r)
            dot=star.resize((size,size),Image.Resampling.LANCZOS)
            dot.putalpha(dot.getchannel("A").point(lambda a:round(a*star_strength(seconds,i))))
            layer.alpha_composite(dot,(sx-size//2,sy-size//2))
        if phase < 285:
            layer.alpha_composite(moon,(round(x-110),round(y-110)))
        cover.paste(255,(727,383,783,417),flag.getchannel("A"))
        opacity=ImageChops.multiply(sky_mask,ImageOps.invert(cover))
        layer.putalpha(opacity.point(lambda a:round(a*smooth(night*1.35))))
        scene.alpha_composite(layer)
        strength=smooth((night-.28)/.72)*(1-setting)
        for img,size,pos in [(paving,(941,800),(0,872)),(river_frames[int(seconds*12)%32],(336,112),(368,752))]:
            shine=img.resize(size,Image.Resampling.LANCZOS)
            shine.putalpha(shine.getchannel("A").point(lambda a:round(a*strength)))
            scene.alpha_composite(shine,pos)
        lit=lights.copy()
        lit.putalpha(lights.getchannel("A").point(lambda a:round(a*smooth((night-.18)/.82))))
        scene.alpha_composite(lit)
    return scene

preview(0).convert("RGB").resize((659,1170),Image.Resampling.LANCZOS).save(OUT/"poster.png")
for second, name in [(260,"night"),(250,"moonrise-still"),(281,"moonset-still")]:
    preview(second).convert("RGB").resize((471,836),Image.Resampling.LANCZOS).save(ART/(name+".png"))
# Portable close-up of the 20-second rise, with a pause at full night.
frames=[preview(240+i/8).crop((0,0,941,680)).resize((400,289),Image.Resampling.LANCZOS).convert("RGB") for i in range(161)]
frames[0].save(ART/"moonrise.png",save_all=True,append_images=frames[1:],duration=[125]*160+[1600],loop=0)
