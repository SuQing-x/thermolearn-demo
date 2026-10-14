"""Create original, silent ThermoLearn teaching clips with Pillow + FFmpeg.

Requires Pillow and imageio-ffmpeg. No external media is downloaded or used.
Run with the bundled Python runtime; a local vendor directory is supported.
"""
from pathlib import Path
import json
import math
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent / 'vendor'))
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

OUT = ROOT / 'src' / 'static' / 'media'  # uni-app 约定：页面以 /static/media/... 引用，构建时该目录会被复制到发布目录
OUT.mkdir(parents=True, exist_ok=True)
W, H, FPS, SECONDS = 1280, 720, 24, 16
BG = '#f5f7f4'
INK = '#103c3b'
GREEN = '#15b89a'
MUTED = '#667f7a'
GRID = '#dce7e1'
WHITE = '#ffffff'
ORANGE = '#d88b50'
PALE = '#e3f5ee'
FONT = 'C:/Windows/Fonts/msyh.ttc'
BOLD = 'C:/Windows/Fonts/msyhbd.ttc'
fonts = {}

def font(size=24, bold=False):
    key = (size, bold)
    if key not in fonts:
        fonts[key] = ImageFont.truetype(BOLD if bold else FONT, size)
    return fonts[key]

def txt(d, xy, value, size=24, fill=INK, bold=False, anchor=None):
    d.text(xy, value, font=font(size, bold), fill=fill, anchor=anchor)

def rr(d, box, fill=WHITE, radius=18, outline=None, width=1):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def arrow(d, start, end, fill=GREEN, width=7, head=16):
    d.line([start, end], fill=fill, width=width)
    angle = math.atan2(end[1]-start[1], end[0]-start[0])
    a = (end[0]-head*math.cos(angle-.55), end[1]-head*math.sin(angle-.55))
    b = (end[0]-head*math.cos(angle+.55), end[1]-head*math.sin(angle+.55))
    d.polygon([end, a, b], fill=fill)

def smooth(p):
    p = min(1, max(0, p))
    return p*p*(3-2*p)

def base(index, title, subtitle, sec, condition):
    im = Image.new('RGB', (W,H), BG)
    d = ImageDraw.Draw(im)
    rr(d, (40,33,190,66), INK, 16)
    txt(d, (115,48), 'THERMOLEARN', 16, WHITE, True, 'mm')
    txt(d, (1215,50), f'概念实验  /  0{index}', 18, MUTED, anchor='rm')
    txt(d, (45,91), title, 39, bold=True)
    txt(d, (47,148), subtitle, 21, MUTED)
    rr(d, (40,204,814,575), WHITE, 24)
    rr(d, (837,204,1240,575), INK, 24)
    rr(d, (40,597,1240,665), '#e9eee8', 16)
    txt(d, (59,613), condition, 21, INK)
    txt(d, (45,690), '自制教学演示 · 无声动画', 15, MUTED, anchor='lm')
    txt(d, (1235,690), f'{min(16, int(sec)):02d} / 16 秒', 15, MUTED, anchor='rm')
    d.rounded_rectangle((275,687,1000,693), radius=3, fill=GRID)
    d.rounded_rectangle((275,687,275+725*min(1,sec/SECONDS),693), radius=3, fill=GREEN)
    return im, d

def first_law(sec):
    p=smooth((sec-1)/12)
    im,d=base(1,'热量到哪里去了？','闭口系统第一定律 · 从能量传递看内能变化',sec,
              '适用条件：闭口系统，忽略动能与势能变化。Q 为系统吸热，W 为系统对外做功。')
    piston_y=340-58*p
    d.rectangle((272,piston_y,547,505),fill=PALE)
    d.line([(272,254),(272,506),(547,506),(547,254)],fill=INK,width=6)
    rr(d,(267,piston_y-13,552,piston_y+7),INK,6)
    d.line((410,piston_y-12,410,236),fill=INK,width=10)
    arrow(d,(109,407),(251,407),ORANGE,10,22)
    arrow(d,(573,341),(737,341),GREEN,10,22)
    txt(d,(126,354),'吸热 Q',24,ORANGE,True)
    txt(d,(589,285),'做功 W',24,GREEN,True)
    txt(d,(409,402),'系统内部',25,INK,True,'mm')
    txt(d,(409,444),f'ΔU = {60*p:.0f} kJ',31,INK,True,'mm')
    txt(d,(410,537),'质量不穿过系统边界',20,MUTED,anchor='mm')
    txt(d,(863,232),'能量守恒',21,'#a5d8c9')
    txt(d,(863,280),'ΔU = Q − W',37,WHITE,True)
    txt(d,(864,345),f'Q    {100*p:5.0f} kJ',29,'#f0c29f')
    txt(d,(864,398),f'W   {40*p:5.0f} kJ',29,'#73ddc6')
    d.line((865,450,1206,450),fill='#35615a',width=2)
    txt(d,(864,478),f'ΔU  {60*p:5.0f} kJ',32,WHITE,True)
    txt(d,(863,531),'吸收的热量 = 内能增加 + 对外做功',18,'#b7d1c6')
    return im

def isothermal(sec):
    p=smooth((sec-1)/12)
    vol=1+2*p
    press=300/vol
    im,d=base(2,'体积变大，压力如何变化？','理想气体准静态等温膨胀 · 沿同一条等温线观察状态',sec,
              '适用条件：理想气体、物质的量 n 固定、温度 T 固定、准静态过程；p 为绝对压力。')
    x0,y0,x1,y1=132,503,742,265
    px=lambda v:x0+(v/3.3)*(x1-x0)
    py=lambda pr:y0-(pr/360)*(y0-y1)
    for v in [1,2,3]:
        d.line((px(v),249,px(v),y0), fill=GRID,width=1)
        txt(d,(px(v),524),str(v),18,MUTED,anchor='mm')
    for pr in [100,200,300]:
        d.line((x0,py(pr),x1,py(pr)),fill=GRID,width=1)
        txt(d,(117,py(pr)),str(pr),18,MUTED,anchor='rm')
    arrow(d,(x0,y0),(765,y0),INK,3,13)
    arrow(d,(x0,y0),(x0,238),INK,3,13)
    txt(d,(75,222),'p / kPa',20,INK)
    txt(d,(650,544),'V / m³',20,INK)
    curve=[(px(1+i*2/180),py(300/(1+i*2/180))) for i in range(181)]
    d.line(curve,fill='#c0d8cd',width=5)
    active=[(px(1+i*(vol-1)/max(1,int(p*180))),py(300/(1+i*(vol-1)/max(1,int(p*180))))) for i in range(max(1,int(p*180))+1)]
    if len(active)>1: d.line(active,fill=GREEN,width=7)
    cx,cy=px(vol),py(press)
    d.ellipse((cx-10,cy-10,cx+10,cy+10),fill=GREEN,outline=WHITE,width=3)
    rr(d,(cx-48,cy-52,cx+48,cy-23),INK,10)
    txt(d,(cx,cy-38),'当前状态',15,WHITE,True,'mm')
    txt(d,(435,259),'T = 常数',24,INK,True)
    txt(d,(865,232),'状态方程',21,'#a5d8c9')
    txt(d,(865,279),'pV = nRT',37,WHITE,True)
    txt(d,(865,329),'nRT = 300 kPa·m³',24,'#a5d8c9')
    txt(d,(864,389),f'V = {vol:.2f} m³',30,WHITE,True)
    txt(d,(864,442),f'p = {press:.0f} kPa',30,'#73ddc6',True)
    txt(d,(864,511),'体积增至 3 倍，压力降至 1/3',21,WHITE)
    txt(d,(864,543),'沿曲线变化时，pV 始终保持不变',18,'#b7d1c6')
    return im

def carnot(sec):
    p=smooth((sec-1)/12)
    th=450+450*p
    tc=300
    eta=1-tc/th
    im,d=base(3,'温差如何影响热机效率？','可逆卡诺热机 · 固定冷源温度，逐步提高热源温度',sec,
              '适用条件：两恒温热源之间运行的可逆热机；温度使用 K，且 Th > Tc > 0。')
    rr(d,(99,234,491,296),'#fff0e2',15)
    txt(d,(295,265),f'高温热源  Th = {th:.0f} K',25,INK,True,'mm')
    arrow(d,(295,300),(295,350),ORANGE,8,15)
    txt(d,(325,321),'Qh = 100 kJ',21,ORANGE)
    d.ellipse((235,350,355,463),fill=PALE,outline=GREEN,width=3)
    txt(d,(295,407),'可逆热机',21,INK,True,'mm')
    arrow(d,(357,407),(627,407),GREEN,8,18)
    txt(d,(495,375),f'W = {eta*100:.1f} kJ',24,INK,True,'mm')
    txt(d,(695,407),'输出功',22,GREEN,True,'mm')
    arrow(d,(295,466),(295,508),'#7daaa3',8,15)
    txt(d,(326,480),f'Qc = {(1-eta)*100:.1f} kJ',21,MUTED)
    rr(d,(99,513,491,558),'#e4edf2',12)
    txt(d,(295,536),'低温热源  Tc = 300 K',22,INK,True,'mm')
    txt(d,(864,232),'理论最高效率',21,'#a5d8c9')
    txt(d,(864,280),'η = 1 − Tc / Th',34,WHITE,True)
    txt(d,(865,351),f'{eta*100:.1f}%',66,'#73ddc6',True)
    txt(d,(865,449),'热源温度 Th',21,'#b7d1c6')
    d.rounded_rectangle((870,501,1196,508),radius=3,fill='#35615a')
    sx=870+326*p
    d.rounded_rectangle((870,501,sx,508),radius=3,fill=GREEN)
    d.ellipse((sx-9,496,sx+9,514),fill=WHITE)
    txt(d,(868,530),'450 K',17,'#b7d1c6')
    txt(d,(1199,530),'900 K',17,'#b7d1c6',anchor='rt')
    return im

def main():
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    report=[]
    for name,draw in [('first-law',first_law),('isothermal',isothermal),('carnot',carnot)]:
        target=OUT/f'{name}.mp4'
        cmd=[ffmpeg,'-hide_banner','-loglevel','error','-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',str(target)]
        print(f'Rendering {name} ...',flush=True)
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
        for frame in range(FPS*SECONDS):
            proc.stdin.write(draw(frame/FPS).tobytes())
        proc.stdin.close()
        if proc.wait()!=0: raise RuntimeError(f'FFmpeg failed: {name}')
        draw(13).save(OUT/f'{name}-cover.png')
        check=subprocess.run([ffmpeg,'-v','error','-i',str(target),'-f','null','-'],capture_output=True,text=True)
        if check.returncode or check.stderr: raise RuntimeError(check.stderr)
        reader=imageio_ffmpeg.read_frames(str(target),pix_fmt='rgb24')
        metadata=next(reader)
        first_frame=next(reader)
        reader.close()
        assert len(first_frame)==W*H*3
        assert tuple(metadata['size'])==(W,H)
        assert abs(float(metadata['duration'])-SECONDS)<0.1
        report.append({'name':name,'file':f'/static/media/{name}.mp4','poster':f'/static/media/{name}-cover.png','size_bytes':target.stat().st_size,'duration_seconds':metadata['duration'],'dimensions':metadata['size'],'fps':metadata['fps'],'codec':metadata['codec'],'pixel_format':metadata['pix_fmt'],'full_decode':'passed','audio':False})
        print(json.dumps(report[-1],ensure_ascii=False),flush=True)
    (Path(__file__).parent/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')

if __name__=='__main__': main()
