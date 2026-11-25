"""Bake the projected clay models and the river's moving light into PNG layers."""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'www/assets/reka-clay'
SOURCE = ROOT / 'background-concepts/reka-clay'
RIVER = Image.open(OUT / 'river.png').convert('RGB')
LANCZOS = Image.Resampling.LANCZOS
TAU = 2 * np.pi


def rgba(rgb, alpha):
    return Image.fromarray(np.dstack((rgb, alpha)).clip(0, 255).astype('uint8'))


def clouds():
    source = Image.open(SOURCE / 'clouds-source.png').convert('RGBA')
    w, h = source.size
    atlas = Image.new('RGBA', (4 * 248, 132))
    for i in range(4):
        x, y = i % 2, i // 2
        cell = source.crop((x*w//2, y*h//2, (x+1)*w//2, (y+1)*h//2))
        cell = cell.crop(cell.getchannel('A').point(lambda a: 255 if a > 12 else 0).getbbox())
        cell.thumbnail((244, 128), LANCZOS)
        atlas.paste(cell, (i*248+(248-cell.width)//2, (132-cell.height)//2))
    atlas.save(OUT / 'clouds.png')


def sun():
    # Clip the disk and its halo to the sky where they meet the distant ridge.
    patch = np.asarray(RIVER.crop((532, 178, 736, 366))).astype(float)
    y, x = np.mgrid[:188, :204]
    r = np.hypot(x-102, y-105)
    mask = np.clip((patch[:, :, 0]-patch[:, :, 2]-92)/32, 0, 1)
    disk = np.clip(36.5-r, 0, 1)
    atlas = Image.new('RGB', (408, 188))
    for i, (core, rim) in enumerate([((255,240,171),(255,209,124)), ((255,205,90),(255,137,61))]):
        glow = (0.28 + .15*i)*np.exp(-(r/55)**2)*mask
        mix = np.clip((r/36)**3*.70 + (y-85)/320, 0, 1)[..., None]
        sphere = np.array(core)*(1-mix) + np.array(rim)*mix
        backing = patch + (np.array(rim)-patch)*glow[..., None]
        pixels = backing + (sphere-backing)*(disk*mask)[..., None]
        atlas.paste(Image.fromarray(pixels.astype('uint8')), (i*204, 0))
    atlas.save(OUT / 'sun.png')


def current():
    # Trace the banks of the clean plate in a 366 x 650 reference view.
    left = [(203,156),(192,160),(217,164),(176,169),(175,178),(199,188),
            (206,195),(194,198),(137,204),(122,211),(80,213),(73,234),
            (52,240),(51,254),(22,261),(0,264),(0,337),(25,337),(33,358),
            (54,365),(49,389),(74,393),(69,405),(47,417),(31,452),(56,461),
            (62,484),(91,492),(93,508),(65,523),(76,541),(114,542),(136,574),
            (155,575),(164,592),(146,601),(170,601),(199,601),(186,626),(218,649)]
    right = [(281,156),(261,162),(230,165),(212,172),(210,175),(247,179),
             (294,183),(299,191),(296,198),(281,204),(269,214),(264,226),
             (274,236),(309,245),(341,254),(365,259),(365,410),(350,410),
             (344,438),(327,428),(316,430),(319,459),(307,455),(284,461),
             (289,470),(304,476),(314,497),(292,493),(269,500),(267,512),
             (287,513),(301,522),(307,540),(295,558),(275,566),(253,577),
             (251,598),(269,605),(288,615),(314,626),(348,631),(365,632),(365,649)]
    box = (236, 326)
    mask = Image.new('L', box)
    points = [(x*235/365, (y-153)*325/496) for x, y in left+right[::-1]]
    ImageDraw.Draw(mask).polygon(points, fill=255)
    inset = mask.filter(ImageFilter.MinFilter(5))
    cover = np.asarray(inset.filter(ImageFilter.GaussianBlur(1.2)))/255
    y, x = np.mgrid[:326, :236]
    reference_y = 153+y[:,0]*496/325
    # The hydraulic centerline follows the bends beyond the side of the frame.
    # Foreground reeds and individual rocks occlude water but do not steer it.
    samples = [153,162,173,188,197,222,266,365,465,550,649]
    def channel_profile(values):
        profile = np.interp(reference_y,samples,values)*235/365
        kernel = np.array([1,4,6,4,1])/16
        return np.convolve(np.pad(profile,2,mode='edge'),kernel,mode='valid')[:,None]
    axis = channel_profile([246,224,196,238,243,163,161,179,188,207,242])
    span = channel_profile([29,17,17,44,53,98,181,209,224,239,256])
    across = (x-axis)/span
    depth = y/325
    # Advect small surface slopes along the winding channel. Perspective compresses
    # their spacing upstream, and the water near the banks moves more slowly.
    along = 48*np.log1p(y/31)*(1+.095*np.minimum(1,across**2))
    cross = (x-axis)/(2.7+5.6*depth)
    plate = np.asarray(RIVER.crop((0,393,941,1672)).resize(box,LANCZOS)).astype(float)
    warmth = np.clip((plate[:,:,0]-plate[:,:,2]+42)/130,0,1)
    # The reflection receives the same warm light as the disk. The shore mask
    # and original water color keep this glaze inside the existing sun trail.
    glaze = np.broadcast_to([255,144,69],plate.shape)
    rgba(glaze,98*warmth**2*cover).save(OUT/'reflection.png')
    anchors = [(785,710,89),(840,725,63),(746,731,54),(213,1124,99),(267,1137,67),
               (173,1154,88),(621,1391,121),(690,1413,87),(563,1423,74)]
    lift = [[] for _ in anchors]
    reflection_edge = np.gradient(plate[:,:,0],axis=1)
    atlas = Image.new('P', (8*236,4*326))
    pigments = [(9,98,125),(12,122,143),(71,186,184),(133,207,195),
                (136,124,140),(204,155,140),(255,194,137),(255,225,170)]
    palette = [channel for color in pigments for _ in range(32) for channel in color]
    atlas.putpalette(palette)
    for i in range(32):
        t = TAU*i/32
        belt = np.sin(.48*cross + .18*along-t)
        twist = .78*np.sin(.74*cross-.18*along+t)+.60*np.cos(.36*cross+.30*along-t)
        swells = np.sin(.86*along+.33*cross+twist-2*t)
        for samples_at_leaf,(cx,cy,_) in zip(lift,anchors):
            row = round((cy-393)*326/1279-.5)
            col = round(cx*236/941-.5)
            samples_at_leaf.append(round(100*swells[row,col]))
        ripples = np.sin(1.72*along-.87*cross+.86*belt-3*t)
        chop = np.sin(2.53*along+1.31*cross+twist-4*t)
        slope = .49*swells+.33*ripples+.18*chop
        # Break the reflection into warm flecks at its actual edges. In the teal
        # channel use mostly midtones, with occasional short catchlights.
        refracted = np.clip(reflection_edge*(swells+ripples)*.065,-.42,.42)
        sheen = slope+refracted*warmth
        packet = .42+.58*(.5+.5*np.cos(.52*cross-.23*along+t))**2
        energy = (26+47*np.abs(sheen))*np.abs(sheen)*packet
        zone = np.where(sheen<-.46,0,np.where(sheen<0,1,np.where(sheen<.72,2,3)))
        zone += 4*(warmth>.32)
        alpha = cover*(.77+.23*depth)*energy*(1+.45*warmth)
        indices = np.rint(alpha/3).clip(0,31).astype(int)+32*zone
        atlas.paste(Image.frombytes('P',box,indices.astype('uint8').tobytes()), (i%8*236, i//8*326))
    atlas.save(OUT/'current.png',transparency=bytes(list(range(0,96,3))*8))
    tracks = [[*anchor,values] for anchor,values in zip(anchors,lift)]
    js = '// Generated by scripts/render-reka-clay.py from the local river swells.\n'
    js += 'window.RekaLilyTracks = [\n    '+',\n    '.join(map(json.dumps,tracks))+'\n];\n'
    (ROOT/'www/reka-lily-tracks.js').write_text(js,encoding='utf-8')


def lily(index):
    # Project the water plane once. Different leaf headings rotate in that
    # plane, so even a sideways-facing notch keeps the same waterline.
    group = index//3
    elevation = [.24, .33, .40][group]
    up = np.sqrt(1-elevation**2)
    y, x = np.mgrid[:192,:288]
    dx, dy = x-144, y-106
    heading = [.42,2.70,1.30, 2.34,-.30,1.12, -.47,2.10,1.48][index]
    c,s = np.cos(heading),np.sin(heading)
    u = (c*dx+s*dy/elevation)/113
    v = (-s*dx+c*dy/elevation)/102
    a = np.arctan2(v,u)
    r = np.hypot(u,v)
    # Rounded lobes close around the radial slit. Highlights follow the sun
    # above the distant bank, while the near lip casts a narrow contact shadow.
    edge = 1+.035*np.sin(3*a+.6*index)+.018*np.cos(7*a)-.19*np.exp(-(a/.30)**2)
    inside = (r<edge) & ((np.abs(a)>.09+.13*r) | (r<.065))
    veins = np.sin(7*a+.48*r+.14*np.sin(3*a))
    ribs = np.exp(-veins**2*22)*np.clip(r*3,0,1)*(1-.55*r)
    rim = np.exp(-((edge-r)/.053)**2)
    normal_light = (-.27*dx/113-.74*dy/(102*elevation))
    mottling = np.sin(4*u+1.6*v)*np.cos(3.7*v-.7*u)
    tone = .98+.075*normal_light+.035*mottling+.09*rim-.10*ribs
    pigment = np.array([(114,155,83),(121,161,83),(94,147,90)][index%3])
    rgb = tone[...,None]*pigment
    rgb += np.maximum(0,normal_light)[...,None]*rim[...,None]*[20,16,2]
    opacity = Image.fromarray((255*inside).astype('uint8'))
    layer = Image.new('RGBA',(288,192))
    # A meniscus touches the edge, with a darker submerged rim directly beneath.
    shadow = opacity.filter(ImageFilter.GaussianBlur(2.4)).point(lambda p:round(p*.38))
    layer.paste((23,81,81,255),(1,3,289,195),shadow)
    layer.paste((79,112,66,255),(0,2,288,194),opacity)
    layer.alpha_composite(rgba(rgb,inside*255))
    if index in (0,5,6):
        # Curved petal meshes share a depth buffer, including the raised center.
        # Their stems meet the leaf; only the blossom projects above the surface.
        zbuffer = np.full(y.shape,-np.inf)
        pixels = np.zeros((*y.shape,4),dtype='uint8')
        def petal_part(center,axes,pigment):
            # Axes in world space: x across water, y downstream, z upwards.
            inv = np.linalg.inv(axes).T
            right = np.array([1,0,0])
            down = np.array([0,elevation,-up])
            eye = np.array([0,up,elevation])
            origin = (dx+9)[...,None]*right + (dy+2)[...,None]*down
            local = (origin-center) @ inv
            ray = eye @ inv
            b = local @ ray
            disc = b*b-(ray@ray)*((local*local).sum(2)-1)
            distance = (-b+np.sqrt(np.maximum(0,disc)))/(ray@ray)
            hit = (disc>0)&(distance>zbuffer)
            normals = (local[hit]+distance[hit,None]*ray) @ inv.T
            normals /= np.linalg.norm(normals,axis=1)[:,None]
            light = .78+.26*np.maximum(0,normals @ [.38,-.45,.81])+.07*np.maximum(0,normals @ eye)
            pixels[hit,:3] = np.clip(np.array(pigment)*light[:,None],0,255)
            pixels[hit,3] = 255
            zbuffer[hit] = distance[hit]
        for count,reach,rise,width,pigment in [(9,30,13,10,(220,144,158)),
                                                 (7,20,19,9,(248,183,173))]:
            for j in range(count):
                phi = TAU*j/count+.32*group+.21*rise
                axis = np.array([reach*np.cos(phi),reach*np.sin(phi),rise])
                side = np.array([-np.sin(phi),np.cos(phi),0])
                normal = np.cross(axis/np.linalg.norm(axis),side)
                axes = np.column_stack((axis*.61,side*width,normal*4.3))
                petal_part(axis*.51+[0,0,3],axes,pigment)
        petal_part([0,0,14],np.diag([8,8,5]),(243,191,80))
        layer.alpha_composite(Image.fromarray(pixels))
    return layer.resize((144,96),LANCZOS)


def fish(frame):
    # Side-on orthographic camera. Z is depth toward the viewer, Y is up.
    y,x = np.mgrid[:152,:240]
    origin = np.stack(((x-120)/83,(77-y)/83,np.zeros_like(x)), axis=-1)
    depth = np.full(x.shape,-np.inf)
    result = np.zeros((*x.shape,4), dtype='uint8')
    wag = np.sin(TAU*frame/32)

    def part(center, radii, color, tilt=0, yaw=0, body=False):
        c,s = np.cos(tilt),np.sin(tilt)
        a,b = np.cos(yaw),np.sin(yaw)
        rotate = np.array([[a*c,-a*s,b],[s,c,0],[-b*c,b*s,a]])
        inv = rotate @ np.diag(1/np.array(radii))
        local = (origin-center) @ inv
        ray = inv[2]
        p = local @ ray
        q = ray @ ray
        disc = p*p - q*((local*local).sum(2)-1)
        z = (-p+np.sqrt(np.maximum(0,disc)))/q
        hit = (disc>0) & (z>depth)
        surface = local[hit] + z[hit,None]*ray
        normal = surface @ inv.T
        normal /= np.linalg.norm(normal,axis=1)[:,None]
        color = np.broadcast_to(np.array(color,dtype=float),(len(normal),3)).copy()
        if body:
            belly = np.clip((.34-surface[:,1])*1.08,0,1)
            color += belly[:,None]*[109,51,-1]
            gill = np.exp(-((surface[:,0]-.53-.11*surface[:,1]**2)/.035)**2)
            color *= 1-.13*gill[:,None]
            for sx,sy in [(-.59,.28),(-.42,.48),(-.31,.19),(-.15,.42),(.06,.30),(.23,.48)]:
                spot = np.exp(-((surface[:,0]-sx)/.043)**2-((surface[:,1]-sy)/.076)**2)
                color *= 1-.34*spot[:,None]
        light = .76+.30*np.maximum(0,normal @ [.40,.72,.57])
        result[hit,:3] = np.clip(color*light[:,None],0,255)
        result[hit,3] = 255
        depth[hit] = z[hit]

    for side in (1,-1):
        part((-.87+.085*wag**2,side*.15,.27*wag),(.33,.105,.079),(211,132,70),-side*.62,.55*wag)
    part((-.63,0,.12*wag),(.31,.13,.14),(100,151,126),yaw=.36*wag)
    part((-.13,.29,-.02),(.28,.115,.06),(207,145,76),-.19)
    part((-.06,-.27,.02),(.20,.075,.05),(220,148,79),.38)
    part((.085,0,0),(.79,.335,.27),(68,143,135),body=True)
    part((.15,-.13,.23),(.22,.083,.058),(210,148,86),.49+.06*wag)
    part((.605,.102,.192),(.098,.104,.051),(242,209,137))
    part((.62,.106,.23),(.061,.069,.032),(45,58,61))
    part((.644,.13,.254),(.020,.020,.012),(253,239,202))
    return Image.fromarray(result).resize((120,76),LANCZOS)


def splash():
    atlas = Image.new('RGBA',(160*8,84*4))
    for i in range(32):
        t = i/31
        tile = Image.new('RGBA',(320,168))
        draw = ImageDraw.Draw(tile)
        for offset in (0,.2):
            age = (t-offset)/(1-offset)
            if age < 0:
                continue
            r = 12+134*age**.72
            h = r*.18
            draw.ellipse((160-r,111-h,160+r,111+h), outline=(177,225,214,int(163*(1-age))), width=3)
        for j in range(7):
            age = min(1,t*2.2)
            a = j*2.4
            cx = 160+np.cos(a)*(13+72*age)
            cy = 110+np.sin(a)*10*age-(43+18*(j%3))*4*age*(1-age)
            r = (3+j%3)*(1-age)
            draw.ellipse((cx-r,cy-r*1.3,cx+r,cy+r*1.3), fill=(202,231,215,int(215*(1-age))))
        atlas.paste(tile.resize((160,84),LANCZOS),(i%8*160,i//8*84))
    atlas.save(OUT/'splash.png')


if __name__ == '__main__':
    clouds()
    sun()
    current()
    splash()
    leaves = Image.new('RGBA',(432,288))
    for i in range(9):
        leaves.paste(lily(i),(144*(i%3),96*(i//3)))
    leaves.save(OUT/'lilies.png')
    poses = Image.new('RGBA',(8*120,4*76))
    for i in range(32):
        poses.paste(fish(i),(120*(i%8),76*(i//8)))
    poses.save(OUT/'fish.png')
